import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { userBlocks } from "../db/schema";
import type { FriendResult } from "./result";

const schema = z.object({
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
});
export type UnblockUserInput = z.infer<typeof schema>;

/**
 * Remove a block the caller previously placed. Does NOT restore the prior
 * friendship — the pair must re-connect explicitly. Idempotent.
 */
export async function unblockUser(
  input: { blockerId: string; blockedId: string },
): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { blockerId, blockedId } = parsed.data;

  const db = getDb();
  await db
    .delete(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId),
      ),
    );
  return { ok: true };
}
