-- MindCross — therapist time off (blocked / vacation periods) for the calendar.
--
-- A time-off block hides a span of the therapist's calendar as unavailable.
-- Adding one also clears any OPEN (unbooked) slots it overlaps so clients can't
-- book during it (done in the action, not here).

CREATE TABLE "therapist_time_off" (
    "id"            text        PRIMARY KEY,
    "therapist_id"  text        NOT NULL
        REFERENCES "therapists" ("id") ON DELETE CASCADE,
    "starts_at"     timestamptz NOT NULL,
    "ends_at"       timestamptz NOT NULL,
    "note"          text,
    "created_at"    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "therapist_time_off_therapist_idx"
    ON "therapist_time_off" ("therapist_id", "starts_at");
