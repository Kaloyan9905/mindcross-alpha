"use server";

import { getCurrentUser } from "@/modules/identity";
import { listFriends } from "../queries/list-friends";
import type { FriendRow } from "../queries/list-friends";

/** The session user's accepted friends (for client-side pickers). */
export async function listFriendsAction(): Promise<FriendRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listFriends(user.id);
}
