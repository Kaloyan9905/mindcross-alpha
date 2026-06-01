import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  areFriends,
  blockExistsEitherWay,
} from "@/modules/friends/lib/friendship-status";
import { users } from "@/modules/identity/db/schema";
import { bookingParticipants, bookings } from "../db/schema";
import type { GroupResult } from "./group-result";

const schema = z.object({
  hostUserId: z.string().min(1),
  bookingId: z.string().min(1),
  inviteeUserId: z.string().min(1),
});
export type InviteToBookingInput = z.infer<typeof schema>;

/**
 * Invite a friend to co-join the host's session. Host-only; the invitee must be
 * an accepted friend (not blocked) and a client. A seat is RESERVED at invite
 * time (invited + accepted count toward capacity) so a vulnerable guest never
 * accepts only to find it full. The capacity check + write run under a row lock
 * on the booking. Idempotent for someone already invited/accepted.
 */
export async function inviteToBooking(input: {
  hostUserId: string;
  bookingId: string;
  inviteeUserId: string;
}): Promise<GroupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { hostUserId, bookingId, inviteeUserId } = parsed.data;

  if (hostUserId === inviteeUserId) {
    return { ok: false, error: "You're already the host." };
  }

  const db = getDb();

  // Relationship pre-checks (no booking lock needed for these).
  if (await blockExistsEitherWay(db, hostUserId, inviteeUserId)) {
    return { ok: false, error: "You can't invite this person." };
  }
  if (!(await areFriends(db, hostUserId, inviteeUserId))) {
    return { ok: false, error: "You can only invite your friends." };
  }
  const [invitee] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, inviteeUserId))
    .limit(1);
  if (!invitee || invitee.role !== "client") {
    return { ok: false, error: "We couldn't find that person." };
  }

  try {
    return await db.transaction(async (tx) => {
      const [bk] = await tx
        .select({
          id: bookings.id,
          clientId: bookings.clientId,
          status: bookings.status,
          startsAt: bookings.startsAt,
          groupCapacity: bookings.groupCapacity,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update")
        .limit(1);

      if (!bk) return { ok: false, error: "Session not found." } as const;
      if (bk.clientId !== hostUserId) {
        return { ok: false, error: "Only the host can invite people." } as const;
      }
      if (bk.status !== "confirmed") {
        return { ok: false, error: "This session isn't active." } as const;
      }
      if (bk.startsAt.getTime() <= Date.now()) {
        return { ok: false, error: "This session has already started." } as const;
      }
      if (bk.groupCapacity <= 1) {
        return {
          ok: false,
          error: "Make this a group session before inviting people.",
        } as const;
      }

      const [existing] = await tx
        .select()
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, bookingId),
            eq(bookingParticipants.clientId, inviteeUserId),
          ),
        )
        .limit(1);
      if (existing && existing.status !== "declined") {
        return { ok: true } as const; // already invited/accepted
      }

      // Reserve a seat: occupied = host (1) + invited + accepted guests.
      const [reserved] = await tx
        .select({ value: count() })
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, bookingId),
            inArray(bookingParticipants.status, ["invited", "accepted"]),
          ),
        );
      if (1 + (reserved?.value ?? 0) >= bk.groupCapacity) {
        return { ok: false, error: "This session is full." } as const;
      }

      if (existing) {
        await tx
          .update(bookingParticipants)
          .set({
            status: "invited",
            role: "guest",
            invitedAt: new Date(),
            respondedAt: null,
          })
          .where(eq(bookingParticipants.id, existing.id));
      } else {
        await tx.insert(bookingParticipants).values({
          bookingId,
          clientId: inviteeUserId,
          role: "guest",
          status: "invited",
        });
      }
      return { ok: true } as const;
    });
  } catch (err) {
    console.error("[booking] inviteToBooking failed:", err);
    return { ok: false, error: "We couldn't send the invite. Please try again." };
  }
}
