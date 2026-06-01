/**
 * E2E fixture seeder (run by Playwright's globalSetup via tsx).
 *
 * Creates a deterministic pair of client accounts and a *pending friend
 * request* from Alice → Bob, so the friend-request activity badge has real
 * state to render. Writes both sets of credentials to `e2e/.fixtures.json`
 * (gitignored) for the specs to read.
 *
 * Idempotent: deletes the pair first (cascade clears the friendship), then
 * recreates them fresh — every run starts from the same clean state.
 */
import "./_env";

import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { registerAction } from "@/modules/identity/actions/register";
import { sendFriendRequest } from "@/modules/friends/lib/send-friend-request";

const PASSWORD = "e2e-correct-horse-staple";
const ALICE = { name: "Alice E2E", email: "e2e.alice@mindcross.test", password: PASSWORD };
const BOB = { name: "Bob E2E", email: "e2e.bob@mindcross.test", password: PASSWORD };

async function ensureFreshUser(u: { name: string; email: string; password: string }): Promise<string> {
  const db = getDb();
  // Cascade from users clears any prior friendship/blocks/messages.
  await db.delete(users).where(eq(users.email, u.email));
  const res = await registerAction({
    name: u.name,
    email: u.email,
    password: u.password,
    confirmPassword: u.password,
    consent: true,
  });
  if (!res.ok) throw new Error(`register ${u.email} failed: ${res.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
  if (!row) throw new Error(`could not read back ${u.email}`);
  return row.id;
}

async function main() {
  const aliceId = await ensureFreshUser(ALICE);
  const bobId = await ensureFreshUser(BOB);

  // Alice sends Bob a friend request → Bob (the addressee) gets the badge.
  await sendFriendRequest({ requesterId: aliceId, addresseeId: bobId });

  const fixtures = {
    requester: { email: ALICE.email, password: ALICE.password, name: ALICE.name },
    addressee: { email: BOB.email, password: BOB.password, name: BOB.name },
  };
  const dir = path.resolve(process.cwd(), "e2e");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, ".fixtures.json"), JSON.stringify(fixtures, null, 2));

  console.log(`[e2e-setup] seeded friend request: ${ALICE.email} -> ${BOB.email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[e2e-setup] failed:", err);
  process.exit(1);
});
