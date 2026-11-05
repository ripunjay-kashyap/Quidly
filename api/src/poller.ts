import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { freeSlot } from "./applications.ts";
import type { Db } from "./db/index.ts";
import { applications, jobs, users } from "./db/schema.ts";

const GHOSTING_PENALTY = "5.00";

export interface PaymentGateway {
  voidAuthorization(authorizationId: string): Promise<void>;
  // Must be safe to retry with the same senderBatchId.
  sendPayout(input: { senderBatchId: string; receiver: string; value: string }): Promise<string>;
  getPayoutStatus(batchId: string): Promise<"PENDING" | "SUCCESS" | "FAILED">;
}

// Commits the ghosting outcome first. The conditional update means only one
// caller can claim an application, and a rejection can't resolve it as well.
async function claimExpired(db: Db, now: Date): Promise<void> {
  await db.transaction(async (tx) => {
    const expired = await tx
      .update(applications)
      .set({ status: "GHOSTED_PAID_OUT", payoutStatus: "QUEUED" })
      .where(and(eq(applications.status, "ACTIVE"), lte(applications.expiresAt, now)))
      .returning();

    for (const application of expired) {
      await freeSlot(tx, application.candidateId);
      await tx
        .update(jobs)
        .set({ bondForfeited: sql`${jobs.bondForfeited} + ${GHOSTING_PENALTY}` })
        .where(eq(jobs.id, application.jobId));
    }
  });
}

async function voidReleasedHolds(db: Db, payments: PaymentGateway, now: Date): Promise<void> {
  const pending = await db
    .select()
    .from(applications)
    .where(
      and(
        isNull(applications.holdVoidedAt),
        inArray(applications.status, ["REJECTED_RELEASED", "INTERVIEW_CONFIRMED", "GHOSTED_PAID_OUT"]),
      ),
    );

  for (const application of pending) {
    try {
      await payments.voidAuthorization(application.paypalAuthId);
      await db
        .update(applications)
        .set({ holdVoidedAt: now })
        .where(eq(applications.id, application.id));
    } catch (error) {
      console.error(`Void failed for application ${application.id}; will retry`, error);
    }
  }
}

async function sendQueuedPayouts(db: Db, payments: PaymentGateway): Promise<void> {
  const queued = await db
    .select({ id: applications.id, receiver: users.email })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.candidateId))
    .where(eq(applications.payoutStatus, "QUEUED"));

  for (const { id, receiver } of queued) {
    try {
      const batchId = await payments.sendPayout({
        senderBatchId: `quidly-application-${id}`,
        receiver,
        value: GHOSTING_PENALTY,
      });
      await db
        .update(applications)
        .set({ payoutBatchId: batchId, payoutStatus: "PENDING" })
        .where(eq(applications.id, id));
    } catch (error) {
      console.error(`Payout failed for application ${id}; will retry`, error);
    }
  }
}

async function refreshPayoutStatuses(db: Db, payments: PaymentGateway): Promise<void> {
  const pending = await db
    .select({ id: applications.id, batchId: applications.payoutBatchId })
    .from(applications)
    .where(eq(applications.payoutStatus, "PENDING"));

  for (const { id, batchId } of pending) {
    try {
      const status = await payments.getPayoutStatus(batchId!);
      if (status !== "PENDING") {
        await db.update(applications).set({ payoutStatus: status }).where(eq(applications.id, id));
      }
    } catch (error) {
      console.error(`Payout status check failed for application ${id}; will retry`, error);
    }
  }
}

export async function runPollerTick(db: Db, payments: PaymentGateway, now: Date): Promise<void> {
  await claimExpired(db, now);
  await voidReleasedHolds(db, payments, now);
  await sendQueuedPayouts(db, payments);
  await refreshPayoutStatuses(db, payments);
}

// Schedules the next tick only after the last one finishes, so ticks can't overlap.
export function startPoller(db: Db, payments: PaymentGateway, intervalMs: number): void {
  const tick = async () => {
    try {
      await runPollerTick(db, payments, new Date());
    } catch (error) {
      console.error("Poller tick failed; will retry", error);
    }
    setTimeout(tick, intervalMs);
  };
  void tick();
}
