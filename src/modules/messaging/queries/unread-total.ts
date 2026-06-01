import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { conversations, messages } from "../db/schema";

/**
 * Total unread messages across every conversation the user participates in
 * (messages not sent by them and not yet read). Used for the navbar / sub-nav
 * badge. Works for a therapist viewer too — pass the therapist's user id.
 */
export async function unreadTotal(viewerId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        isNull(messages.readAt),
        ne(messages.senderId, viewerId),
        or(
          eq(conversations.userOneId, viewerId),
          eq(conversations.userTwoId, viewerId),
        ),
      ),
    );
  return row?.value ?? 0;
}
