import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { conversations, messages } from "../db/schema";
import {
  dmAllowed,
  getConversationForParticipant,
  resolveTherapistConversation,
} from "./conversation-access";

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

const schema = z.object({
  userId: z.string().min(1),
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Message can't be empty.").max(4000),
});
export type SendMessageInput = z.infer<typeof schema>;

/**
 * Post a message to a conversation the caller participates in. The relationship
 * gate (friendship for DMs, booking for therapist threads) is RE-CHECKED on
 * every send — so unfriending, blocking, or a cancelled booking stops further
 * messages even in an already-open thread.
 */
export async function sendMessage(input: {
  userId: string;
  conversationId: string;
  body: string;
}): Promise<SendMessageResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }
  const { userId, conversationId, body } = parsed.data;

  const db = getDb();
  const conv = await getConversationForParticipant(db, conversationId, userId);
  if (!conv) return { ok: false, error: "Conversation not found." };

  const otherId =
    conv.userOneId === userId ? conv.userTwoId : conv.userOneId;
  if (conv.kind === "dm") {
    if (!(await dmAllowed(db, userId, otherId))) {
      return { ok: false, error: "You can no longer message this person." };
    }
  } else {
    const therapistId = await resolveTherapistConversation(db, userId, otherId);
    if (!therapistId) {
      return { ok: false, error: "You can no longer message in this conversation." };
    }
  }

  const now = new Date();
  const [msg] = await db
    .insert(messages)
    .values({ conversationId, senderId: userId, body })
    .returning({ id: messages.id });
  await db
    .update(conversations)
    .set({ lastMessageAt: now })
    .where(eq(conversations.id, conversationId));

  return { ok: true, messageId: msg.id };
}
