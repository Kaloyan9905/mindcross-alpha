"use server";

import { getCurrentUser } from "@/modules/identity";
import { removeFriend } from "../lib/remove-friend";
import type { FriendResult } from "../lib/result";

/** Remove a friend / withdraw a request between the session user and another. */
export async function removeFriendAction(input: {
  otherUserId: string;
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return removeFriend({ userId: user.id, otherUserId: input.otherUserId });
}
