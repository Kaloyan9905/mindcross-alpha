"use server";

import { getCurrentUser } from "@/modules/identity";
import { markRead } from "../lib/mark-read";
import type { MarkReadResult } from "../lib/mark-read";

/** Mark the other party's messages in a conversation as read. */
export async function markReadAction(input: {
  conversationId: string;
}): Promise<MarkReadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return markRead({ userId: user.id, conversationId: input.conversationId });
}
