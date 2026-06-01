-- MindCross — demoable feature additions.
--
-- 1. therapists.verified — admin-toggled "Verified" trust badge.
-- 2. bookings.reminder_1h_sent_at — idempotency key for the optional ~1h
--    pre-session reminder (independent of the 24h `reminder_sent_at`).

------------------------------------------------------------------------------
-- therapists: verification badge
------------------------------------------------------------------------------
ALTER TABLE "therapists" ADD COLUMN "verified" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

------------------------------------------------------------------------------
-- bookings: optional 1h reminder tracking
------------------------------------------------------------------------------
ALTER TABLE "bookings" ADD COLUMN "reminder_1h_sent_at" timestamptz;
--> statement-breakpoint
CREATE INDEX "bookings_reminder_1h_due_idx"
    ON "bookings" ("starts_at")
    WHERE "reminder_1h_sent_at" IS NULL AND "status" = 'confirmed';
