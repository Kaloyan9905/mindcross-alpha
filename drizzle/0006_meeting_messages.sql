-- MindCross — persistent in-call chat for the meeting room.
--
-- The in-call chat was previously a WebRTC data channel (in-memory), so it
-- vanished on refresh/rejoin. Store it server-side, scoped to the booking, so
-- it survives reloads and is consistent for everyone in the room. Messages are
-- short-lived session chatter; a future job can prune old rows.

CREATE TABLE "meeting_messages" (
    "id"          text        PRIMARY KEY,
    "booking_id"  text        NOT NULL
        REFERENCES "bookings" ("id") ON DELETE CASCADE,
    "sender_id"   text        NOT NULL
        REFERENCES "users" ("id") ON DELETE CASCADE,
    "sender_name" text        NOT NULL DEFAULT '',
    "body"        text        NOT NULL,
    "created_at"  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "meeting_messages_booking_created_idx"
    ON "meeting_messages" ("booking_id", "created_at");
