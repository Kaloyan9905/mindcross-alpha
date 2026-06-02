import { and, desc, eq, gt, lt, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { markBookingStarted } from "@/modules/booking/lib/mark-booking-started";
import {
  meetingMessages,
  meetingPresence,
  meetingSignals,
  type MeetingSignalKind,
} from "../db/schema";
import { getRoomMembership } from "./authorize-room";

/** A peer is "live" if its heartbeat landed within this window. */
const PRESENCE_TTL_MS = 15_000;
/** Rows older than this are pruned (the peer is long gone). */
const PRESENCE_PRUNE_MS = 30_000;
/** Bound abuse: most ticks carry 0–3 signals; SDP is a few KB. */
const MAX_OUTGOING = 50;
const MAX_PAYLOAD = 100_000;

export interface OutgoingSignal {
  recipientId: string;
  kind: MeetingSignalKind;
  payload: string;
}

export interface IncomingSignal {
  senderId: string;
  kind: MeetingSignalKind;
  payload: string;
}

export interface RoomPeer {
  userId: string;
  displayName: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
}

/** Most recent messages returned each tick (the room chat is short-lived). */
const CHAT_LIMIT = 50;

export interface SyncRoomResult {
  peers: RoomPeer[];
  incoming: IncomingSignal[];
  messages: ChatMessage[];
}

/**
 * One signaling tick for a participant: heartbeat presence, enqueue any
 * outgoing WebRTC blobs (only to fellow live members), consume this user's
 * inbox, and return the current live peers. Authorization is re-checked every
 * call — a non-member can neither read nor write a room's signals.
 *
 * Inbox consumption uses `DELETE ... RETURNING` so a signal is delivered
 * exactly once and never re-read on the next poll.
 */
export async function syncRoom(input: {
  bookingId: string;
  userId: string;
  displayName: string;
  outgoing?: OutgoingSignal[];
}): Promise<{ ok: true; data: SyncRoomResult } | { ok: false; error: string }> {
  const membership = await getRoomMembership(input.bookingId, input.userId);
  if (!membership) return { ok: false, error: "not-a-member" };

  // Someone is actively in the room → mark the session started (once). This
  // extends its joinable window and keeps the no-show scan from expiring it.
  await markBookingStarted(input.bookingId);

  const db = getDb();
  const now = new Date();
  const liveCutoff = new Date(now.getTime() - PRESENCE_TTL_MS);
  const pruneCutoff = new Date(now.getTime() - PRESENCE_PRUNE_MS);
  const displayName = (input.displayName || "Guest").slice(0, 120);

  // 1) Heartbeat — upsert my presence row.
  await db
    .insert(meetingPresence)
    .values({
      bookingId: input.bookingId,
      userId: input.userId,
      displayName,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [meetingPresence.bookingId, meetingPresence.userId],
      set: { lastSeenAt: now, displayName },
    });

  // 2) Prune long-stale presence for this booking (peers who closed the tab).
  await db
    .delete(meetingPresence)
    .where(
      and(
        eq(meetingPresence.bookingId, input.bookingId),
        lt(meetingPresence.lastSeenAt, pruneCutoff),
      ),
    );

  // 3) Read live peers (everyone but me).
  const peers = await db
    .select({
      userId: meetingPresence.userId,
      displayName: meetingPresence.displayName,
    })
    .from(meetingPresence)
    .where(
      and(
        eq(meetingPresence.bookingId, input.bookingId),
        gt(meetingPresence.lastSeenAt, liveCutoff),
        ne(meetingPresence.userId, input.userId),
      ),
    );
  const liveIds = new Set(peers.map((p) => p.userId));

  // 4) Enqueue outgoing signals — only to recipients who are live members.
  const outgoing = (input.outgoing ?? []).slice(0, MAX_OUTGOING);
  const rows = outgoing
    .filter((s) => s.recipientId && liveIds.has(s.recipientId))
    .map((s) => ({
      bookingId: input.bookingId,
      senderId: input.userId,
      recipientId: s.recipientId,
      kind: s.kind,
      payload: String(s.payload).slice(0, MAX_PAYLOAD),
    }));
  if (rows.length > 0) {
    await db.insert(meetingSignals).values(rows);
  }

  // 5) Consume my inbox atomically.
  const incomingRows = await db
    .delete(meetingSignals)
    .where(
      and(
        eq(meetingSignals.bookingId, input.bookingId),
        eq(meetingSignals.recipientId, input.userId),
      ),
    )
    .returning({
      senderId: meetingSignals.senderId,
      kind: meetingSignals.kind,
      payload: meetingSignals.payload,
      createdAt: meetingSignals.createdAt,
    });
  incomingRows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // 6) Recent chat (server-backed so it survives a refresh/rejoin).
  const messageRows = await db
    .select({
      id: meetingMessages.id,
      senderId: meetingMessages.senderId,
      senderName: meetingMessages.senderName,
      body: meetingMessages.body,
      createdAt: meetingMessages.createdAt,
    })
    .from(meetingMessages)
    .where(eq(meetingMessages.bookingId, input.bookingId))
    .orderBy(desc(meetingMessages.createdAt))
    .limit(CHAT_LIMIT);
  messageRows.reverse(); // oldest-first for display

  return {
    ok: true,
    data: {
      peers,
      incoming: incomingRows.map((r) => ({
        senderId: r.senderId,
        kind: r.kind,
        payload: r.payload,
      })),
      messages: messageRows,
    },
  };
}
