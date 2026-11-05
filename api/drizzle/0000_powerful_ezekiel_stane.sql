CREATE TYPE "public"."application_status" AS ENUM('ACTIVE', 'REJECTED_RELEASED', 'INTERVIEW_PENDING', 'INTERVIEW_CONFIRMED', 'DISPUTED', 'GHOSTED_PAID_OUT');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('QUEUED', 'PENDING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CANDIDATE', 'RECRUITER');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"resume_text" text NOT NULL,
	"paypal_auth_id" text NOT NULL,
	"hold_voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "application_status" DEFAULT 'ACTIVE' NOT NULL,
	"unmet_requirement" text,
	"recruiter_feedback" text,
	"interview_at" timestamp with time zone,
	"elastic_match_score" double precision,
	"elastic_quality_score" double precision,
	"candidate_flagged" boolean DEFAULT false NOT NULL,
	"payout_batch_id" text,
	"payout_status" "payout_status",
	CONSTRAINT "one_application_per_job" UNIQUE("job_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"requirements_text" text NOT NULL,
	"applicant_cap" integer NOT NULL,
	"listing_capture_id" text,
	"bond_capture_id" text,
	"bond_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bond_forfeited" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bond_refunded" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "job_status" DEFAULT 'DRAFT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"paypal_payer_id" text,
	"paypal_verified" boolean DEFAULT false NOT NULL,
	"available_slots" integer DEFAULT 5 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_paypalPayerId_unique" UNIQUE("paypal_payer_id"),
	CONSTRAINT "available_slots_not_negative" CHECK ("users"."available_slots" >= 0)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;