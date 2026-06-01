"use server";

import { getCurrentUser } from "@/modules/identity";
import { sendMessage } from "../lib/send-message";
import type { SendMessageResult } from "../lib/send-message";

/** Post a message to a conversation the session user participates in. */
export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
}): Promise<SendMessageResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return sendMessage({
    userId: user.id,
    conversationId: input.conversationId,
    body: input.body,
  });
}
