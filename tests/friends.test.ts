/**
 * Integration tests for the friends module against the live DB. Creates two
 * fresh test clients (+ uses a seeded therapist for the non-client guard) and
 * cleans them up in afterAll — deleting the users cascades friendships, blocks,
 * and reports.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { sendFriendRequest } from "@/modules/friends/lib/send-friend-request";
import { respondToRequest } from "@/modules/friends/lib/respond-to-request";
import { blockUser } from "@/modules/friends/lib/block-user";
import { reportUser } from "@/modules/friends/lib/report-user";
import {
  areFriends,
  findFriendship,
} from "@/modules/friends/lib/friendship-status";
import { searchClients } from "@/modules/friends/queries/search-clients";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let aliceId: string;
let bobId: string;
let therapistUserId: string | null = null;

async function registerClient(label: string): Promise<string> {
  const db = getDb();
  const email = `friends-${label}-${Date.now()}-${TAG}@example.com`;
  const reg = await registerAction({
    name: `FriendsTest ${label} ${TAG}`,
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
  const [therapist] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "therapist"))
    .limit(1);
  therapistUserId = therapist?.id ?? null;
});

afterAll(async () => {
  try {
    const db = getDb();
    for (const id of [aliceId, bobId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[friends.test] cleanup failed:", err);
  }
});

describe("friends module", () => {
  it("rejects a request to yourself", async () => {
    const r = await sendFriendRequest({ requesterId: aliceId, addresseeId: aliceId });
    expect(r.ok).toBe(false);
  });

  it("rejects a request to a non-client (therapist) without revealing them", async () => {
    if (!therapistUserId) return; // no seeded therapist — skip
    const r = await sendFriendRequest({
      requesterId: aliceId,
      addresseeId: therapistUserId,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/couldn't find/i);
  });

  it("finds another client by name in search", async () => {
    const results = await searchClients(aliceId, `FriendsTest bob ${TAG}`);
    expect(results.some((r) => r.id === bobId && r.status === "none")).toBe(true);
  });

  it("sends a request, reflected in search as request_sent", async () => {
    const r = await sendFriendRequest({ requesterId: aliceId, addresseeId: bobId });
    expect(r.ok).toBe(true);
    const results = await searchClients(aliceId, `FriendsTest bob ${TAG}`);
    expect(results.find((x) => x.id === bobId)?.status).toBe("request_sent");
  });

  it("blocks the reverse duplicate request with guidance", async () => {
    const r = await sendFriendRequest({ requesterId: bobId, addresseeId: aliceId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/accept it/i);
  });

  it("accepting the request makes them friends", async () => {
    const db = getDb();
    const fr = await findFriendship(db, aliceId, bobId);
    expect(fr).not.toBeNull();
    const r = await respondToRequest({
      userId: bobId,
      friendshipId: fr!.id,
      decision: "accept",
    });
    expect(r.ok).toBe(true);
    expect(await areFriends(db, aliceId, bobId)).toBe(true);
  });

  it("records an abuse report", async () => {
    const r = await reportUser({
      reporterId: aliceId,
      reportedId: bobId,
      reason: "harassment",
      details: "test report",
    });
    expect(r.ok).toBe(true);
  });

  it("blocking removes the friendship and stops new requests + search", async () => {
    const db = getDb();
    const blocked = await blockUser({ blockerId: aliceId, blockedId: bobId });
    expect(blocked.ok).toBe(true);
    expect(await areFriends(db, aliceId, bobId)).toBe(false);

    const reReq = await sendFriendRequest({ requesterId: aliceId, addresseeId: bobId });
    expect(reReq.ok).toBe(false);

    const reverse = await sendFriendRequest({ requesterId: bobId, addresseeId: aliceId });
    expect(reverse.ok).toBe(false);

    const results = await searchClients(aliceId, `FriendsTest bob ${TAG}`);
    expect(results.some((x) => x.id === bobId)).toBe(false);
  });
});
