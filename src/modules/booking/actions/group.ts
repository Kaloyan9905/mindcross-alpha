"use server";

import { getCurrentUser } from "@/modules/identity";
import { inviteToBooking } from "../lib/invite-to-booking";
import { respondToBookingInvite } from "../lib/respond-to-booking-invite";
import { leaveBooking } from "../lib/leave-booking";
import { setGroupCapacity } from "../lib/set-group-capacity";
import { listGuestsForHost } from "../queries/list-booking-participants";
import type { ParticipantRow } from "../queries/list-booking-participants";
import type { GroupResult } from "../lib/group-result";

/** Make a session a group (or resize it). Host = session user. */
export async function setGroupCapacityAction(input: {
  bookingId: string;
  capacity: number;
}): Promise<GroupResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return setGroupCapacity({
    hostUserId: user.id,
    bookingId: input.bookingId,
    capacity: input.capacity,
  });
}

/** Invite a friend to the session the session user hosts. */
export async function inviteToBookingAction(input: {
  bookingId: string;
  inviteeUserId: string;
}): Promise<GroupResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return inviteToBooking({
    hostUserId: user.id,
    bookingId: input.bookingId,
    inviteeUserId: input.inviteeUserId,
  });
}

/** Accept or decline a group invitation addressed to the session user. */
export async function respondToBookingInviteAction(input: {
  bookingId: string;
  decision: "accept" | "decline";
}): Promise<GroupResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return respondToBookingInvite({
    userId: user.id,
    bookingId: input.bookingId,
    decision: input.decision,
  });
}

/** Leave a group session (guest declines; host cancels the whole session). */
export async function leaveBookingAction(input: {
  bookingId: string;
}): Promise<GroupResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return leaveBooking({ userId: user.id, bookingId: input.bookingId });
}

/** The guests on a session the session user hosts (for the invite dialog). */
export async function listGuestsForHostAction(
  bookingId: string,
): Promise<ParticipantRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return (await listGuestsForHost(bookingId, user.id)) ?? [];
}
