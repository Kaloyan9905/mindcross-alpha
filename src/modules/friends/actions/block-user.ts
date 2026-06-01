"use server";

import { getCurrentUser } from "@/modules/identity";
import { blockUser } from "../lib/block-user";
import { unblockUser } from "../lib/unblock-user";
import type { FriendResult } from "../lib/result";

/** Block another user (the session user is the blocker). */
export async function blockUserAction(input: {
  blockedId: string;
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return blockUser({ blockerId: user.id, blockedId: input.blockedId });
}

/** Remove a block the session user previously placed. */
export async function unblockUserAction(input: {
  blockedId: string;
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return unblockUser({ blockerId: user.id, blockedId: input.blockedId });
}
