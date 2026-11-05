import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  createApplication,
  inviteToInterview,
  rejectApplication,
  resolveInterview,
} from "./applications.ts";
import type { Db } from "./db/index.ts";
import * as schema from "./db/schema.ts";
import { type PaymentGateway, runPollerTick } from "./poller.ts";

const { applications, jobs, users } = schema;

const START = new Date("2026-11-05T12:00:00Z");
const BEFORE_DEADLINE = new Date(START.getTime() + 60 * 60 * 1000);
const AFTER_DEADLINE = new Date(START.getTime() + 73 * 60 * 60 * 1000);

let db: Db;
let jobId: string;
let candidateId: string;
let payments: { [K in keyof PaymentGateway]: ReturnType<typeof vi.fn> } & PaymentGateway;

async function addCandidate(email: string): Promise<string> {
  const [candidate] = await db.insert(users).values({ role: "CANDIDATE", email }).returning();
  return candidate.id;
}

function apply(overrides: { candidateId?: string; authId?: string; demoMode?: boolean } = {}) {
  return createApplication(db, {
    jobId,
    candidateId: overrides.candidateId ?? candidateId,
    resumeText: "Six years of Go and Postgres",
    paypalAuthId: overrides.authId ?? "AUTH-1",
    demoMode: overrides.demoMode ?? false,
    now: START,
  });
}

function reject(id: string, now: Date) {
  return rejectApplication(db, {
    id,
    unmetRequirement: "Kubernetes experience",
    feedback: "The role needs production Kubernetes experience, which your resume doesn't show.",
    qualityScore: 0.9,
    now,
  });
}

async function slots(id = candidateId): Promise<number> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user.availableSlots;
}

async function read(id: string) {
  const [application] = await db.select().from(applications).where(eq(applications.id, id));
  return application;
}

beforeEach(async () => {
  const client = new PGlite();
  const database = drizzle(client, { schema, casing: "snake_case" });
  await migrate(database, { migrationsFolder: "./drizzle" });
  db = database as unknown as Db;

  const [recruiter] = await db
    .insert(users)
    .values({ role: "RECRUITER", email: "hr@example.com" })
    .returning();
  const [job] = await db
    .insert(jobs)
    .values({
      recruiterId: recruiter.id,
      title: "Senior Backend Engineer",
      requirementsText: "Go, Postgres, Kubernetes",
      applicantCap: 10,
      bondTotal: "50.00",
      status: "OPEN",
    })
    .returning();
  jobId = job.id;
  candidateId = await addCandidate("candidate@example.com");

  payments = {
    voidAuthorization: vi.fn(async () => {}),
    sendPayout: vi.fn(async () => "BATCH-1"),
    getPayoutStatus: vi.fn(async () => "SUCCESS" as const),
  };
});

describe("applying", () => {
  it("uses a slot and sets a 72-hour deadline", async () => {
    const application = await apply();
    expect(await slots()).toBe(4);
    expect(application.expiresAt.getTime() - START.getTime()).toBe(72 * 60 * 60 * 1000);
  });

  it("uses a 90-second deadline in Demo Mode", async () => {
    const application = await apply({ demoMode: true });
    expect(application.expiresAt.getTime() - START.getTime()).toBe(90 * 1000);
  });

  it("refuses an application when no slots remain", async () => {
    await db.update(users).set({ availableSlots: 0 }).where(eq(users.id, candidateId));
    await expect(apply()).rejects.toThrow(ConflictError);
    expect(await slots()).toBe(0);
  });

  it("refuses an application when the role is full, without using a slot", async () => {
    await db.update(jobs).set({ applicantCap: 1 }).where(eq(jobs.id, jobId));
    await apply();
    const other = await addCandidate("other@example.com");
    await expect(apply({ candidateId: other })).rejects.toThrow(ConflictError);
    expect(await slots(other)).toBe(5);
  });
});

