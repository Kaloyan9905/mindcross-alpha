import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { friendships } from "../db/schema";
import { findFriendship } from "./friendship-status";
import type { FriendResult } from "./result";

const schema = z.object({
  userId: z.string().min(1),
  otherUserId: z.string().min(1),
});
export type RemoveFriendInput = z.infer<typeof schema>;

/**
 * Remove a friendship (or withdraw/decline any pending request) between the
 * caller and another user. Either party may remove. Hard-deletes the row so the
 * pair can re-friend later; messages are kept but future sends are re-blocked at
 * send time. Idempotent.
 */
export async function removeFriend(
  input: { userId: string; otherUserId: string },
): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, otherUserId } = parsed.data;

  const db = getDb();
  const fr = await findFriendship(db, userId, otherUserId);
  if (!fr) return { ok: true };
  if (fr.requesterId !== userId && fr.addresseeId !== userId) {
    return { ok: false, error: "That isn't your connection." };
  }

  await db.delete(friendships).where(eq(friendships.id, fr.id));
  return { ok: true };
}
