import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { Db } from "./db/index.ts";
import * as schema from "./db/schema.ts";

const { applications, jobs, users } = schema;

let db: Db;
let app: ReturnType<typeof createApp>;
let recruiterCookie: string;
let candidateCookie: string;
let candidateId: string;
let holdCounter: number;
const payments = {
  createOrder: vi.fn(),
  captureOrder: vi.fn(),
  authorizeOrder: vi.fn(),
  voidAuthorization: vi.fn(),
  sendPayout: vi.fn(),
  getPayoutStatus: vi.fn(),
};

async function login(role: "CANDIDATE" | "RECRUITER", email: string) {
  const [user] = await db.insert(users).values({ role, email }).returning();
  return { id: user.id, cookie: `session=${encodeURIComponent(app.signCookie(user.id))}` };
}

function post(url: string, cookie: string | undefined, payload?: object) {
  return app.inject({
    method: "POST",
    url,
    headers: cookie ? { cookie } : {},
    ...(payload ? { payload } : {}),
  });
}

async function fundedJob(applicantCap = 10): Promise<string> {
  const created = await post("/api/jobs", recruiterCookie, {
    title: "Senior Backend Engineer",
    requirementsText: "Go, Postgres, Kubernetes",
    applicantCap,
  });
  const { jobId } = created.json();
  await post(`/api/jobs/${jobId}/fund`, recruiterCookie);
  return jobId;
}

const applyBody = { orderId: "ORDER-HOLD", resumeText: "Six years of Go" };

beforeEach(async () => {
  const client = new PGlite();
  const database = drizzle(client, { schema, casing: "snake_case" });
  await migrate(database, { migrationsFolder: "./drizzle" });
  db = database as unknown as Db;

  holdCounter = 0;
  vi.resetAllMocks();
  payments.createOrder.mockResolvedValue("ORDER-1");
  payments.captureOrder.mockResolvedValue({ captureId: "CAPTURE-1", status: "COMPLETED" });
  payments.authorizeOrder.mockImplementation(async () => {
    holdCounter += 1;
    return { authorizationId: `AUTH-${holdCounter}`, value: "2.00" };
  });

  app = createApp({ db, payments, sessionSecret: "test-secret", demoModeEnabled: false });
  await app.ready();

  recruiterCookie = (await login("RECRUITER", "hr@example.com")).cookie;
  const candidate = await login("CANDIDATE", "candidate@example.com");
  candidateCookie = candidate.cookie;
  candidateId = candidate.id;
});

describe("sessions", () => {
  it("rejects a missing cookie and a forged one", async () => {
    const body = { title: "Role", requirementsText: "Go", applicantCap: 1 };
    expect((await post("/api/jobs", undefined, body)).statusCode).toBe(401);
    expect((await post("/api/jobs", `session=${candidateId}`, body)).statusCode).toBe(401);
  });

  it("stops candidates creating roles and recruiters applying", async () => {
    const body = { title: "Role", requirementsText: "Go", applicantCap: 1 };
    expect((await post("/api/jobs", candidateCookie, body)).statusCode).toBe(403);
    const jobId = await fundedJob();
    const response = await post(`/api/jobs/${jobId}/applications/order`, recruiterCookie);
    expect(response.statusCode).toBe(403);
  });
});

describe("funding a role", () => {
  it("charges the listing fee plus the bond and starts as a draft", async () => {
    const response = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 10,
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().total).toBe("99.00");
    expect(payments.createOrder).toHaveBeenCalledWith("CAPTURE", "99.00");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, response.json().jobId));
    expect(job.status).toBe("DRAFT");
    expect(job.bondTotal).toBe("50.00");
  });

  it("opens the role after capture, and a retry doesn't capture again", async () => {
    const jobId = await fundedJob();
    const retry = await post(`/api/jobs/${jobId}/fund`, recruiterCookie);
    expect(retry.json().status).toBe("OPEN");
    expect(payments.captureOrder).toHaveBeenCalledTimes(1);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.bondCaptureId).toBe("CAPTURE-1");
  });

  it("keeps the role closed if the capture isn't completed", async () => {
    payments.captureOrder.mockResolvedValue({ captureId: "C", status: "PENDING" });
    const jobId = await fundedJob();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.status).toBe("DRAFT");
  });

  it("doesn't let another recruiter fund the role", async () => {
    const created = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 1,
    });
    const other = await login("RECRUITER", "other-hr@example.com");
    const response = await post(`/api/jobs/${created.json().jobId}/fund`, other.cookie);
    expect(response.statusCode).toBe(404);
    expect(payments.captureOrder).not.toHaveBeenCalled();
  });
});

describe("applying", () => {
  it("creates a $2 hold order, then an application using a slot", async () => {
    const jobId = await fundedJob();
    const order = await post(`/api/jobs/${jobId}/applications/order`, candidateCookie);
    expect(order.statusCode).toBe(201);
    expect(payments.createOrder).toHaveBeenLastCalledWith("AUTHORIZE", "2.00");

    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(201);
    expect(response.json().paypalAuthId).toBe("AUTH-1");

    const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
    expect(candidate.availableSlots).toBe(4);
  });

  it("refuses an order for a draft role before asking for a hold", async () => {
    const created = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 1,
    });
    payments.createOrder.mockClear();
    const response = await post(`/api/jobs/${created.json().jobId}/applications/order`, candidateCookie);
    expect(response.statusCode).toBe(409);
    expect(payments.createOrder).not.toHaveBeenCalled();
  });

  it("voids the hold if the role filled up after approval", async () => {
    const jobId = await fundedJob(1);
    const other = await login("CANDIDATE", "other@example.com");
    await post(`/api/jobs/${jobId}/applications`, other.cookie, applyBody);

    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).toHaveBeenCalledWith("AUTH-2");
  });

  it("voids the hold if the amount is wrong", async () => {
    const jobId = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-X", value: "0.01" });
    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).toHaveBeenCalledWith("AUTH-X");
    expect(await db.select().from(applications)).toHaveLength(0);
  });

  it("returns the same application on a retry, without voiding its hold", async () => {
    const jobId = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-SAME", value: "2.00" });
    const first = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    const retry = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);

    expect(retry.json().id).toBe(first.json().id);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
    const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
    expect(candidate.availableSlots).toBe(4);
  });

  it("refuses to reuse a hold on another role, without voiding it", async () => {
    const firstJob = await fundedJob();
    const secondJob = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-SAME", value: "2.00" });
    await post(`/api/jobs/${firstJob}/applications`, candidateCookie, applyBody);

    const response = await post(`/api/jobs/${secondJob}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
  });

  it("refuses Demo Mode when it's turned off", async () => {
    const jobId = await fundedJob();
    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, {
      ...applyBody,
      demoMode: true,
    });
    expect(response.statusCode).toBe(403);
    expect(payments.authorizeOrder).not.toHaveBeenCalled();
  });
});
