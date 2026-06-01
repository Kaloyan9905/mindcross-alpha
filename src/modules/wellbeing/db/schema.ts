import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";

/**
 * A wellbeing check-in: a quick mood rating (1–5) plus optional feeling tags
 * and a note. A client may opt to share a check-in with their therapist, giving
 * sessions continuity. `mood` is constrained 1–5 by a CHECK in the migration.
 */
export const wellbeingCheckins = pgTable(
  "wellbeing_checkins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mood: integer("mood").notNull(),
    feelings: text("feelings")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    note: text("note"),
    sharedWithTherapist: boolean("shared_with_therapist")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    clientCreatedIdx: index("wellbeing_checkins_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
  }),
);
export type WellbeingCheckin = typeof wellbeingCheckins.$inferSelect;
export type NewWellbeingCheckin = typeof wellbeingCheckins.$inferInsert;

/** Mood scale: 1 = very low … 5 = very good. */
export const MOOD_MIN = 1;
export const MOOD_MAX = 5;
