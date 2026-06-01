"use server";

import { getCurrentUser } from "@/modules/identity";
import { respondToRequest } from "../lib/respond-to-request";
import type { FriendResult } from "../lib/result";

/** Accept or decline a friend request addressed to the session user. */
export async function respondToRequestAction(input: {
  friendshipId: string;
  decision: "accept" | "decline";
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return respondToRequest({
    userId: user.id,
    friendshipId: input.friendshipId,
    decision: input.decision,
  });
}
