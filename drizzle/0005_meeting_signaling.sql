-- MindCross — in-app meeting engine (owned WebRTC, no external service).
--
-- Replaces the external meeting link with a peer-to-peer video room hosted
-- inside MindCross. These two tables are the SIGNALING plane only — no audio or
-- video ever touches the server (media is end-to-end-encrypted, browser-to-
-- browser, via WebRTC DTLS-SRTP). Signaling volume is tiny (a few SDP/ICE blobs
-- per call), so it rides the app's existing Postgres + short-poll pattern and
-- works on Vercel serverless without any persistent WebSocket.

------------------------------------------------------------------------------
-- 1. meeting_presence — who is currently in a booking's room (heartbeat-based).
--    Used for peer discovery and the "waiting for the other person" UI. A row
--    is "live" while last_seen_at is recent; stale rows are pruned on sync.
------------------------------------------------------------------------------
CREATE TABLE "meeting_presence" (
    "id"            text        PRIMARY KEY,
    "booking_id"    text        NOT NULL
        REFERENCES "bookings" ("id") ON DELETE CASCADE,
    "user_id"       text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "display_name"  text        NOT NULL DEFAULT '',
    "last_seen_at"  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_presence_booking_user_key"
    ON "meeting_presence" ("booking_id", "user_id");
--> statement-breakpoint
CREATE INDEX "meeting_presence_booking_seen_idx"
    ON "meeting_presence" ("booking_id", "last_seen_at");
--> statement-breakpoint

------------------------------------------------------------------------------
-- 2. meeting_signals — transient WebRTC SDP/ICE blobs addressed peer -> peer.
--    The recipient consumes (DELETE ... RETURNING) its inbox on each poll, so
--    rows are short-lived. 'bye' marks a peer leaving for snappy teardown.
------------------------------------------------------------------------------
CREATE TABLE "meeting_signals" (
    "id"            text        PRIMARY KEY,
    "booking_id"    text        NOT NULL
        REFERENCES "bookings" ("id") ON DELETE CASCADE,
    "sender_id"     text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "recipient_id"  text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "kind"          text        NOT NULL DEFAULT 'signal'
        CONSTRAINT "meeting_signals_kind_check"
        CHECK ("kind" IN ('signal', 'bye')),
    "payload"       text        NOT NULL,
    "created_at"    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "meeting_signals_inbox_idx"
    ON "meeting_signals" ("booking_id", "recipient_id", "created_at");
