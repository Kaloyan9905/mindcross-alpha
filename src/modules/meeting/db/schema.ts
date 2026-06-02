import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

import { users } from "@/modules/identity/db/schema";
import { bookings } from "@/modules/booking/db/schema";

/**
 * meeting_presence: heartbeat-based "who is in this room right now". Each
 * participant upserts their row on join and every poll tick; rows older than a
 * few seconds are treated as gone (and pruned). Drives peer discovery and the
 * "waiting for the other person" UI.
 */
export const meetingPresence = pgTable(
  "meeting_presence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull().default(""),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    bookingUserKey: uniqueIndex("meeting_presence_booking_user_key").on(
      table.bookingId,
      table.userId,
    ),
    bookingSeenIdx: index("meeting_presence_booking_seen_idx").on(
      table.bookingId,
      table.lastSeenAt,
    ),
  }),
);

export type MeetingPresence = typeof meetingPresence.$inferSelect;
export type NewMeetingPresence = typeof meetingPresence.$inferInsert;

/** A `bye` signals a peer leaving; everything else is an opaque WebRTC blob. */
export const MEETING_SIGNAL_KIND = ["signal", "bye"] as const;
export type MeetingSignalKind = (typeof MEETING_SIGNAL_KIND)[number];

/**
 * meeting_signals: transient WebRTC SDP/ICE blobs addressed from one
 * participant to another. The recipient consumes (deletes) its inbox on each
 * poll, so rows are short-lived. `payload` is the JSON-serialized signal blob.
 */
export const meetingSignals = pgTable(
  "meeting_signals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: MEETING_SIGNAL_KIND }).notNull().default("signal"),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    inboxIdx: index("meeting_signals_inbox_idx").on(
      table.bookingId,
      table.recipientId,
      table.createdAt,
    ),
  }),
);

export type MeetingSignal = typeof meetingSignals.$inferSelect;
export type NewMeetingSignal = typeof meetingSignals.$inferInsert;

/**
 * meeting_messages: persistent in-call chat, scoped to a booking. Unlike the
 * old data-channel chat, these survive a refresh/rejoin and are consistent for
 * everyone in the room. `id` is client-generated (uuidv7) so the sender can
 * de-dupe its own optimistic message when it polls back.
 */
export const meetingMessages = pgTable(
  "meeting_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderName: text("sender_name").notNull().default(""),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    bookingCreatedIdx: index("meeting_messages_booking_created_idx").on(
      table.bookingId,
      table.createdAt,
    ),
  }),
);

export type MeetingMessage = typeof meetingMessages.$inferSelect;
export type NewMeetingMessage = typeof meetingMessages.$inferInsert;
