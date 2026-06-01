"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getAdminUser } from "@/modules/admin";
import { therapists } from "@/modules/therapists/db/schema";

export type SetTherapistVerifiedResult =
  | { ok: true; verified: boolean }
  | { ok: false; error: string };

const schema = z.object({
  therapistId: z.string().min(1, "therapistId is required"),
  verified: z.boolean(),
});

export type SetTherapistVerifiedInput = z.infer<typeof schema>;

/**
 * Admin Server Action: toggle a therapist's "Verified" trust badge. Self-
 * authorizing via `getAdminUser()`.
 */
export async function setTherapistVerifiedAction(
  input: SetTherapistVerifiedInput,
): Promise<SetTherapistVerifiedResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "You are not authorized to verify therapists." };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { therapistId, verified } = parsed.data;

  try {
    const db = getDb();
    const updated = await db
      .update(therapists)
      .set({ verified, updatedAt: new Date() })
      .where(eq(therapists.id, therapistId))
      .returning({ id: therapists.id });

    if (updated.length === 0) return { ok: false, error: "Therapist not found." };
    return { ok: true, verified };
  } catch (err) {
    console.error("setTherapistVerifiedAction failed:", err);
    return { ok: false, error: "Could not update verification. Please try again." };
  }
}
