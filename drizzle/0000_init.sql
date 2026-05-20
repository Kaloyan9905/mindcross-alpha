-- MindCross MVP — initial schema.
--
-- Naming: snake_case column + table names. Camel-case TS properties are
-- mapped at the Drizzle column-constructor layer (see
-- src/modules/<name>/db/schema.ts).
--
-- IDs: TEXT columns holding a UUIDv7 string. The default value is generated
-- in application code (`uuidv7()` from the `uuidv7` package) — we do not rely
-- on DB-side UUID generation so IDs stay monotonic and deterministic for
-- local seeding.
--
-- Timestamps: TIMESTAMPTZ, stored UTC. `updated_at` is maintained by app
-- code on insert/update; there is no DB trigger.
--
-- Enums: encoded as TEXT + CHECK constraint. The TS-side enum tuple in
-- Drizzle keeps the literal types in sync; this SQL guards the DB end.

------------------------------------------------------------------------------
-- 0. Extensions
------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "citext";

------------------------------------------------------------------------------
-- 1. users  (identity module)
------------------------------------------------------------------------------
CREATE TABLE "users" (
    "id"              text        PRIMARY KEY,
    "name"            text,
    "email"           citext      NOT NULL,
    "email_verified"  timestamptz,
    "image"           text,
    "password_hash"   text,
    "role"            text        NOT NULL DEFAULT 'client'
        CONSTRAINT "users_role_check"
        CHECK ("role" IN (
            'client',
            'therapist',
            'admin_ops',
            'admin_clinical',
            'admin_support',
            'admin_super'
        )),
    "security_stamp"  text        NOT NULL,
    "created_at"      timestamptz NOT NULL DEFAULT now(),
    "updated_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
--> statement-breakpoint
------------------------------------------------------------------------------
-- 2. accounts  (Auth.js OAuth links — identity module)
------------------------------------------------------------------------------
CREATE TABLE "accounts" (
    "user_id"             text NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "type"                text NOT NULL,
    "provider"            text NOT NULL,
    "provider_account_id" text NOT NULL,
    "refresh_token"       text,
    "access_token"        text,
    "expires_at"          integer,
    "token_type"          text,
    "scope"               text,
    "id_token"            text,
    "session_state"       text,
    CONSTRAINT "accounts_pkey"
        PRIMARY KEY ("provider", "provider_account_id")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");
--> statement-breakpoint
------------------------------------------------------------------------------
-- 3. sessions  (Auth.js DB sessions — identity module)
------------------------------------------------------------------------------
CREATE TABLE "sessions" (
    "session_token" text        PRIMARY KEY,
    "user_id"       text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "expires"       timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
--> statement-breakpoint
------------------------------------------------------------------------------
-- 4. verification_tokens  (Auth.js email-link tokens — identity module)
------------------------------------------------------------------------------
CREATE TABLE "verification_tokens" (
    "identifier" text        NOT NULL,
    "token"      text        NOT NULL,
    "expires"    timestamptz NOT NULL,
    CONSTRAINT "verification_tokens_pkey"
        PRIMARY KEY ("identifier", "token")
);
--> statement-breakpoint
------------------------------------------------------------------------------
-- 5. therapists  (therapists module)
------------------------------------------------------------------------------
CREATE TABLE "therapists" (
    "id"                      text        PRIMARY KEY,
    "user_id"                 text
        REFERENCES "users" ("id") ON DELETE SET NULL,
    "slug"                    text        NOT NULL,
    "display_name"            text        NOT NULL,
    "email"                   text        NOT NULL,
    "phone"                   text,
    "bio"                     text        NOT NULL,
    "years_of_experience"     integer     NOT NULL
        CONSTRAINT "therapists_years_check"
        CHECK ("years_of_experience" BETWEEN 0 AND 70),
    "languages"               text[]      NOT NULL DEFAULT '{}'::text[],
    "cultural_background"     text[]      NOT NULL DEFAULT '{}'::text[],
    "specializations"         text[]      NOT NULL DEFAULT '{}'::text[],
    "migration_experience"    boolean     NOT NULL DEFAULT false,
    "gender"                  text
        CONSTRAINT "therapists_gender_check"
        CHECK ("gender" IS NULL OR "gender" IN (
            'female',
            'male',
            'non_binary',
            'other',
            'prefer_not_to_say'
        )),
    "price_per_session_cents" integer,
    "currency"                text        NOT NULL DEFAULT 'EUR',
    "session_url"             text,
    "status"                  text        NOT NULL DEFAULT 'pending_review'
        CONSTRAINT "therapists_status_check"
        CHECK ("status" IN (
            'draft',
            'pending_review',
            'active',
            'paused',
            'disabled'
        )),
    "photo_url"               text,
    "created_at"              timestamptz NOT NULL DEFAULT now(),
    "updated_at"              timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "therapists_slug_key"    ON "therapists" ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "therapists_user_id_key" ON "therapists" ("user_id");
--> statement-breakpoint
CREATE        INDEX "therapists_status_idx"  ON "therapists" ("status");
--> statement-breakpoint
-- GIN indexes for array-membership filters (matching module: filters-only).
CREATE INDEX "therapists_languages_gin"
    ON "therapists" USING GIN ("languages");
--> statement-breakpoint
CREATE INDEX "therapists_specializations_gin"
    ON "therapists" USING GIN ("specializations");
--> statement-breakpoint
CREATE INDEX "therapists_cultural_background_gin"
    ON "therapists" USING GIN ("cultural_background");
--> statement-breakpoint
-- Trigram index on display_name for cheap "type-ahead" name search in admin.
CREATE INDEX "therapists_display_name_trgm"
    ON "therapists" USING GIN ("display_name" gin_trgm_ops);
--> statement-breakpoint
------------------------------------------------------------------------------
-- 6. availability_slots  (therapists module)
------------------------------------------------------------------------------
CREATE TABLE "availability_slots" (
    "id"           text        PRIMARY KEY,
    "therapist_id" text        NOT NULL
        REFERENCES "therapists" ("id") ON DELETE CASCADE,
    "starts_at"    timestamptz NOT NULL,
    "ends_at"      timestamptz NOT NULL,
    "is_booked"    boolean     NOT NULL DEFAULT false,
    "created_at"   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "availability_slots_therapist_id_idx"
    ON "availability_slots" ("therapist_id");
--> statement-breakpoint
CREATE INDEX "availability_slots_starts_at_idx"
    ON "availability_slots" ("starts_at");
--> statement-breakpoint
------------------------------------------------------------------------------
-- 7. therapist_applications  (therapists module — careers funnel)
------------------------------------------------------------------------------
CREATE TABLE "therapist_applications" (
    "id"                  text        PRIMARY KEY,
    "full_name"           text        NOT NULL,
    "email"               text        NOT NULL,
    "phone"               text,
    "country"             text,
    "languages"           text[]      NOT NULL DEFAULT '{}'::text[],
    "specializations"     text[]      NOT NULL DEFAULT '{}'::text[],
    "years_of_experience" integer,
    "short_bio"           text,
    "submitted_at"        timestamptz NOT NULL DEFAULT now(),
    "reviewed_at"         timestamptz,
    "reviewed_by"         text
        REFERENCES "users" ("id") ON DELETE SET NULL,
    "status"              text        NOT NULL DEFAULT 'pending'
        CONSTRAINT "therapist_applications_status_check"
        CHECK ("status" IN (
            'pending',
            'info_requested',
            'approved',
            'rejected'
        ))
);
--> statement-breakpoint
CREATE INDEX "therapist_applications_status_idx"
    ON "therapist_applications" ("status");
--> statement-breakpoint
CREATE INDEX "therapist_applications_submitted_at_idx"
    ON "therapist_applications" ("submitted_at");
--> statement-breakpoint
------------------------------------------------------------------------------
-- 8. bookings  (booking module)
------------------------------------------------------------------------------
CREATE TABLE "bookings" (
    "id"               text        PRIMARY KEY,
    "client_id"        text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "therapist_id"     text        NOT NULL
        REFERENCES "therapists" ("id") ON DELETE CASCADE,
    "slot_id"          text
        REFERENCES "availability_slots" ("id") ON DELETE SET NULL,
    "starts_at"        timestamptz NOT NULL,
    "ends_at"          timestamptz NOT NULL,
    "status"           text        NOT NULL DEFAULT 'confirmed'
        CONSTRAINT "bookings_status_check"
        CHECK ("status" IN (
            'pending',
            'confirmed',
            'cancelled',
            'completed',
            'no_show'
        )),
    "client_notes"     text,
    "therapist_notes"  text,
    "join_url"         text,
    "cancelled_at"     timestamptz,
    "cancelled_by"     text
        REFERENCES "users" ("id") ON DELETE SET NULL,
    "created_at"       timestamptz NOT NULL DEFAULT now(),
    "updated_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "bookings_client_id_idx"    ON "bookings" ("client_id");
--> statement-breakpoint
CREATE INDEX "bookings_therapist_id_idx" ON "bookings" ("therapist_id");
--> statement-breakpoint
CREATE INDEX "bookings_starts_at_idx"    ON "bookings" ("starts_at");
--> statement-breakpoint
CREATE INDEX "bookings_status_idx"       ON "bookings" ("status");
