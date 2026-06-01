import { z } from "zod";
import { getDb } from "@/lib/db";
import { wellbeingCheckins } from "../db/schema";

export type CreateCheckinResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const schema = z.object({
  clientId: z.string().min(1),
  mood: z.coerce.number().int().min(1).max(5),
  feelings: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  note: z.string().trim().max(2000).optional(),
  sharedWithTherapist: z.boolean().default(false),
});
export type CreateCheckinInput = z.infer<typeof schema>;

/**
 * Record a wellbeing check-in for the authenticated client. `clientId` is
 * trusted (resolved by the action). Feelings are de-duplicated.
 */
export async function createCheckin(input: {
  clientId: string;
  mood: number;
  feelings?: string[];
  note?: string;
  sharedWithTherapist?: boolean;
}): Promise<CreateCheckinResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid check-in.",
    };
  }
  const { clientId, mood, feelings, note, sharedWithTherapist } = parsed.data;

  const db = getDb();
  const [row] = await db
    .insert(wellbeingCheckins)
    .values({
      clientId,
      mood,
      feelings: [...new Set(feelings)],
      note: note && note.length > 0 ? note : null,
      sharedWithTherapist,
    })
    .returning({ id: wellbeingCheckins.id });
  return { ok: true, id: row.id };
}