describe("ghosting", () => {
  it("does nothing before the deadline", async () => {
    const { id } = await apply();
    await runPollerTick(db, payments, BEFORE_DEADLINE);
    expect((await read(id)).status).toBe("ACTIVE");
    expect(payments.sendPayout).not.toHaveBeenCalled();
  });

  it("voids the hold, frees the slot and pays $5 exactly once across repeated ticks", async () => {
    const { id } = await apply();
    await runPollerTick(db, payments, AFTER_DEADLINE);
    await runPollerTick(db, payments, AFTER_DEADLINE);
    await runPollerTick(db, payments, AFTER_DEADLINE);

    expect(payments.sendPayout).toHaveBeenCalledTimes(1);
    expect(payments.sendPayout).toHaveBeenCalledWith({
      senderBatchId: `quidly-application-${id}`,
      receiver: "candidate@example.com",
      value: "5.00",
    });
    expect(payments.voidAuthorization).toHaveBeenCalledTimes(1);
    expect(await slots()).toBe(5);

    const application = await read(id);
    expect(application.status).toBe("GHOSTED_PAID_OUT");
    expect(application.payoutStatus).toBe("SUCCESS");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.bondForfeited).toBe("5.00");
  });

  it("retries a failed payout with the same batch ID", async () => {
    const { id } = await apply();
    payments.sendPayout.mockRejectedValueOnce(new Error("network"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).payoutStatus).toBe("QUEUED");

    await runPollerTick(db, payments, AFTER_DEADLINE);
    const batchIds = payments.sendPayout.mock.calls.map(([input]) => input.senderBatchId);
    expect(batchIds).toEqual([`quidly-application-${id}`, `quidly-application-${id}`]);
    expect((await read(id)).payoutStatus).toBe("SUCCESS");
    expect(await slots()).toBe(5);
    logged.mockRestore();
  });

  it("retries a failed void without charging the penalty twice", async () => {
    const { id } = await apply();
    payments.voidAuthorization.mockRejectedValueOnce(new Error("network"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).holdVoidedAt).toBeNull();

    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).holdVoidedAt).not.toBeNull();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.bondForfeited).toBe("5.00");
    logged.mockRestore();
  });

  it("leaves a failed payout visible and doesn't resend it", async () => {
    const { id } = await apply();
    payments.getPayoutStatus.mockResolvedValue("FAILED");
    await runPollerTick(db, payments, AFTER_DEADLINE);
    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).payoutStatus).toBe("FAILED");
    expect(payments.sendPayout).toHaveBeenCalledTimes(1);
  });
});

describe("rejecting", () => {
  it("frees the slot, voids the hold and never pays out", async () => {
    const { id } = await apply();
    await reject(id, BEFORE_DEADLINE);
    expect(await slots()).toBe(5);

    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).status).toBe("REJECTED_RELEASED");
    expect(payments.voidAuthorization).toHaveBeenCalledWith("AUTH-1");
    expect(payments.sendPayout).not.toHaveBeenCalled();
  });

  it("refuses a rejection after the deadline, even before the poller has run", async () => {
    const { id } = await apply();
    await expect(reject(id, AFTER_DEADLINE)).rejects.toThrow(ConflictError);

    await runPollerTick(db, payments, AFTER_DEADLINE);
    expect((await read(id)).status).toBe("GHOSTED_PAID_OUT");
    expect(payments.sendPayout).toHaveBeenCalledTimes(1);
    expect(await slots()).toBe(5);
  });

  it("refuses a second rejection without freeing another slot", async () => {
    const { id } = await apply();
    await reject(id, BEFORE_DEADLINE);
    await expect(reject(id, BEFORE_DEADLINE)).rejects.toThrow(ConflictError);
    expect(await slots()).toBe(5);
  });
});

describe("interview invites", () => {
  const invite = (id: string, now = BEFORE_DEADLINE) =>
    inviteToInterview(db, { id, interviewAt: AFTER_DEADLINE, now });

  it("keeps the hold and slot, and stops the ghosting timer", async () => {
    const { id } = await apply();
    await invite(id);
    await runPollerTick(db, payments, AFTER_DEADLINE);

    expect((await read(id)).status).toBe("INTERVIEW_PENDING");
    expect(await slots()).toBe(4);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
    expect(payments.sendPayout).not.toHaveBeenCalled();
  });

  it("refuses an invite after the deadline", async () => {
    const { id } = await apply();
    await expect(invite(id, AFTER_DEADLINE)).rejects.toThrow(ConflictError);
  });

  it("voids the hold and frees the slot once the candidate confirms", async () => {
    const { id } = await apply();
    await invite(id);
    await resolveInterview(db, { id, genuine: true });
    await runPollerTick(db, payments, AFTER_DEADLINE);

    expect((await read(id)).status).toBe("INTERVIEW_CONFIRMED");
    expect(await slots()).toBe(5);
    expect(payments.voidAuthorization).toHaveBeenCalledTimes(1);
    expect(payments.sendPayout).not.toHaveBeenCalled();
  });

  it("moves no money when the candidate reports the invite", async () => {
    const { id } = await apply();
    await invite(id);
    await resolveInterview(db, { id, genuine: false });
    await runPollerTick(db, payments, AFTER_DEADLINE);

    expect((await read(id)).status).toBe("DISPUTED");
    expect(await slots()).toBe(4);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
    expect(payments.sendPayout).not.toHaveBeenCalled();
  });
});
