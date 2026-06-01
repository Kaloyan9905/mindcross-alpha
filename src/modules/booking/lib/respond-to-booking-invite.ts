import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { bookingParticipants, bookings } from "../db/schema";
import type { GroupResult } from "./group-result";

const schema = z.object({
  userId: z.string().min(1),
  bookingId: z.string().min(1),
  decision: z.enum(["accept", "decline"]),
});
export type RespondToBookingInviteInput = z.infer<typeof schema>;

/**
 * Accept or decline a group-session invitation. Only the invited user. Accept
 * recounts accepted seats UNDER A ROW LOCK on the booking, so two friends
 * racing for the last seat serialize and the loser is told the session is full.
 * Idempotent for an already-accepted invite.
 */
export async function respondToBookingInvite(input: {
  userId: string;
  bookingId: string;
  decision: "accept" | "decline";
}): Promise<GroupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, bookingId, decision } = parsed.data;

  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const [bk] = await tx
        .select({
          id: bookings.id,
          status: bookings.status,
          startsAt: bookings.startsAt,
          groupCapacity: bookings.groupCapacity,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update")
        .limit(1);
      if (!bk) return { ok: false, error: "Session not found." } as const;

      const [part] = await tx
        .select()
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, bookingId),
            eq(bookingParticipants.clientId, userId),
          ),
        )
        .limit(1);
      if (!part) {
        return { ok: false, error: "You weren't invited to this session." } as const;
      }

      if (decision === "decline") {
        if (part.status !== "declined") {
          await tx
            .update(bookingParticipants)
            .set({ status: "declined", respondedAt: new Date() })
            .where(eq(bookingParticipants.id, part.id));
        }
        return { ok: true } as const;
      }

      // accept
      if (part.status === "accepted") return { ok: true } as const;
      if (bk.status !== "confirmed") {
        return { ok: false, error: "This session is no longer available." } as const;
      }
      if (bk.startsAt.getTime() <= Date.now()) {
        return { ok: false, error: "This session has already started." } as const;
      }

      const [acc] = await tx
        .select({ value: count() })
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, bookingId),
            eq(bookingParticipants.status, "accepted"),
          ),
        );
      if (1 + (acc?.value ?? 0) >= bk.groupCapacity) {
        return { ok: false, error: "This session is now full." } as const;
      }

      await tx
        .update(bookingParticipants)
        .set({ status: "accepted", respondedAt: new Date() })
        .where(eq(bookingParticipants.id, part.id));
      return { ok: true } as const;
    });
  } catch (err) {
    console.error("[booking] respondToBookingInvite failed:", err);
    return { ok: false, error: "We couldn't update your invite. Please try again." };
  }
}
