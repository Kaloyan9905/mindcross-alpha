import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { friendships } from "../db/schema";

export interface FriendRequestRow {
  friendshipId: string;
  userId: string;
  name: string | null;
  createdAt: Date;
}

/** Attach display names to a set of pending friendship rows. */
async function withNames(
  rows: { id: string; otherId: string; createdAt: Date }[],
): Promise<FriendRequestRow[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      inArray(
        users.id,
        rows.map((r) => r.otherId),
      ),
    );
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    friendshipId: r.id,
    userId: r.otherId,
    name: nameById.get(r.otherId) ?? null,
    createdAt: r.createdAt,
  }));
}

/** Pending requests sent TO the viewer (they can accept/decline these). */
export async function listIncomingRequests(
  viewerId: string,
): Promise<FriendRequestRow[]> {
  const db = getDb();
  const rels = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.addresseeId, viewerId),
        eq(friendships.status, "pending"),
      ),
    )
    .orderBy(desc(friendships.createdAt));
  return withNames(
    rels.map((r) => ({
      id: r.id,
      otherId: r.requesterId,
      createdAt: r.createdAt,
    })),
  );
}

/** Pending requests the viewer has SENT (awaiting the other person). */
export async function listOutgoingRequests(
  viewerId: string,
): Promise<FriendRequestRow[]> {
  const db = getDb();
  const rels = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, viewerId),
        eq(friendships.status, "pending"),
      ),
    )
    .orderBy(desc(friendships.createdAt));
  return withNames(
    rels.map((r) => ({
      id: r.id,
      otherId: r.addresseeId,
      createdAt: r.createdAt,
    })),
  );
}
