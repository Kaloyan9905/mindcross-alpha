/**
 * Integration tests for the messaging module against the live DB. Creates three
 * clients (alice/bob/carol), makes alice+bob friends, and books a confirmed
 * session between alice and a seeded therapist so the therapist-DM gate can be
 * exercised. Cleaned up in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { sendFriendRequest } from "@/modules/friends/lib/send-friend-request";
import { respondToRequest } from "@/modules/friends/lib/respond-to-request";
import { removeFriend } from "@/modules/friends/lib/remove-friend";
import { findFriendship } from "@/modules/friends/lib/friendship-status";
import { getOrCreateConversation } from "@/modules/messaging/lib/get-or-create-conversation";
import { sendMessage } from "@/modules/messaging/lib/send-message";
import { markRead } from "@/modules/messaging/lib/mark-read";
import { listConversations } from "@/modules/messaging/queries/list-conversations";
import { getConversationThread } from "@/modules/messaging/queries/get-conversation-thread";
import { unreadTotal } from "@/modules/messaging/queries/unread-total";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let aliceId: string;
let bobId: string;
let carolId: string;
let therapistUserId: string;
let slotId: string;
let bookingId: string;
let dmConvId: string;

async function registerClient(label: string): Promise<string> {
  const db = getDb();
  const email = `msg-${label}-${Date.now()}-${TAG}@example.com`;
  const reg = await registerAction({
    name: `MsgTest ${label} ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register ${label} failed: ${reg.error}`);
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!row) throw new Error(`no user row for ${label}`);
  return row.id;
}

beforeAll(async () => {
  const db = getDb();
  aliceId = await registerClient("alice");
  bobId = await registerClient("bob");
  carolId = await registerClient("carol");

  // alice + bob become friends
  await sendFriendRequest({ requesterId: aliceId, addresseeId: bobId });
  const fr = await findFriendship(db, aliceId, bobId);
  await respondToRequest({
    userId: bobId,
    friendshipId: fr!.id,
    decision: "accept",
  });

  // An active therapist with a login. Insert our OWN dedicated future slot so
  // this suite never contends with the other suites over a shared seeded slot.
  const [ther] = await db
    .select({ id: therapists.id, userId: therapists.userId })
    .from(therapists)
    .where(and(eq(therapists.status, "active"), isNotNull(therapists.userId)))
    .limit(1);
  if (!ther?.userId) {
    throw new Error("No active therapist with a login in seed data.");
  }
  therapistUserId = ther.userId;

  slotId = uuidv7();
  const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(availabilitySlots).values({
    id: slotId,
    therapistId: ther.id,
    startsAt: start,
    endsAt: new Date(start.getTime() + 60 * 60 * 1000),
    isBooked: false,
  });

  const booked = await createBooking({ clientId: aliceId, slotId });
  if (!booked.ok) throw new Error(`booking setup failed: ${booked.error}`);
  bookingId = booked.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    if (slotId) {
      await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slotId));
    }
    for (const id of [aliceId, bobId, carolId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[messaging.test] cleanup failed:", err);
  }
});

describe("messaging module", () => {
  it("lets friends DM: open, send, unread, mark read", async () => {
    const opened = await getOrCreateConversation({
      userId: aliceId,
      kind: "dm",
      otherUserId: bobId,
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    dmConvId = opened.conversationId;

    const sent = await sendMessage({
      userId: aliceId,
      conversationId: dmConvId,
      body: "hi bob",
    });
    expect(sent.ok).toBe(true);

    const bobInbox = await listConversations(bobId);
    const conv = bobInbox.find((c) => c.id === dmConvId);
    expect(conv?.unreadCount).toBe(1);
    expect(conv?.lastMessagePreview).toBe("hi bob");

    expect((await markRead({ userId: bobId, conversationId: dmConvId })).ok).toBe(
      true,
    );
    expect(await unreadTotal(bobId)).toBe(0);
  });

  it("hides the thread from non-participants", async () => {
    expect(await getConversationThread(dmConvId, carolId)).toBeNull();
    const mine = await getConversationThread(dmConvId, aliceId);
    expect(mine).not.toBeNull();
    expect(mine!.messages.length).toBeGreaterThanOrEqual(1);
  });

  it("refuses a DM to a non-friend", async () => {
    const r = await getOrCreateConversation({
      userId: aliceId,
      kind: "dm",
      otherUserId: carolId,
    });
    expect(r.ok).toBe(false);
  });

  it("allows a therapist DM when a booking exists", async () => {
    const opened = await getOrCreateConversation({
      userId: aliceId,
      kind: "therapist",
      otherUserId: therapistUserId,
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const sent = await sendMessage({
      userId: aliceId,
      conversationId: opened.conversationId,
      body: "hello, looking forward to our session",
    });
    expect(sent.ok).toBe(true);
  });

  it("refuses a therapist DM without a booking", async () => {
    const r = await getOrCreateConversation({
      userId: bobId,
      kind: "therapist",
      otherUserId: therapistUserId,
    });
    expect(r.ok).toBe(false);
  });

  it("stops messaging once the friendship is removed", async () => {
    await removeFriend({ userId: aliceId, otherUserId: bobId });
    const r = await sendMessage({
      userId: aliceId,
      conversationId: dmConvId,
      body: "are you still there?",
    });
    expect(r.ok).toBe(false);
  });
});
