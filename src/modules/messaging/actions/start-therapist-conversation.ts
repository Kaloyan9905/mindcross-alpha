"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";
import { getCurrentUser } from "@/modules/identity";
import { getOrCreateConversation } from "../lib/get-or-create-conversation";
import type { GetOrCreateConversationResult } from "../lib/get-or-create-conversation";

/**
 * Open (or create) the client↔therapist conversation for a therapist the
 * session user has booked. Resolves the therapist's user id server-side; the
 * core still enforces the booking gate.
 */
export async function startTherapistConversationAction(input: {
  therapistId: string;
}): Promise<GetOrCreateConversationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const db = getDb();
  const [t] = await db
    .select({ userId: therapists.userId })
    .from(therapists)
    .where(eq(therapists.id, input.therapistId))
    .limit(1);
  if (!t?.userId) {
    return { ok: false, error: "This therapist isn't reachable by message yet." };
  }

  return getOrCreateConversation({
    userId: user.id,
    kind: "therapist",
    otherUserId: t.userId,
  });
}
