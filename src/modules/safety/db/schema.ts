import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";

/**
 * A personal safety plan (one per client) — a guided set of free-text steps a
 * person can return to in a crisis. Modelled on the evidence-based safety-plan
 * format (warning signs → coping → support → professionals → safe environment →
 * reasons to live). All fields are optional; the client fills what helps them.
 */
export const safetyPlans = pgTable(
  "safety_plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    warningSigns: text("warning_signs"),
    copingStrategies: text("coping_strategies"),
    supportPeople: text("support_people"),
    professionalContacts: text("professional_contacts"),
    safeEnvironment: text("safe_environment"),
    reasonsToLive: text("reasons_to_live"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    clientKey: uniqueIndex("safety_plans_client_key").on(table.clientId),
  }),
);
export type SafetyPlan = typeof safetyPlans.$inferSelect;
export type NewSafetyPlan = typeof safetyPlans.$inferInsert;
