import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { conversations, messages } from "../db/schema";
import type { ConversationSummary } from "./list-conversations";

/**
 * The therapist inbox: all `kind="therapist"` conversations for this therapist,
 * newest first, with the client's name, a preview, and the therapist's unread
 * count. `therapistId` is the therapist row id (resolved by the console via
 * `getTherapistForCurrentUser`).
 */
export async function listTherapistConversations(
  therapistId: string,
): Promise<ConversationSummary[]> {
  const db = getDb();
  const [ther] = await db
    .select({ userId: therapists.userId })
    .from(therapists)
    .where(eq(therapists.id, therapistId))
    .limit(1);
  const therapistUserId = ther?.userId ?? null;
  if (!therapistUserId) return [];

  const convs = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.kind, "therapist"),
        eq(conversations.therapistId, therapistId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));
  if (convs.length === 0) return [];

  const clientIds = convs.map((c) =>
    c.userOneId === therapistUserId ? c.userTwoId : c.userOneId,
  );
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, clientIds));
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  const result: ConversationSummary[] = [];
  for (const c of convs) {
    const clientId =
      c.userOneId === therapistUserId ? c.userTwoId : c.userOneId;
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
          ne(messages.senderId, therapistUserId),
          isNull(messages.readAt),
        ),
      );
    result.push({
      id: c.id,
      kind: c.kind,
      otherUserId: clientId,
      otherName: nameById.get(clientId) ?? null,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: last?.body ?? null,
      unreadCount: unread?.value ?? 0,
    });
  }
  return result;
}
