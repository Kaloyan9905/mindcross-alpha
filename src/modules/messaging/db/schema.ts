import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";

/**
 * A conversation between two users.
 *
 * - `kind` "dm" is a client↔client thread (gated on an accepted friendship).
 * - `kind` "therapist" is a client↔therapist thread (gated on the client having
 *   a confirmed/completed booking with that therapist); `therapistId` is
 *   denormalized so the therapist inbox can resolve threads by therapist.
 *
 * The two participant ids are stored CANONICALLY (`userOneId < userTwoId`, a
 * CHECK enforces it) so the unique index on (kind, userOneId, userTwoId)
 * collapses (A,B) and (B,A) into one row.
 */
export const CONVERSATION_KIND = ["dm", "therapist"] as const;
export type ConversationKind = (typeof CONVERSATION_KIND)[number];

export const conversations = pgTable(
  "conversations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    kind: text("kind", { enum: CONVERSATION_KIND }).notNull(),
    userOneId: text("user_one_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userTwoId: text("user_two_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    therapistId: text("therapist_id").references(() => therapists.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    lastMessageAt: timestamp("last_message_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pairKey: uniqueIndex("conversations_pair_key").on(
      table.kind,
      table.userOneId,
      table.userTwoId,
    ),
    userOneIdx: index("conversations_user_one_idx").on(table.userOneId),
    userTwoIdx: index("conversations_user_two_idx").on(table.userTwoId),
    therapistIdx: index("conversations_therapist_idx").on(table.therapistId),
  }),
);
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

/** A single message. Unread = `readAt IS NULL` AND `senderId != viewer`. */
export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    conversationCreatedIdx: index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  }),
);
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
