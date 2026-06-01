import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { friendships, userBlocks } from "../db/schema";
import type { FriendResult } from "./result";

const schema = z.object({
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
});
export type BlockUserInput = z.infer<typeof schema>;

/**
 * Block another user. Transactionally records the (one-way) block AND drops any
 * friendship between the two — so blocking immediately ends the connection and
 * stops all future messaging (which re-checks blocks on every send). Idempotent
 * via the unique block index.
 */
export async function blockUser(
  input: { blockerId: string; blockedId: string },
): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { blockerId, blockedId } = parsed.data;

  if (blockerId === blockedId) {
    return { ok: false, error: "You can't block yourself." };
  }

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(userBlocks)
        .values({ blockerId, blockedId })
        .onConflictDoNothing();
      await tx
        .delete(friendships)
        .where(
          or(
            and(
              eq(friendships.requesterId, blockerId),
              eq(friendships.addresseeId, blockedId),
            ),
            and(
              eq(friendships.requesterId, blockedId),
              eq(friendships.addresseeId, blockerId),
            ),
          ),
        );
    });
  } catch (err) {
    console.error("[friends] blockUser failed:", err);
    return { ok: false, error: "We couldn't block this person. Please try again." };
  }
  return { ok: true };
}
