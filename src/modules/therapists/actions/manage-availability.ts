"use server";

import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getTherapistForCurrentUser } from "../queries/get-therapist-for-user";
import { availabilitySlots } from "../db/schema";

/**
 * Result of an availability mutation. On success an add may report how many
 * slots were created and how many weeks were skipped (a recurring add skips
 * weeks that would clash with an existing time).
 */
export type AvailabilityResult =
  | { ok: true; added?: number; skipped?: number }
  | { ok: false; error: string };

const MAX_SLOT_HOURS = 8;
/** Upper bound on "repeat weekly for N weeks" so one submit can't flood the table. */
const MAX_REPEAT_WEEKS = 12;

const slotSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "The end time must be after the start time.",
    path: ["endsAt"],
  })
  .refine(
    (d) => d.endsAt.getTime() - d.startsAt.getTime() <= MAX_SLOT_HOURS * 3600_000,
    { message: `A slot can be at most ${MAX_SLOT_HOURS} hours long.`, path: ["endsAt"] },
  );

const addSlotsSchema = z.object({
  // One or more occurrences. The FIRST is the base slot the therapist picked;
  // the rest are its weekly repeats. Recurrence is expanded on the CLIENT (in
  // the user's own timezone, so wall-clock time is preserved across DST) and
  // sent here as concrete instants — the server only validates and inserts.
  slots: z.array(slotSchema).min(1).max(MAX_REPEAT_WEEKS),
});

/** One concrete occurrence to add, as ISO strings. */
export interface AddAvailabilitySlotInput {
  slots: { startsAt: string; endsAt: string }[];
}

/** Two half-open intervals [aS,aE) and [bS,bE) overlap. */
function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

/**
 * Therapist Server Action: add one or more availability slots to the signed-in
 * therapist's OWN calendar.
 *
 * - Rejects past start times and slots that overlap a time the therapist
 *   already has (so a client can never see two slots that collide).
 * - For a recurring add the client sends every weekly occurrence; the base
 *   (first) occurrence clashing is a hard error, while later weeks that clash
 *   or fall in the past are silently skipped. The result reports how many were
 *   `added` and `skipped`.
 */
export async function addAvailabilitySlotAction(
  input: AddAvailabilitySlotInput,
): Promise<AvailabilityResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) return { ok: false, error: "You must be signed in as a therapist." };

  const parsed = addSlotsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid slot." };
  }
  const candidates = parsed.data.slots;

  // The base occurrence must be in the future; later weeks are guaranteed
  // later, but a stale form could still send a past base.
  if (candidates[0].startsAt.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a start time in the future." };
  }

  try {
    const db = getDb();

    // Load the therapist's existing future slots once, then check overlaps in
    // memory (a therapist has at most a few hundred future slots).
    const existing = await db
      .select({
        startsAt: availabilitySlots.startsAt,
        endsAt: availabilitySlots.endsAt,
      })
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.therapistId, me.id),
          gt(availabilitySlots.endsAt, new Date()),
        ),
      );
    const existingIntervals = existing.map((s) => [
      s.startsAt.getTime(),
      s.endsAt.getTime(),
    ]);

    const now = Date.now();
    const toInsert = candidates.filter((c) => {
      const cS = c.startsAt.getTime();
      const cE = c.endsAt.getTime();
      if (cS <= now) return false; // skip any past occurrence
      return !existingIntervals.some(([eS, eE]) => overlaps(cS, cE, eS, eE));
    });

    // The base (first) slot clashing is a hard error — the therapist asked for
    // exactly that time. Later weeks clashing are just skipped.
    if (toInsert.length === 0 || toInsert[0] !== candidates[0]) {
      return {
        ok: false,
        error: "That time overlaps a slot you already have. Pick another time.",
      };
    }

    const createdAt = new Date();
    await db.insert(availabilitySlots).values(
      toInsert.map((c) => ({
        therapistId: me.id,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        isBooked: false,
        createdAt,
      })),
    );

    return {
      ok: true,
      added: toInsert.length,
      skipped: candidates.length - toInsert.length,
    };
  } catch (err) {
    console.error("addAvailabilitySlotAction failed:", err);
    return { ok: false, error: "Could not add the slot. Please try again." };
  }
}

const removeSlotSchema = z.object({ slotId: z.string().min(1) });
export type RemoveAvailabilitySlotInput = z.infer<typeof removeSlotSchema>;

/**
 * Therapist Server Action: remove one of the signed-in therapist's OWN slots.
 * A slot that is already booked cannot be removed (cancel the booking first).
 */
export async function removeAvailabilitySlotAction(
  input: RemoveAvailabilitySlotInput,
): Promise<AvailabilityResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) return { ok: false, error: "You must be signed in as a therapist." };

  const parsed = removeSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid slot." };

  try {
    const db = getDb();
    // Scope to the caller's own therapist id AND require the slot be unbooked.
    const [slot] = await db
      .select({ id: availabilitySlots.id, isBooked: availabilitySlots.isBooked })
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.id, parsed.data.slotId),
          eq(availabilitySlots.therapistId, me.id),
        ),
      )
      .limit(1);

    if (!slot) return { ok: false, error: "Slot not found." };
    if (slot.isBooked) {
      return {
        ok: false,
        error: "This slot is booked. Cancel the booking before removing it.",
      };
    }

    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slot.id));
    return { ok: true };
  } catch (err) {
    console.error("removeAvailabilitySlotAction failed:", err);
    return { ok: false, error: "Could not remove the slot. Please try again." };
  }
}
