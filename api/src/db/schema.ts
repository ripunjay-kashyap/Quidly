import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["CANDIDATE", "RECRUITER"]);
export const jobStatus = pgEnum("job_status", ["DRAFT", "OPEN", "CLOSED"]);
export const applicationStatus = pgEnum("application_status", [
  "ACTIVE",
  "REJECTED_RELEASED",
  "INTERVIEW_PENDING",
  "INTERVIEW_CONFIRMED",
  "DISPUTED",
  "GHOSTED_PAID_OUT",
]);
export const payoutStatus = pgEnum("payout_status", ["QUEUED", "PENDING", "SUCCESS", "FAILED"]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    role: userRole().notNull(),
    email: text().notNull().unique(),
    companyName: text(),
    paypalPayerId: text().unique(),
    paypalVerified: boolean().notNull().default(false),
    availableSlots: integer().notNull().default(5),
  },
  (table) => [check("available_slots_not_negative", sql`${table.availableSlots} >= 0`)],
);

export const jobs = pgTable("jobs", {
  id: uuid().primaryKey().defaultRandom(),
  recruiterId: uuid()
    .notNull()
    .references(() => users.id),
  title: text().notNull(),
  requirementsText: text().notNull(),
  applicantCap: integer().notNull(),
  listingCaptureId: text(),
  bondCaptureId: text(),
  bondTotal: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
  bondForfeited: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
  bondRefunded: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
  status: jobStatus().notNull().default("DRAFT"),
});

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    jobId: uuid()
      .notNull()
      .references(() => jobs.id),
    candidateId: uuid()
      .notNull()
      .references(() => users.id),
    resumeText: text().notNull(),
    paypalAuthId: text().notNull(),
    // Set once the hold is confirmed void, so a failed void can be retried.
    holdVoidedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    status: applicationStatus().notNull().default("ACTIVE"),
    unmetRequirement: text(),
    recruiterFeedback: text(),
    interviewAt: timestamp({ withTimezone: true }),
    elasticMatchScore: doublePrecision(),
    elasticQualityScore: doublePrecision(),
    candidateFlagged: boolean().notNull().default(false),
    payoutBatchId: text(),
    payoutStatus: payoutStatus(),
  },
  (table) => [unique("one_application_per_job").on(table.jobId, table.candidateId)],
);
