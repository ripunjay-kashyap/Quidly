ALTER TABLE "jobs" ADD COLUMN "funding_order_id" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_paypalAuthId_unique" UNIQUE("paypal_auth_id");