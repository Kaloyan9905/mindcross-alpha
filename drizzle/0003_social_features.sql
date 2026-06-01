-- MindCross — social layer: friends, messaging, and group sessions.
--
-- 1. friends module: friendships, user_blocks, user_reports + a trigram index
--    on users.name for open name search (mirrors therapists_display_name_trgm).
-- 2. messaging module: conversations (DM + therapist) and messages.
-- 3. booking extension: bookings.group_capacity + booking_participants, so a
--    client can invite friends to co-join one session.
--
-- Enums are TEXT + CHECK (same convention as users.role). Conversation user
-- pairs are stored canonically (user_one_id < user_two_id) so the unique index
-- collapses (A,B) and (B,A); friendships dedupe the unordered pair via a
-- LEAST/GREATEST expression index.

------------------------------------------------------------------------------
-- 1. friendships  (friends module)
------------------------------------------------------------------------------
CREATE TABLE "friendships" (
    "id"            text        PRIMARY KEY,
    "requester_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "addressee_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "status"        text        NOT NULL DEFAULT 'pending'
        CONSTRAINT "friendships_status_check"
        CHECK ("status" IN ('pending', 'accepted', 'declined')),
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    "responded_at"  timestamptz,
    CONSTRAINT "friendships_not_self" CHECK ("requester_id" <> "addressee_id")
);
--> statement-breakpoint
-- At most one friendship per unordered pair, regardless of who asked whom.
CREATE UNIQUE INDEX "friendships_pair_uniq"
    ON "friendships" (LEAST("requester_id", "addressee_id"), GREATEST("requester_id", "addressee_id"));
--> statement-breakpoint
CREATE INDEX "friendships_requester_idx" ON "friendships" ("requester_id");
--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" ("addressee_id");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 2. user_blocks  (friends module) — directional; a block is one-way
------------------------------------------------------------------------------
CREATE TABLE "user_blocks" (
    "id"          text        PRIMARY KEY,
    "blocker_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "blocked_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "user_blocks_not_self" CHECK ("blocker_id" <> "blocked_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_key" ON "user_blocks" ("blocker_id", "blocked_id");
--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 3. user_reports  (friends module) — reported_id is SET NULL to keep the
--    audit row if an abusive account is later deleted.
------------------------------------------------------------------------------
CREATE TABLE "user_reports" (
    "id"           text        PRIMARY KEY,
    "reporter_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "reported_id"  text
        REFERENCES "users" ("id") ON DELETE SET NULL,
    "reason"       text        NOT NULL
        CONSTRAINT "user_reports_reason_check"
        CHECK ("reason" IN ('harassment', 'spam', 'inappropriate', 'safety_concern', 'other')),
    "details"      text,
    "context"      text,
    "status"       text        NOT NULL DEFAULT 'open'
        CONSTRAINT "user_reports_status_check"
        CHECK ("status" IN ('open', 'reviewing', 'actioned', 'dismissed')),
    "reviewed_by"  text
        REFERENCES "users" ("id") ON DELETE SET NULL,
    "reviewed_at"  timestamptz,
    "created_at"   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "user_reports_status_idx" ON "user_reports" ("status");
--> statement-breakpoint
CREATE INDEX "user_reports_reported_idx" ON "user_reports" ("reported_id");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 4. conversations  (messaging module) — user pair stored canonically sorted.
------------------------------------------------------------------------------
CREATE TABLE "conversations" (
    "id"              text        PRIMARY KEY,
    "kind"            text        NOT NULL
        CONSTRAINT "conversations_kind_check"
        CHECK ("kind" IN ('dm', 'therapist')),
    "user_one_id"     text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "user_two_id"     text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "therapist_id"    text
        REFERENCES "therapists" ("id") ON DELETE CASCADE,
    "created_at"      timestamptz NOT NULL DEFAULT now(),
    "last_message_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "conversations_user_order" CHECK ("user_one_id" < "user_two_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_pair_key"
    ON "conversations" ("kind", "user_one_id", "user_two_id");
--> statement-breakpoint
CREATE INDEX "conversations_user_one_idx" ON "conversations" ("user_one_id");
--> statement-breakpoint
CREATE INDEX "conversations_user_two_idx" ON "conversations" ("user_two_id");
--> statement-breakpoint
CREATE INDEX "conversations_therapist_idx" ON "conversations" ("therapist_id");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 5. messages  (messaging module)
------------------------------------------------------------------------------
CREATE TABLE "messages" (
    "id"               text        PRIMARY KEY,
    "conversation_id"  text        NOT NULL
        REFERENCES "conversations" ("id") ON DELETE CASCADE,
    "sender_id"        text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "body"             text        NOT NULL,
    "read_at"          timestamptz,
    "created_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx"
    ON "messages" ("conversation_id", "created_at");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 6. bookings: group capacity (1 = solo session; > 1 = group)
------------------------------------------------------------------------------
ALTER TABLE "bookings" ADD COLUMN "group_capacity" integer NOT NULL DEFAULT 1;
--> statement-breakpoint

------------------------------------------------------------------------------
-- 7. booking_participants  (booking module) — seat ledger for group sessions.
--    The host gets a row (role='host', status='accepted'); guests are invited.
------------------------------------------------------------------------------
CREATE TABLE "booking_participants" (
    "id"           text        PRIMARY KEY,
    "booking_id"   text        NOT NULL
        REFERENCES "bookings" ("id") ON DELETE CASCADE,
    "client_id"    text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "role"         text        NOT NULL
        CONSTRAINT "booking_participants_role_check"
        CHECK ("role" IN ('host', 'guest')),
    "status"       text        NOT NULL DEFAULT 'invited'
        CONSTRAINT "booking_participants_status_check"
        CHECK ("status" IN ('invited', 'accepted', 'declined')),
    "invited_at"   timestamptz NOT NULL DEFAULT now(),
    "responded_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_participants_pair_key"
    ON "booking_participants" ("booking_id", "client_id");
--> statement-breakpoint
CREATE INDEX "booking_participants_client_idx" ON "booking_participants" ("client_id");
--> statement-breakpoint
CREATE INDEX "booking_participants_booking_idx" ON "booking_participants" ("booking_id");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 8. users.name trigram index — open name search for the friends finder.
------------------------------------------------------------------------------
CREATE INDEX "users_name_trgm" ON "users" USING GIN ("name" gin_trgm_ops);
