import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { friendships } from "../db/schema";

export interface FriendRow {
  userId: string;
  name: string | null;
  friendshipId: string;
  since: Date;
}

/** The viewer's accepted friends (the OTHER party of each accepted row). */
export async function listFriends(viewerId: string): Promise<FriendRow[]> {
  const db = getDb();
  const rels = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, viewerId),
          eq(friendships.addresseeId, viewerId),
        ),
      ),
    );
  if (rels.length === 0) return [];

  const otherIds = rels.map((r) =>
    r.requesterId === viewerId ? r.addresseeId : r.requesterId,
  );
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, otherIds));
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return rels
    .map((r) => {
      const otherId =
        r.requesterId === viewerId ? r.addresseeId : r.requesterId;
      return {
        userId: otherId,
        name: nameById.get(otherId) ?? null,
        friendshipId: r.id,
        since: r.respondedAt ?? r.createdAt,
      };
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}
