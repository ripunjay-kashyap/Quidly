import { and, count, eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "./db/index.ts";
import { applications, jobs, users } from "./db/schema.ts";

const RESPONSE_WINDOW_MS = 72 * 60 * 60 * 1000;
const DEMO_RESPONSE_WINDOW_MS = 90 * 1000;
const BOND_PER_APPLICANT_CENTS = 500;

export class ConflictError extends Error {}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function freeSlot(tx: Tx, candidateId: string): Promise<void> {
  await tx
    .update(users)
    .set({ availableSlots: sql`${users.availableSlots} + 1` })
    .where(eq(users.id, candidateId));
}

// Refuses early, before the candidate is asked to approve a hold.
export async function assertCanApply(db: Db, jobId: string, candidateId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (job?.status !== "OPEN") throw new ConflictError("This role is not open");

  const [applicants] = await db
    .select({ total: count() })
    .from(applications)
    .where(eq(applications.jobId, jobId));
  if (applicants.total >= job.applicantCap) throw new ConflictError("This role is full");

  const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
  if (!candidate || candidate.availableSlots < 1) {
    throw new ConflictError("No application slots available");
  }

  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.jobId, jobId), eq(applications.candidateId, candidateId)));
  if (existing) throw new ConflictError("You have already applied to this role");
}

// The hold is placed before this runs, so the caller must void it if this throws.
export async function createApplication(
  db: Db,
  input: {
    jobId: string;
    candidateId: string;
    resumeText: string;
    paypalAuthId: string;
    demoMode: boolean;
    now: Date;
  },
) {
  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, input.jobId)).for("update");
    if (job?.status !== "OPEN") throw new ConflictError("This role is not open");

    const [applicants] = await tx
      .select({ total: count() })
      .from(applications)
      .where(eq(applications.jobId, input.jobId));
    if (applicants.total >= job.applicantCap) throw new ConflictError("This role is full");

    const slotTaken = await tx
      .update(users)
      .set({ availableSlots: sql`${users.availableSlots} - 1` })
      .where(and(eq(users.id, input.candidateId), gte(users.availableSlots, 1)))
      .returning({ id: users.id });
    if (slotTaken.length === 0) throw new ConflictError("No application slots available");

    const windowMs = input.demoMode ? DEMO_RESPONSE_WINDOW_MS : RESPONSE_WINDOW_MS;
    const [application] = await tx
      .insert(applications)
      .values({
        jobId: input.jobId,
        candidateId: input.candidateId,
        resumeText: input.resumeText,
        paypalAuthId: input.paypalAuthId,
        createdAt: input.now,
        expiresAt: new Date(input.now.getTime() + windowMs),
      })
      .returning();
    return application;
  });
}

// Callers run the Elastic checks first. The poller voids the hold afterwards.
export async function rejectApplication(
  db: Db,
  input: {
    id: string;
    unmetRequirement: string;
    feedback: string;
    qualityScore: number;
    now: Date;
  },
) {
  return db.transaction(async (tx) => {
    const [application] = await tx
      .update(applications)
      .set({
        status: "REJECTED_RELEASED",
        unmetRequirement: input.unmetRequirement,
        recruiterFeedback: input.feedback,
        elasticQualityScore: input.qualityScore,
      })
      .where(
        and(
          eq(applications.id, input.id),
          eq(applications.status, "ACTIVE"),
          gt(applications.expiresAt, input.now),
        ),
      )
      .returning();
    if (!application) throw new ConflictError("This application can no longer be rejected");

    await freeSlot(tx, application.candidateId);
    return application;
  });
}

export async function inviteToInterview(
  db: Db,
  input: { id: string; interviewAt: Date; now: Date },
) {
  const [application] = await db
    .update(applications)
    .set({ status: "INTERVIEW_PENDING", interviewAt: input.interviewAt })
    .where(
      and(
        eq(applications.id, input.id),
        eq(applications.status, "ACTIVE"),
        gt(applications.expiresAt, input.now),
      ),
    )
    .returning();
  if (!application) throw new ConflictError("This application can no longer be invited");
  return application;
}

export async function resolveInterview(db: Db, input: { id: string; genuine: boolean }) {
  return db.transaction(async (tx) => {
    const [application] = await tx
      .update(applications)
      .set({ status: input.genuine ? "INTERVIEW_CONFIRMED" : "DISPUTED" })
      .where(and(eq(applications.id, input.id), eq(applications.status, "INTERVIEW_PENDING")))
      .returning();
    if (!application) throw new ConflictError("This application has no pending interview");

    if (input.genuine) await freeSlot(tx, application.candidateId);
    return application;
  });
}

const cents = (value: string) => Math.round(Number(value) * 100);

// Closes the role in a transaction that locks it, so no application can arrive
// while it closes. The caller refunds afterwards, and can retry a failed refund.
export async function closeJob(db: Db, input: { jobId: string; recruiterId: string }) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, input.jobId), eq(jobs.recruiterId, input.recruiterId)))
      .for("update");
    if (!job) return undefined;
    if (job.status === "DRAFT") throw new ConflictError("This role was never funded");

    const [unresolved] = await tx
      .select({ total: count() })
      .from(applications)
      .where(and(eq(applications.jobId, job.id), inArray(applications.status, ["ACTIVE", "INTERVIEW_PENDING"])));
    if (unresolved.total > 0) {
      throw new ConflictError("Respond to every application before closing this role");
    }

    // A disputed application keeps its $5 locked, so it isn't refunded.
    const [disputed] = await tx
      .select({ total: count() })
      .from(applications)
      .where(and(eq(applications.jobId, job.id), eq(applications.status, "DISPUTED")));

    const [closed] = await tx.update(jobs).set({ status: "CLOSED" }).where(eq(jobs.id, job.id)).returning();
    const refundCents =
      cents(closed.bondTotal) - cents(closed.bondForfeited) - disputed.total * BOND_PER_APPLICANT_CENTS;
    return { job: closed, refund: (Math.max(0, refundCents) / 100).toFixed(2) };
  });
}
