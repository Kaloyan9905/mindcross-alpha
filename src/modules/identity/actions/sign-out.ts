"use server";

import { signOut } from "@/modules/identity/lib/auth";

/**
 * Sign the current user out and send them home.
 *
 * This is a `"use server"` action so client components (the navbar's account
 * dropdown and mobile drawer) can sign out via `<form action={signOutAction}>`
 * without posting to the raw `/api/auth/signout` HTTP endpoint — that endpoint
 * requires a CSRF token in the request body, which a plain form omits, so it
 * fails with `MissingCSRF`. Server actions are CSRF-trusted by the framework,
 * so this path is reliable.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
