import { and, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { conversations, messages, type ConversationKind } from "../db/schema";

export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  otherUserId: string;
  otherName: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  unreadCount: number;
}

/**
 * The viewer's conversations (both DM and therapist), newest activity first,
 * each with the other party's display name, a last-message preview, and the
 * viewer's unread count. For therapist threads the client sees the therapist's
 * public display name.
 */
export async function listConversations(
  viewerId: string,
): Promise<ConversationSummary[]> {
  const db = getDb();
  const convs = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.userOneId, viewerId),
        eq(conversations.userTwoId, viewerId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));
  if (convs.length === 0) return [];

  const otherIds = convs.map((c) =>
    c.userOneId === viewerId ? c.userTwoId : c.userOneId,
  );
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, otherIds));
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  const therapistIds = convs
    .map((c) => c.therapistId)
    .filter((x): x is string => Boolean(x));
  const therRows = therapistIds.length
    ? await db
        .select({
          id: therapists.id,
          userId: therapists.userId,
          displayName: therapists.displayName,
        })
        .from(therapists)
        .where(inArray(therapists.id, therapistIds))
    : [];
  const therById = new Map(therRows.map((t) => [t.id, t]));

  const result: ConversationSummary[] = [];
  for (const c of convs) {
    const otherId = c.userOneId === viewerId ? c.userTwoId : c.userOneId;
    let otherName = nameById.get(otherId) ?? null;
    if (c.kind === "therapist" && c.therapistId) {
      const t = therById.get(c.therapistId);
      if (t && t.userId === otherId) otherName = t.displayName;
    }
    const [last] = await db
      .select({ body: messages.body })
      .from(messages)
      .where(eq(messages.conversationId, c.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    const [unread] = await db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, c.id),
          ne(messages.senderId, viewerId),
          isNull(messages.readAt),
        ),
      );
    result.push({
      id: c.id,
      kind: c.kind,
      otherUserId: otherId,
      otherName,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: last?.body ?? null,
      unreadCount: unread?.value ?? 0,
    });
  }
  return result;
}
