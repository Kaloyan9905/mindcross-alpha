import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/modules/identity/lib/auth";
import type { UserRole } from "@/modules/identity/db/schema";

/**
 * The authenticated identity as carried on the Auth.js session. This is the
 * shape other modules consume — a thin projection of the `users` row.
 */
export type SessionUser = {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Return the current session user, or `null` if the request is anonymous.
 * Safe to call from any Server Component / Server Action.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Require an authenticated user. Redirects to `/login` if there is no
 * session. Returns the session user otherwise.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
