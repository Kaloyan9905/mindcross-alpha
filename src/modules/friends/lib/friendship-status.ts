import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { friendships, userBlocks, type Friendship } from "../db/schema";

/** The Drizzle database handle type (also satisfied by a transaction). */
type Database = ReturnType<typeof getDb>;

/**
 * Find the single friendship row for an unordered pair (either direction), or
 * null. The unordered-pair unique index guarantees there is at most one.
 */
export async function findFriendship(
  db: Database,
  a: string,
  b: string,
): Promise<Friendship | null> {
  const [row] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
        and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** True when an accepted friendship exists between the two users. */
export async function areFriends(
  db: Database,
  a: string,
  b: string,
): Promise<boolean> {
  const row = await findFriendship(db, a, b);
  return row?.status === "accepted";
}

/** True when EITHER user has blocked the other (blocks are one-way). */
export async function blockExistsEitherWay(
  db: Database,
  a: string,
  b: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
        and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
      ),
    )
    .limit(1);
  return Boolean(row);
}
