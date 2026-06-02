"use server";

import type { UserRole } from "@/modules/identity/db/schema";
import { getAdminUser } from "../lib/policies";
import { setUserRole, type SetUserRoleResult } from "../lib/set-user-role";

export type SetUserRoleActionInput = { userId: string; role: UserRole };

/**
 * Admin Server Action: assign a role to a user. Self-authorizing — resolves the
 * session, then delegates to the `setUserRole` core which enforces that the
 * actor is a super admin (re-checked against the DB). The page-level
 * `requireAdmin()` gate alone does NOT protect this independently-invokable
 * endpoint, hence the explicit `getAdminUser()`.
 */
export async function setUserRoleAction(
  input: SetUserRoleActionInput,
): Promise<SetUserRoleResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "You are not authorized to change roles." };
  }
  return setUserRole({
    actorId: admin.id,
    targetUserId: input.userId,
    role: input.role,
  });
}
