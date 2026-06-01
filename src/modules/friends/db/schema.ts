import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";

/**
 * The friend graph for clients. A friendship row is directional (it records who
 * asked whom) but represents ONE relationship per unordered pair — that
 * uniqueness is enforced by an expression index
 * (`friendships_pair_uniq` on LEAST/GREATEST of the two ids) declared in
 * `drizzle/0003_social_features.sql`, since drizzle-kit cannot express it here.
 */
export const FRIENDSHIP_STATUS = ["pending", "accepted", "declined"] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUS)[number];

export const friendships = pgTable(
  "friendships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: FRIENDSHIP_STATUS })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    respondedAt: timestamp("responded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    requesterIdx: index("friendships_requester_idx").on(table.requesterId),
    addresseeIdx: index("friendships_addressee_idx").on(table.addresseeId),
  }),
);
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;

/**
 * A one-way block. While a block exists in EITHER direction, the two users
 * cannot friend, message, or see each other in search.
 */
export const userBlocks = pgTable(
  "user_blocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pairKey: uniqueIndex("user_blocks_pair_key").on(
      table.blockerId,
      table.blockedId,
    ),
    blockedIdx: index("user_blocks_blocked_idx").on(table.blockedId),
  }),
);
export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;

/** Abuse report, triaged by staff. `reportedId` survives the user's deletion. */
export const REPORT_REASON = [
  "harassment",
  "spam",
  "inappropriate",
  "safety_concern",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASON)[number];

export const REPORT_STATUS = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

export const userReports = pgTable(
  "user_reports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportedId: text("reported_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason", { enum: REPORT_REASON }).notNull(),
    details: text("details"),
    context: text("context"),
    status: text("status", { enum: REPORT_STATUS }).notNull().default("open"),
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    statusIdx: index("user_reports_status_idx").on(table.status),
    reportedIdx: index("user_reports_reported_idx").on(table.reportedId),
  }),
);
export type UserReport = typeof userReports.$inferSelect;
export type NewUserReport = typeof userReports.$inferInsert;
