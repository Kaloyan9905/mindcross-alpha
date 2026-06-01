-- MindCross — differentiators: wellbeing check-ins + personal safety plans.
--
-- 1. wellbeing_checkins: a quick mood/feeling journal a client can optionally
--    share with their therapist, for continuity between sessions.
-- 2. safety_plans: a guided personal safety plan (one per client) — a duty-of-
--    care feature for an emotionally vulnerable audience.

------------------------------------------------------------------------------
-- 1. wellbeing_checkins  (wellbeing module)
------------------------------------------------------------------------------
CREATE TABLE "wellbeing_checkins" (
    "id"                     text        PRIMARY KEY,
    "client_id"              text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "mood"                   integer     NOT NULL
        CONSTRAINT "wellbeing_checkins_mood_check"
        CHECK ("mood" BETWEEN 1 AND 5),
    "feelings"               text[]      NOT NULL DEFAULT '{}'::text[],
    "note"                   text,
    "shared_with_therapist"  boolean     NOT NULL DEFAULT false,
    "created_at"             timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "wellbeing_checkins_client_created_idx"
    ON "wellbeing_checkins" ("client_id", "created_at");
--> statement-breakpoint
CREATE INDEX "wellbeing_checkins_shared_idx"
    ON "wellbeing_checkins" ("client_id", "created_at")
    WHERE "shared_with_therapist" = true;
--> statement-breakpoint

------------------------------------------------------------------------------
-- 2. safety_plans  (safety module) — one per client.
------------------------------------------------------------------------------
CREATE TABLE "safety_plans" (
    "id"                     text        PRIMARY KEY,
    "client_id"              text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "warning_signs"          text,
    "coping_strategies"      text,
    "support_people"         text,
    "professional_contacts"  text,
    "safe_environment"       text,
    "reasons_to_live"        text,
    "created_at"             timestamptz NOT NULL DEFAULT now(),
    "updated_at"             timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "safety_plans_client_key" ON "safety_plans" ("client_id");
