/**
 * meeting — an in-app, peer-to-peer WebRTC video room that replaces the
 * external meeting link. Signaling rides Postgres + short polling (no
 * WebSocket, Vercel-friendly); media is end-to-end-encrypted browser-to-browser
 * and never touches the server.
 *
 * Trusted cores take an authenticated id; the `actions/room.ts` `"use server"`
 * wrappers resolve the session. Client components deep-import those actions.
 */
export {
  getRoomMembership,
  type RoomMembership,
  type RoomRole,
} from "./lib/authorize-room";
export {
  syncRoom,
  type OutgoingSignal,
  type IncomingSignal,
  type RoomPeer,
  type ChatMessage,
  type SyncRoomResult,
} from "./lib/sync-room";
export { sendMeetingChat, type SendChatResult } from "./lib/send-chat";
export { leaveRoom } from "./lib/leave-room";
export { getIceServers, type IceServer } from "./lib/ice";
export {
  meetingPresence,
  meetingSignals,
  meetingMessages,
  type MeetingPresence,
  type MeetingSignal,
  type MeetingSignalKind,
  type MeetingMessage,
} from "./db/schema";
