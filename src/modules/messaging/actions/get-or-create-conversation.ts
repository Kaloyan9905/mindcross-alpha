"use server";

import { getCurrentUser } from "@/modules/identity";
import { getOrCreateConversation } from "../lib/get-or-create-conversation";
import type { GetOrCreateConversationResult } from "../lib/get-or-create-conversation";
import type { ConversationKind } from "../db/schema";

/** Open (or create) a conversation with another user, gated by relationship. */
export async function getOrCreateConversationAction(input: {
  kind: ConversationKind;
  otherUserId: string;
}): Promise<GetOrCreateConversationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return getOrCreateConversation({
    userId: user.id,
    kind: input.kind,
    otherUserId: input.otherUserId,
  });
}
