import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { messages, type ConversationKind } from "../db/schema";
import { getConversationForParticipant } from "../lib/conversation-access";

export interface ThreadMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
  mine: boolean;
}

export interface ConversationThread {
  conversationId: string;
  kind: ConversationKind;
  otherUserId: string;
  otherName: string | null;
  messages: ThreadMessage[];
}

/**
 * Full thread for a conversation, but ONLY if `viewerId` is a participant —
 * returns null otherwise (the page treats that as not-found). `mine` marks the
 * viewer's own messages for right/left alignment.
 */
export async function getConversationThread(
  conversationId: string,
  viewerId: string,
): Promise<ConversationThread | null> {
  const db = getDb();
  const conv = await getConversationForParticipant(db, conversationId, viewerId);
  if (!conv) return null;

  const otherId =
    conv.userOneId === viewerId ? conv.userTwoId : conv.userOneId;

  const [u] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, otherId))
    .limit(1);
  let otherName = u?.name ?? null;
  if (conv.kind === "therapist" && conv.therapistId) {
    const [t] = await db
      .select({ userId: therapists.userId, displayName: therapists.displayName })
      .from(therapists)
      .where(eq(therapists.id, conv.therapistId))
      .limit(1);
    if (t && t.userId === otherId) otherName = t.displayName;
  }

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return {
    conversationId,
    kind: conv.kind,
    otherUserId: otherId,
    otherName,
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
      mine: m.senderId === viewerId,
    })),
  };
}
