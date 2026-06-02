import { getDb } from "@/lib/db";
import { meetingMessages } from "../db/schema";
import { getRoomMembership } from "./authorize-room";

const MAX_BODY = 2000;

export type SendChatResult = { ok: true } | { ok: false; error: string };

/**
 * Trusted core: store one in-call chat message. `userId` is already
 * authenticated (the action resolves the session); membership is re-checked so
 * only the room's participants can post. `id` is client-generated (uuidv7) so
 * the sender can de-dupe its own optimistic message — duplicate ids are no-ops.
 */
export async function sendMeetingChat(input: {
  bookingId: string;
  userId: string;
  displayName: string;
  id: string;
  body: string;
}): Promise<SendChatResult> {
  const membership = await getRoomMembership(input.bookingId, input.userId);
  if (!membership) return { ok: false, error: "not-a-member" };

  const body = input.body.trim().slice(0, MAX_BODY);
  if (!body) return { ok: false, error: "empty" };
  if (!input.id) return { ok: false, error: "invalid" };

  await getDb()
    .insert(meetingMessages)
    .values({
      id: input.id,
      bookingId: input.bookingId,
      senderId: input.userId,
      senderName: (input.displayName || "Guest").slice(0, 120),
      body,
    })
    .onConflictDoNothing();

  return { ok: true };
}
