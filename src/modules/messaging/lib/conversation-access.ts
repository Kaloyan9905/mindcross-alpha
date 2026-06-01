import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings } from "@/modules/booking/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import {
  areFriends,
  blockExistsEitherWay,
} from "@/modules/friends/lib/friendship-status";
import { conversations, type Conversation } from "../db/schema";

type Database = ReturnType<typeof getDb>;

/** Canonical ordering of two user ids (so the unique index dedupes A,B = B,A). */
export function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * A DM is allowed only between accepted friends with no block in either
 * direction. Re-evaluated on conversation open AND on every send, so unfriend /
 * block immediately stops further messages.
 */
export async function dmAllowed(
  db: Database,
  a: string,
  b: string,
): Promise<boolean> {
  if (await blockExistsEitherWay(db, a, b)) return false;
  return areFriends(db, a, b);
}

/**
 * Authorize a client↔therapist conversation between two user ids. Exactly one
 * must be a therapist; the other (the client) must have a confirmed or
 * completed booking with them. Returns the therapist's id, or null if not
 * allowed.
 */
export async function resolveTherapistConversation(
  db: Database,
  userId: string,
  otherUserId: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: therapists.id, userId: therapists.userId })
    .from(therapists)
    .where(inArray(therapists.userId, [userId, otherUserId]));
  const meTher = rows.find((r) => r.userId === userId);
  const themTher = rows.find((r) => r.userId === otherUserId);

  let therapistId: string;
  let clientUserId: string;
  if (themTher && !meTher) {
    therapistId = themTher.id;
    clientUserId = userId;
  } else if (meTher && !themTher) {
    therapistId = meTher.id;
    clientUserId = otherUserId;
  } else {
    return null; // neither or both are therapists — not a valid pairing
  }

  const [bk] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.clientId, clientUserId),
        eq(bookings.therapistId, therapistId),
        inArray(bookings.status, ["confirmed", "completed"]),
      ),
    )
    .limit(1);
  return bk ? therapistId : null;
}

/** Load a conversation only if `userId` is one of its two participants. */
export async function getConversationForParticipant(
  db: Database,
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.userOneId, userId),
          eq(conversations.userTwoId, userId),
        ),
      ),
    )
    .limit(1);
  return conv ?? null;
}
