import {
  customType,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

/**
 * Citext: case-insensitive text. Backed by the Postgres `citext` extension
 * (enabled in the init migration). Drizzle has no built-in citext column, so
 * we expose it via `customType`.
 */
const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

/**
 * Role values used by MindCross. Single string column with a CHECK constraint
 * expressed in the SQL migration; on the TS side we constrain via the enum
 * tuple passed to `text()`.
 */
export const USER_ROLES = [
  "client",
  "therapist",
  "admin_ops",
  "admin_clinical",
  "admin_support",
  "admin_super",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * users: identity record. Auth.js v5 + Drizzle adapter compatible.
 * `id` is a UUIDv7 generated in app code (not DB-side) so it is monotonic and
 * portable across local/preview/prod without server clock dependence.
 *
 * `passwordHash` is NULL for OAuth-only users. `securityStamp` rotates on
 * password or critical security change to invalidate existing sessions.
 */
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name"),
    email: citext("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: text("role", { enum: USER_ROLES })
      .notNull()
      .default("client"),
    securityStamp: text("security_stamp")
      .notNull()
      .$defaultFn(() => uuidv7()),
    /**
     * GDPR consent record. `consentAcceptedAt` is when the user accepted the
     * privacy policy + therapy disclaimer + data-processing terms at signup,
     * and `consentPolicyVersion` is which version of those documents they
     * accepted (see `lib/consent.ts`). Nullable for pre-existing/admin-created
     * rows; set at registration. This is the defensible "who consented, when,
     * to what" record required for Article 9 health data.
     */
    consentAcceptedAt: timestamp("consent_accepted_at", {
      withTimezone: true,
      mode: "date",
    }),
    consentPolicyVersion: text("consent_policy_version"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_key").on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * accounts: Auth.js OAuth account links. Composite PK on (provider,
 * providerAccountId). One user may have many OAuth providers.
 */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

/**
 * sessions: Auth.js DB session strategy table. `sessionToken` is the opaque
 * cookie value the client presents.
 */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * verificationTokens: Auth.js email-link verification table. Composite PK on
 * (identifier, token).
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// Re-export the auxiliary citext helper for any module that needs to model
// case-insensitive text columns referencing identity.
export { citext as citextColumn };
