import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { friendships } from "../db/schema";
import { blockExistsEitherWay } from "./friendship-status";
import type { FriendResult } from "./result";

const schema = z.object({
  userId: z.string().min(1),
  friendshipId: z.string().min(1),
  decision: z.enum(["accept", "decline"]),
});
export type RespondToRequestInput = z.infer<typeof schema>;

/**
 * Accept or decline a pending friend request. Only the ADDRESSEE may respond.
 * Accepting re-checks that no block has appeared in the meantime (accept-after-
 * block race). Idempotent if already accepted.
 */
export async function respondToRequest(
  input: { userId: string; friendshipId: string; decision: "accept" | "decline" },
): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, friendshipId, decision } = parsed.data;

  const db = getDb();
  const [fr] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);

  if (!fr) return { ok: false, error: "Request not found." };
  if (fr.addresseeId !== userId) {
    return { ok: false, error: "You can't respond to this request." };
  }
  if (fr.status === "accepted") return { ok: true };
  if (fr.status !== "pending") {
    return { ok: false, error: "This request is no longer pending." };
  }

  if (decision === "accept") {
    if (await blockExistsEitherWay(db, fr.requesterId, fr.addresseeId)) {
      return { ok: false, error: "We couldn't accept that request." };
    }
    await db
      .update(friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(friendships.id, fr.id));
  } else {
    await db
      .update(friendships)
      .set({ status: "declined", respondedAt: new Date() })
      .where(eq(friendships.id, fr.id));
  }
  return { ok: true };
}
