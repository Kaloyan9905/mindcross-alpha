"use server";

import { getCurrentUser } from "@/modules/identity";
import { sendFriendRequest } from "../lib/send-friend-request";
import type { FriendResult } from "../lib/result";

/** Send a friend request to another client. Requester = the session user. */
export async function sendFriendRequestAction(input: {
  addresseeId: string;
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return sendFriendRequest({
    requesterId: user.id,
    addresseeId: input.addresseeId,
  });
}
