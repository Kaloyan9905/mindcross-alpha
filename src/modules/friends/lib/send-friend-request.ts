import { and, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { friendships } from "../db/schema";
import { blockExistsEitherWay, findFriendship } from "./friendship-status";
import type { FriendResult } from "./result";

/** Soft cap on simultaneously pending outbound requests (anti-spam). */
const MAX_PENDING_OUTBOUND = 25;

const schema = z.object({
  requesterId: z.string().min(1),
  addresseeId: z.string().min(1),
});
export type SendFriendRequestInput = z.infer<typeof schema>;

/**
 * Send a friend request. `requesterId` is the AUTHENTICATED user (resolved by
 * the action). Both parties must be clients; therapists/admins are never part
 * of the friend graph. Re-checks blocks and any existing relationship.
 *
 * Idempotent for already-friends / already-sent. A reverse pending request
 * ("they asked you first") is reported so the UI can point at the inbox. A
 * previously declined pair is revived as a fresh pending request.
 */
export async function sendFriendRequest(
  input: { requesterId: string; addresseeId: string },
): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { requesterId, addresseeId } = parsed.data;

  if (requesterId === addresseeId) {
    return { ok: false, error: "You can't add yourself." };
  }

  const db = getDb();

  // Both parties must be clients. Load both in one query.
  const rows = await db
    .select({
      id: users.id,
      role: users.role,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(or(eq(users.id, requesterId), eq(users.id, addresseeId)));
  const me = rows.find((r) => r.id === requesterId);
  const them = rows.find((r) => r.id === addresseeId);

  // Generic "not found" for non-client targets — don't reveal that an id maps
  // to a therapist/admin (enumeration guard).
  if (!them || them.role !== "client") {
    return { ok: false, error: "We couldn't find that person." };
  }
  if (!me || me.role !== "client") {
    return { ok: false, error: "Only client accounts can add friends." };
  }
  if (!me.emailVerified) {
    return {
      ok: false,
      error: "Please verify your email before adding friends.",
    };
  }

  if (await blockExistsEitherWay(db, requesterId, addresseeId)) {
    return { ok: false, error: "We couldn't send that request." };
  }

  const existing = await findFriendship(db, requesterId, addresseeId);
  if (existing) {
    if (existing.status === "accepted") return { ok: true };
    if (existing.status === "pending") {
      if (existing.requesterId === requesterId) return { ok: true };
      return {
        ok: false,
        error:
          "This person already sent you a request — accept it from your requests instead.",
      };
    }
    // Previously declined → revive as a fresh request from this requester.
    await db
      .update(friendships)
      .set({
        requesterId,
        addresseeId,
        status: "pending",
        createdAt: new Date(),
        respondedAt: null,
      })
      .where(eq(friendships.id, existing.id));
    return { ok: true };
  }

  const [pending] = await db
    .select({ value: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, requesterId),
        eq(friendships.status, "pending"),
      ),
    );
  if ((pending?.value ?? 0) >= MAX_PENDING_OUTBOUND) {
    return {
      ok: false,
      error: "You have too many pending requests. Wait for some replies first.",
    };
  }

  try {
    await db.insert(friendships).values({ requesterId, addresseeId });
  } catch {
    // Lost a race on the unordered-pair unique index — treat as already-sent.
    return { ok: true };
  }
  return { ok: true };
}
