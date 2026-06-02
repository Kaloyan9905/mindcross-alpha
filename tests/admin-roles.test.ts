/**
 * Integration tests for superuser role assignment (`setUserRole` core) against
 * the live DB: only a super admin may assign; self-change, unknown target, and
 * invalid roles are rejected; a valid change persists.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/modules/identity/db/schema";
import { setUserRole } from "@/modules/admin/lib/set-user-role";

const TAG = Math.random().toString(36).slice(2, 8);

let superId: string;
let opsId: string;
let clientId: string;
let targetId: string;

async function mkUser(role: UserRole): Promise<string> {
  const db = getDb();
  const id = uuidv7();
  await db.insert(users).values({
    id,
    name: `Roles ${role} ${TAG}`,
    email: `roles-${role}-${Date.now()}-${TAG}@example.com`,
    role,
  });
  return id;
}

async function roleOf(id: string): Promise<string | undefined> {
  const db = getDb();
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  return row?.role;
}

beforeAll(async () => {
  superId = await mkUser("admin_super");
  opsId = await mkUser("admin_ops");
  clientId = await mkUser("client");
  targetId = await mkUser("client");
});

afterAll(async () => {
  const db = getDb();
  try {
    for (const id of [superId, opsId, clientId, targetId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[admin-roles.test] cleanup failed:", err);
  }
});

describe("setUserRole", () => {
  it("lets a super admin change a user's role", async () => {
    const r = await setUserRole({ actorId: superId, targetUserId: targetId, role: "therapist" });
    expect(r.ok).toBe(true);
    expect(await roleOf(targetId)).toBe("therapist");

    // ...including promoting to a staff role.
    const r2 = await setUserRole({ actorId: superId, targetUserId: targetId, role: "admin_ops" });
    expect(r2.ok).toBe(true);
    expect(await roleOf(targetId)).toBe("admin_ops");
  });

  it("rejects a non-super admin", async () => {
    const r = await setUserRole({ actorId: opsId, targetUserId: targetId, role: "client" });
    expect(r.ok).toBe(false);
    // unchanged
    expect(await roleOf(targetId)).toBe("admin_ops");
  });

  it("rejects a non-admin actor", async () => {
    const r = await setUserRole({ actorId: clientId, targetUserId: targetId, role: "client" });
    expect(r.ok).toBe(false);
  });

  it("rejects changing your own role", async () => {
    const r = await setUserRole({ actorId: superId, targetUserId: superId, role: "client" });
    expect(r.ok).toBe(false);
    expect(await roleOf(superId)).toBe("admin_super");
  });

  it("rejects an unknown target", async () => {
    const r = await setUserRole({ actorId: superId, targetUserId: `missing-${TAG}`, role: "client" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid role", async () => {
    const r = await setUserRole({
      actorId: superId,
      targetUserId: targetId,
      role: "wizard" as UserRole,
    });
    expect(r.ok).toBe(false);
  });
});
