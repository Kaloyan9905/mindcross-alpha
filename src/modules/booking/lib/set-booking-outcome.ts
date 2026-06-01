import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { bookings } from "../db/schema";

export type SetBookingOutcomeResult = { ok: true } | { ok: false; error: string };

/**
 * Core: `therapistId` is the AUTHENTICATED therapist's id — trusted, server-only.
 * The public entry is `setBookingOutcomeAction`, which resolves the therapist
 * from the session and calls this.
 */
const setBookingOutcomeSchema = z.object({
  therapistId: z.string().min(1),
  bookingId: z.string().min(1, "A booking is required."),
  outcome: z.enum(["completed", "no_show"]),
  therapistNotes: z.string().trim().max(2000).optional(),
});

export type SetBookingOutcomeInput = z.infer<typeof setBookingOutcomeSchema>;

/**
 * Record the outcome of a session: mark it `completed` or `no_show`, optionally
 * attaching private therapist notes. Only the therapist who owns the booking
 * may do this; a cancelled booking cannot be marked.
 */
export async function setBookingOutcome(
  input: SetBookingOutcomeInput,
): Promise<SetBookingOutcomeResult> {
  const parsed = setBookingOutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { therapistId, bookingId, outcome, therapistNotes } = parsed.data;

  try {
    const db = getDb();
    const [booking] = await db
      .select({
        id: bookings.id,
        therapistId: bookings.therapistId,
        status: bookings.status,
        therapistNotes: bookings.therapistNotes,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.therapistId !== therapistId) {
      return { ok: false, error: "Booking not found." };
    }
    if (booking.status === "cancelled") {
      return { ok: false, error: "This booking was cancelled." };
    }

    await db
      .update(bookings)
      .set({
        status: outcome,
        // Keep existing notes when none are supplied.
        therapistNotes: therapistNotes ?? booking.therapistNotes,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    return { ok: true };
  } catch (err) {
    console.error("setBookingOutcome failed:", err);
    return { ok: false, error: "Could not update the session. Please try again." };
  }
}
