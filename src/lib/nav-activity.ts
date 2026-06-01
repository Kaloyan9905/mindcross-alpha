import { listIncomingRequests } from "@/modules/friends";
import { unreadTotal } from "@/modules/messaging";

export interface NavActivityCounts {
  friendRequests: number;
  unreadMessages: number;
}

/**
 * Unseen activity for the navbar account menu (pending friend requests + unread
 * messages). Client-only — the friend graph and DMs don't apply to therapists
 * or staff, whose own messages live in their console. Best-effort: never throws.
 */
export async function getNavActivity(
  user: { id: string; role?: string | null } | null,
): Promise<NavActivityCounts> {
  const empty = { friendRequests: 0, unreadMessages: 0 };
  if (!user) return empty;
  if (user.role && user.role !== "client") return empty;
  try {
    const [friendRequests, unreadMessages] = await Promise.all([
      listIncomingRequests(user.id).then((r) => r.length),
      unreadTotal(user.id),
    ]);
    return { friendRequests, unreadMessages };
  } catch {
    return empty;
  }
}
