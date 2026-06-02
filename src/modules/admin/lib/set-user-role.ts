import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { users, USER_ROLES } from "@/modules/identity/db/schema";
import { isSuperAdmin } from "./policies";

export type SetUserRoleResult = { ok: true } | { ok: false; error: string };

const setUserRoleSchema = z.object({
  actorId: z.string().min(1),
  targetUserId: z.string().min(1, "A user is required."),
  role: z.enum(USER_ROLES),
});

export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

/**
 * Trusted core: set `targetUserId`'s role to `role`, authorized by `actorId`.
 * `actorId` is an already-authenticated id (the `"use server"` action resolves
 * the session); this core re-reads the actor's CURRENT role from the DB and
 * requires `admin_super`, so a stale session or a bypassed action can't escalate.
 *
 * Guardrails:
 *  - Only a super admin may assign roles.
 *  - You cannot change your own role (prevents a super locking themselves out,
 *    and self-demotion that would drop the last superuser).
 *  - The target must exist; the new role must be a known role.
 *
 * The new role takes effect on the target's next request — the auth `jwt`
 * callback refreshes `role` from the DB (see `modules/identity/lib/auth.ts`).
 */
export async function setUserRole(input: SetUserRoleInput): Promise<SetUserRoleResult> {
  const parsed = setUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { actorId, targetUserId, role } = parsed.data;

  if (actorId === targetUserId) {
    return { ok: false, error: "You can't change your own role." };
  }

  try {
    const db = getDb();

    const [actor] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);
    if (!actor || !isSuperAdmin(actor.role)) {
      return { ok: false, error: "Only a super admin can assign roles." };
    }

    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) {
      return { ok: false, error: "User not found." };
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    return { ok: true };
  } catch (err) {
    console.error("setUserRole failed:", err);
    return { ok: false, error: "Could not update the role. Please try again." };
  }
}
