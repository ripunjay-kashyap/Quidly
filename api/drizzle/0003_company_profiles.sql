ALTER TABLE "jobs" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "location" text DEFAULT 'Remote' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "employment_type" text DEFAULT 'Full-time' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_range" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_industry" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_size" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;