import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";

/**
 * Therapist profile status. Therapists move from `draft` (admin authoring) or
 * `pending_review` (from a public application) to `active` once approved.
 * `paused` is a soft pause (still visible to ops, not to clients); `disabled`
 * is a hard removal.
 */
export const THERAPIST_STATUS = [
  "draft",
  "pending_review",
  "active",
  "paused",
  "disabled",
] as const;
export type TherapistStatus = (typeof THERAPIST_STATUS)[number];

/**
 * Self-described gender categories shown in client filters. Therapists may
 * leave this NULL to indicate "no preference disclosed".
 */
export const THERAPIST_GENDERS = [
  "female",
  "male",
  "non_binary",
  "other",
  "prefer_not_to_say",
] as const;
export type TherapistGender = (typeof THERAPIST_GENDERS)[number];

/**
 * Therapist application status used for the careers / "join as therapist"
 * funnel. `info_requested` lets ops park an application while waiting on more
 * info from the applicant.
 */
export const THERAPIST_APPLICATION_STATUS = [
  "pending",
  "info_requested",
  "approved",
  "rejected",
] as const;
export type TherapistApplicationStatus =
  (typeof THERAPIST_APPLICATION_STATUS)[number];

/**
 * therapists: public-facing therapist profile.
 *
 * `userId` is nullable because a therapist record can be authored by ops
 * before the therapist's login user exists, and we keep the profile if the
 * user is later deleted (ON DELETE SET NULL).
 *
 * `sessionUrl` is the therapist's own Zoom / Meet / Whereby / Jitsi join link.
 * MindCross does not host video at MVP. At booking time we snapshot it into
 * the booking row so a later change to the therapist profile does not break
 * already-confirmed sessions.
 */
export const therapists = pgTable(
  "therapists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    bio: text("bio").notNull(),
    yearsOfExperience: integer("years_of_experience").notNull(),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    culturalBackground: text("cultural_background")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    specializations: text("specializations")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    migrationExperience: boolean("migration_experience").notNull().default(false),
    gender: text("gender", { enum: THERAPIST_GENDERS }),
    pricePerSessionCents: integer("price_per_session_cents"),
    currency: text("currency").notNull().default("EUR"),
    sessionUrl: text("session_url"),
    status: text("status", { enum: THERAPIST_STATUS })
      .notNull()
      .default("pending_review"),
    /**
     * Trust signal shown to clients as a "Verified" badge. Toggled by admin
     * after manual ID/license/reference checks (verification automation is a
     * post-MVP item). Defaults to false.
     */
    verified: boolean("verified").notNull().default(false),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    slugUnique: uniqueIndex("therapists_slug_key").on(table.slug),
    userIdUnique: uniqueIndex("therapists_user_id_key").on(table.userId),
    statusIdx: index("therapists_status_idx").on(table.status),
    // GIN indexes on text[] columns and pg_trgm on display_name are created in
    // the raw SQL migration (drizzle-kit cannot fully express USING GIN here).
  }),
);

export type Therapist = typeof therapists.$inferSelect;
export type NewTherapist = typeof therapists.$inferInsert;

/**
 * availability_slots: 1:N — each therapist owns many bookable timeslots.
 * `isBooked` is a denormalized flag updated transactionally with the booking
 * insert so the slot listing query stays cheap.
 */
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    isBooked: boolean("is_booked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    therapistIdx: index("availability_slots_therapist_id_idx").on(table.therapistId),
    startsAtIdx: index("availability_slots_starts_at_idx").on(table.startsAt),
  }),
);

export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type NewAvailabilitySlot = typeof availabilitySlots.$inferInsert;

/**
 * therapist_applications: inbound applications from the public "join as
 * therapist" form. These are reviewed by admin_ops; on approval, ops
 * authors a `therapists` row and (optionally) invites the applicant to a
 * user account.
 *
 * NOTE: this table is intentionally kept inside the therapists module rather
 * than a separate `careers` module — the careers landing page just submits to
 * this table.
 */
export const therapistApplications = pgTable(
  "therapist_applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    country: text("country"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    specializations: text("specializations")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    yearsOfExperience: integer("years_of_experience"),
    shortBio: text("short_bio"),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: THERAPIST_APPLICATION_STATUS })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    statusIdx: index("therapist_applications_status_idx").on(table.status),
    submittedIdx: index("therapist_applications_submitted_at_idx").on(
      table.submittedAt,
    ),
  }),
);

export type TherapistApplication = typeof therapistApplications.$inferSelect;
export type NewTherapistApplication = typeof therapistApplications.$inferInsert;
