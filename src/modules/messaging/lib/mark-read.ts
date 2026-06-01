import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { messages } from "../db/schema";
import { getConversationForParticipant } from "./conversation-access";

export type MarkReadResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  userId: z.string().min(1),
  conversationId: z.string().min(1),
});
export type MarkReadInput = z.infer<typeof schema>;

/**
 * Mark every message the OTHER party sent in this conversation as read. Only a
 * participant may do this. Idempotent.
 */
export async function markRead(input: {
  userId: string;
  conversationId: string;
}): Promise<MarkReadResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, conversationId } = parsed.data;

  const db = getDb();
  const conv = await getConversationForParticipant(db, conversationId, userId);
  if (!conv) return { ok: false, error: "Conversation not found." };

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );
  return { ok: true };
}
