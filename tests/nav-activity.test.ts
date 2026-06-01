/**
 * Integration test for the navbar activity counts (friend-request badge).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { sendFriendRequest } from "@/modules/friends/lib/send-friend-request";
import { getNavActivity } from "@/lib/nav-activity";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);
let aliceId: string;
let bobId: string;

async function reg(label: string): Promise<string> {
  const db = getDb();
  const email = `nav-${label}-${Date.now()}-${TAG}@example.com`;
  const r = await registerAction({
    name: `Nav ${label} ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!r.ok) throw new Error(`register ${label}: ${r.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return row!.id;
}

beforeAll(async () => {
  aliceId = await reg("alice");
  bobId = await reg("bob");
});

afterAll(async () => {
  try {
    const db = getDb();
    for (const id of [aliceId, bobId]) if (id) await db.delete(users).where(eq(users.id, id));
  } catch (err) {
    console.warn("[nav-activity.test] cleanup failed:", err);
  }
});

describe("getNavActivity", () => {
  it("is empty for a fresh client", async () => {
    expect(await getNavActivity({ id: aliceId, role: "client" })).toEqual({
      friendRequests: 0,
      unreadMessages: 0,
    });
  });

  it("counts an incoming friend request", async () => {
    await sendFriendRequest({ requesterId: bobId, addresseeId: aliceId });
    const a = await getNavActivity({ id: aliceId, role: "client" });
    expect(a.friendRequests).toBe(1);
    // The sender has an OUTGOING request, which is not "activity" to act on.
    expect((await getNavActivity({ id: bobId, role: "client" })).friendRequests).toBe(0);
  });

  it("returns empty for non-clients and for no user", async () => {
    expect(await getNavActivity({ id: aliceId, role: "therapist" })).toEqual({
      friendRequests: 0,
      unreadMessages: 0,
    });
    expect(await getNavActivity(null)).toEqual({ friendRequests: 0, unreadMessages: 0 });
  });
});
