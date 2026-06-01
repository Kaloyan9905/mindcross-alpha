"use server";

import { getCurrentUser } from "@/modules/identity";
import { createCheckin } from "../lib/create-checkin";
import type { CreateCheckinResult } from "../lib/create-checkin";

/** Record a wellbeing check-in for the signed-in client. */
export async function createCheckinAction(input: {
  mood: number;
  feelings?: string[];
  note?: string;
  sharedWithTherapist?: boolean;
}): Promise<CreateCheckinResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return createCheckin({ clientId: user.id, ...input });
}
