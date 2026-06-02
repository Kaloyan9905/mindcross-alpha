-- MindCross — session lifecycle: a join-grace period and a recycle bin.
--
-- started_at: when the FIRST participant opened the room. Drives the 10-minute
--   grace period — a session with no started_at past (starts_at + grace) is a
--   no-show; one that was joined stays live until ends_at.
-- deleted_at / deleted_by: soft-delete for the recycle bin. Removed sessions are
--   hidden from the lists but recoverable; a maintenance job purges rows older
--   than the retention window (30 days).

ALTER TABLE "bookings" ADD COLUMN "started_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deleted_by" text
    REFERENCES "users" ("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "bookings_deleted_at_idx"
    ON "bookings" ("deleted_at")
    WHERE "deleted_at" IS NOT NULL;
