import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";
import {
  availabilitySlots,
  therapists,
} from "@/modules/therapists/db/schema";

/**
 * Booking lifecycle.
 *
 * At MVP there is no payment, so bookings move directly to `confirmed` on
 * create. We keep `pending` in the type union for forward-compat but UX must
 * not depend on it. `no_show` is bookkeeping for the therapist dashboard.
 */
export const BOOKING_STATUS = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

/**
 * bookings: a confirmed session between a client (user) and a therapist.
 *
 * `slotId` is the availability slot consumed by this booking, and is nullable
 * via ON DELETE SET NULL so we keep the historical booking even if the slot
 * record is later cleaned up.
 *
 * `joinUrl` is snapshotted from `therapists.sessionUrl` at booking time so a
 * subsequent profile edit cannot retroactively change a confirmed session's
 * meeting link.
 *
 * `startsAt` / `endsAt` are also denormalized from the slot for the same
 * reason — once the booking is confirmed it owns its own timing.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    slotId: text("slot_id").references(() => availabilitySlots.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    status: text("status", { enum: BOOKING_STATUS })
      .notNull()
      .default("confirmed"),
    clientNotes: text("client_notes"),
    therapistNotes: text("therapist_notes"),
    joinUrl: text("join_url"),
    /**
     * Total seats for this session including the host. 1 = a normal solo
     * session; > 1 means the host may invite friends to co-join (see
     * `booking_participants`). Occupied seats = accepted participant rows.
     */
    groupCapacity: integer("group_capacity").notNull().default(1),
    /**
     * When the 24h pre-session reminder email was sent, or NULL if not yet
     * sent. This is the idempotency key for the reminder scan
     * (`src/modules/booking/lib/send-due-reminders.ts`): a booking is only
     * "due" a reminder while this is NULL. The partial index supporting that
     * scan is created in the raw SQL migration (drizzle-kit cannot express the
     * `WHERE` predicate here) — see `drizzle/0001_mvp_gaps.sql`.
     */
    reminderSentAt: timestamp("reminder_sent_at", {
      withTimezone: true,
      mode: "date",
    }),
    /**
     * When the optional ~1h pre-session reminder was sent (NULL = not yet).
     * Separate idempotency key from `reminderSentAt` (the 24h reminder) so the
     * two passes are independent. Partial index in `drizzle/0002_demo_features.sql`.
     */
    reminder1hSentAt: timestamp("reminder_1h_sent_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    cancelledBy: text("cancelled_by").references(() => users.id, {
      onDelete: "set null",
    }),
    /**
     * When the FIRST participant opened the room. NULL = nobody has joined yet,
     * which (past the grace period) makes the session a no-show. See
     * `lib/session-lifecycle.ts`.
     */
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    /**
     * Soft-delete (recycle bin). When set, the booking is hidden from the normal
     * lists but recoverable; a maintenance job hard-deletes rows older than the
     * retention window. `deletedBy` records who removed it.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    deletedBy: text("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    clientIdx: index("bookings_client_id_idx").on(table.clientId),
    therapistIdx: index("bookings_therapist_id_idx").on(table.therapistId),
    startsAtIdx: index("bookings_starts_at_idx").on(table.startsAt),
    statusIdx: index("bookings_status_idx").on(table.status),
  }),
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

/**
 * booking_participants: the seat ledger for a group session.
 *
 * The host is inserted as `(role: "host", status: "accepted")` when group mode
 * is enabled; invited friends are `(role: "guest", status: "invited")` and
 * become "accepted" when they join (subject to `bookings.groupCapacity`, which
 * is enforced under a row lock in the invite/accept cores). `bookings.clientId`
 * remains the owner/source of truth.
 */
export const PARTICIPANT_ROLE = ["host", "guest"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLE)[number];

export const PARTICIPANT_STATUS = ["invited", "accepted", "declined"] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[number];

export const bookingParticipants = pgTable(
  "booking_participants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: PARTICIPANT_ROLE }).notNull(),
    status: text("status", { enum: PARTICIPANT_STATUS })
      .notNull()
      .default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    respondedAt: timestamp("responded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    pairKey: uniqueIndex("booking_participants_pair_key").on(
      table.bookingId,
      table.clientId,
    ),
    clientIdx: index("booking_participants_client_idx").on(table.clientId),
    bookingIdx: index("booking_participants_booking_idx").on(table.bookingId),
  }),
);
export type BookingParticipant = typeof bookingParticipants.$inferSelect;
export type NewBookingParticipant = typeof bookingParticipants.$inferInsert;
