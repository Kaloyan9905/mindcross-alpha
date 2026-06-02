"use server";

import { getCurrentUser } from "@/modules/identity";
import { getRoomMembership } from "../lib/authorize-room";
import { getIceServers, type IceServer } from "../lib/ice";
import { leaveRoom } from "../lib/leave-room";
import {
  syncRoom,
  type OutgoingSignal,
  type SyncRoomResult,
} from "../lib/sync-room";

export type JoinRoomResult =
  | {
      ok: true;
      selfId: string;
      displayName: string;
      role: "host" | "therapist" | "guest";
      iceServers: IceServer[];
    }
  | { ok: false; error: string };

/**
 * Authorize the caller for a booking's room and hand back the bits the browser
 * client needs to start: its own id, display name, role, and ICE servers.
 * Identity is taken from the session — never from the caller.
 */
export async function joinRoomAction(input: {
  bookingId: string;
}): Promise<JoinRoomResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to join this session." };

  const membership = await getRoomMembership(input.bookingId, user.id);
  if (!membership) {
    return { ok: false, error: "You don't have access to this session." };
  }

  return {
    ok: true,
    selfId: user.id,
    displayName: user.name ?? "Guest",
    role: membership.role,
    iceServers: await getIceServers(),
  };
}

/** One signaling tick: heartbeat + send/receive WebRTC blobs. */
export async function syncRoomAction(input: {
  bookingId: string;
  outgoing?: OutgoingSignal[];
}): Promise<{ ok: true; data: SyncRoomResult } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  return syncRoom({
    bookingId: input.bookingId,
    userId: user.id,
    displayName: user.name ?? "Guest",
    outgoing: input.outgoing,
  });
}

/** Leave the room (best-effort `bye` + presence removal). */
export async function leaveRoomAction(input: {
  bookingId: string;
}): Promise<{ ok: true }> {
  const user = await getCurrentUser();
  if (user) {
    await leaveRoom({ bookingId: input.bookingId, userId: user.id });
  }
  return { ok: true };
}
