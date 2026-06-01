import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import {
  availabilitySlots,
  therapists,
} from "@/modules/therapists/db/schema";
import { bookingConfirmation, sendEmail } from "@/modules/notifications";
import { bookings } from "../db/schema";

/**
 * Result of a create-booking attempt. Discriminated on `ok` — expected
 * failures (slot taken, therapist inactive) are returned, never thrown.
 */
export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

/**
 * Core booking input. `clientId` is the AUTHENTICATED client's id — this is a
 * trusted, server-only function and does NOT itself resolve the session. The
 * public entry point is `createBookingAction` (a `"use server"` wrapper that
 * derives `clientId` from the session); never expose this directly to the
 * client.
 */
const createBookingSchema = z.object({
  clientId: z.string().min(1, "A client is required."),
  slotId: z.string().min(1, "A slot is required."),
  clientNotes: z.string().trim().max(2000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Create a booking for `clientId` against the availability slot `slotId`.
 *
 * The slot read + booking insert + `isBooked` flip happen inside a single
 * transaction with a `SELECT ... FOR UPDATE` row lock on the slot, so two
 * concurrent requests cannot both book the same slot.
 *
 * `joinUrl`, `startsAt`, and `endsAt` are SNAPSHOTTED at creation time — a
 * later edit to the therapist profile or slot will not rewrite this booking.
 *
 * The confirmation email is sent AFTER the transaction commits and is wrapped
 * in try/catch — a (mock) email failure must never fail the booking.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking request." };
  }
  const { clientId, slotId, clientNotes } = parsed.data;

  const db = getDb();
  const now = new Date();

  // Phase 1 — transactional write. Returns either a created booking id or a
  // structured failure that we surface below the transaction.
  let outcome: CreateBookingResult;
  try {
    outcome = await db.transaction(async (tx) => {
      // Re-read the slot WITH A ROW LOCK so a concurrent booking blocks here.
      const [slot] = await tx
        .select({
          id: availabilitySlots.id,
          therapistId: availabilitySlots.therapistId,
          startsAt: availabilitySlots.startsAt,
          endsAt: availabilitySlots.endsAt,
          isBooked: availabilitySlots.isBooked,
        })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .for("update")
        .limit(1);

      if (!slot || slot.isBooked) {
        return { ok: false, error: "This slot is no longer available." } as const;
      }

      // Load the therapist owning this slot.
      const [therapist] = await tx
        .select({
          id: therapists.id,
          status: therapists.status,
          sessionUrl: therapists.sessionUrl,
        })
        .from(therapists)
        .where(eq(therapists.id, slot.therapistId))
        .limit(1);

      if (!therapist) {
        return { ok: false, error: "This therapist is no longer available." } as const;
      }
      if (therapist.status !== "active") {
        return {
          ok: false,
          error: "This therapist is not currently accepting bookings.",
        } as const;
      }

      // Insert the booking — snapshot timing + join URL, go straight to
      // 'confirmed' (no payment step at MVP).
      const bookingId = uuidv7();
      await tx.insert(bookings).values({
        id: bookingId,
        clientId,
        therapistId: therapist.id,
        slotId: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        clientNotes: clientNotes ?? null,
        joinUrl: therapist.sessionUrl ?? null,
        createdAt: now,
        updatedAt: now,
      });

      // Flip the denormalized slot flag inside the same transaction.
      await tx
        .update(availabilitySlots)
        .set({ isBooked: true })
        .where(eq(availabilitySlots.id, slot.id));

      return { ok: true, bookingId } as const;
    });
  } catch (err) {
    console.error("[booking] createBooking transaction failed:", err);
    return { ok: false, error: "We could not create your booking. Please try again." };
  }

  if (!outcome.ok) {
    return outcome;
  }

  // Phase 2 — post-commit notification. Failure here must NOT fail the booking.
  try {
    const [client] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, clientId))
      .limit(1);

    const [therapist] = await db
      .select({
        displayName: therapists.displayName,
        startsAt: bookings.startsAt,
        joinUrl: bookings.joinUrl,
      })
      .from(bookings)
      .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
      .where(eq(bookings.id, outcome.bookingId))
      .limit(1);

    if (client && therapist) {
      const email = bookingConfirmation({
        clientName: client.name ?? "",
        therapistName: therapist.displayName,
        startsAt: therapist.startsAt,
        joinUrl: therapist.joinUrl ?? null,
      });
      await sendEmail({ to: client.email, ...email });
    }
  } catch (err) {
    console.error("[booking] confirmation email failed (booking still created):", err);
  }

  return { ok: true, bookingId: outcome.bookingId };
}
