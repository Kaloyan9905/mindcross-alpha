import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "@/modules/identity";

/**
 * Admin / staff access policy for the `admin` module.
 *
 * ACCESS MODEL (ARCHITECTURE.md + brief): any role whose name starts with
 * `admin_` is "staff". `client` and `therapist` are not. There is no single
 * `admin` role — staff is split into four scoped roles. At MVP they all see
 * the same admin console; fine-grained scoping is a future task.
 */

/**
 * The four staff role strings. Kept as a runtime tuple so it can be used both
 * for membership checks and (later) for zod validation / form options.
 */
export const ADMIN_ROLES = [
  "admin_ops",
  "admin_clinical",
  "admin_support",
  "admin_super",
] as const;

/** A staff role string (one of {@link ADMIN_ROLES}). */
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * True if `role` is a staff/admin role — i.e. it starts with `admin_`.
 *
 * Implemented as a prefix test rather than a tuple lookup so a future staff
 * role (e.g. `admin_billing`) is treated as staff without a code change here.
 */
export function isAdminRole(role: string): boolean {
  return role.startsWith("admin_");
}

/**
 * Route guard for every `(admin)` page and layout.
 *
 * Reads the DB-backed session via `getCurrentUser()`. If the request is
 * anonymous, or the signed-in user is not staff, it `redirect()`s to
 * `/login` — `redirect` throws, so callers can rely on a non-staff request
 * never returning from this function.
 *
 * This is the REAL access check. The edge middleware (`src/middleware.ts`) is
 * deliberately coarse and only bounces obviously-unauthenticated requests; the
 * role decision happens here, in a Server Component, where the session is
 * fully resolvable.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    redirect("/login");
  }
  return user;
}
