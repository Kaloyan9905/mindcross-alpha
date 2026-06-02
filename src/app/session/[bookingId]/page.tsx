import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/modules/identity";
import { getRoomMembership, getIceServers } from "@/modules/meeting";
import { bookings } from "@/modules/booking/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { users } from "@/modules/identity/db/schema";

import { MeetingRoom } from "./meeting-room";

export const metadata: Metadata = {
  title: "Session — MindCross",
  // A private 1:1 room: keep it out of search engines.
  robots: { index: false, follow: false },
};

/**
 * The in-app video room for a booking. Access is gated to the booking's
 * participants (client, therapist, accepted group guests); everyone else gets a
 * 404 rather than a hint that the session exists.
 */
export default async function SessionPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/session/${bookingId}`)}`);
  }

  const membership = await getRoomMembership(bookingId, user.id);
  if (!membership) notFound();

  // Header context — who you're meeting with.
  const db = getDb();
  const [info] = await db
    .select({
      therapistName: therapists.displayName,
      clientName: users.name,
    })
    .from(bookings)
    .innerJoin(therapists, eq(therapists.id, bookings.therapistId))
    .innerJoin(users, eq(users.id, bookings.clientId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  const otherPartyName =
    membership.role === "therapist"
      ? (info?.clientName ?? "Your client")
      : (info?.therapistName ?? "Your therapist");

  const iceServers = await getIceServers();

  return (
    <MeetingRoom
      bookingId={bookingId}
      selfId={user.id}
      displayName={user.name ?? "Guest"}
      role={membership.role}
      iceServers={iceServers}
      otherPartyName={otherPartyName}
    />
  );
}
