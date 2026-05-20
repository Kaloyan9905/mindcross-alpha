import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    cancelledBy: text("cancelled_by").references(() => users.id, {
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
