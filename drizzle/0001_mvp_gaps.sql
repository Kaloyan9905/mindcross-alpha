-- MindCross MVP — close MVP-plan gaps (24h reminder + GDPR consent record).
--
-- 1. bookings.reminder_sent_at — idempotency key for the 24h reminder scan
--    (src/modules/booking/lib/send-due-reminders.ts). NULL = not yet reminded.
--    A partial index supports the "due" scan cheaply.
-- 2. users.consent_accepted_at / consent_policy_version — the GDPR consent
--    record captured at signup (who consented, when, to which policy version).

------------------------------------------------------------------------------
-- bookings: 24h reminder tracking
------------------------------------------------------------------------------
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" timestamptz;
--> statement-breakpoint
CREATE INDEX "bookings_reminder_due_idx"
    ON "bookings" ("starts_at")
    WHERE "reminder_sent_at" IS NULL AND "status" = 'confirmed';
--> statement-breakpoint

------------------------------------------------------------------------------
-- users: GDPR consent record
------------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN "consent_accepted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_policy_version" text;
