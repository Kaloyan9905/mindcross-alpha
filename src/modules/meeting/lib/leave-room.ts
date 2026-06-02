import { and, eq, gt, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { meetingPresence, meetingSignals } from "../db/schema";
import { getRoomMembership } from "./authorize-room";

const PRESENCE_TTL_MS = 15_000;

/**
 * A participant leaves the room: best-effort `bye` to the current live peers
 * (so they tear down the connection immediately) plus removal of my presence
 * row. Idempotent and never throws on a missing/expired membership.
 */
export async function leaveRoom(input: {
  bookingId: string;
  userId: string;
}): Promise<void> {
  const membership = await getRoomMembership(input.bookingId, input.userId);
  if (!membership) return;

  const db = getDb();
  const liveCutoff = new Date(Date.now() - PRESENCE_TTL_MS);

  const peers = await db
    .select({ userId: meetingPresence.userId })
    .from(meetingPresence)
    .where(
      and(
        eq(meetingPresence.bookingId, input.bookingId),
        gt(meetingPresence.lastSeenAt, liveCutoff),
        ne(meetingPresence.userId, input.userId),
      ),
    );

  if (peers.length > 0) {
    await db.insert(meetingSignals).values(
      peers.map((p) => ({
        bookingId: input.bookingId,
        senderId: input.userId,
        recipientId: p.userId,
        kind: "bye" as const,
        payload: "",
      })),
    );
  }

  await db
    .delete(meetingPresence)
    .where(
      and(
        eq(meetingPresence.bookingId, input.bookingId),
        eq(meetingPresence.userId, input.userId),
      ),
    );
}
