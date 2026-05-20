import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — COARSE auth gate for protected route groups.
 *
 * Why this is deliberately minimal
 * --------------------------------
 * MindCross uses Auth.js with the *database* session strategy. The session is
 * a row in the `sessions` table; resolving it requires a DB round-trip, which
 * cannot run in the Edge runtime that middleware executes in. So middleware
 * cannot know the user's *role* — or even reliably that the session is still
 * valid (the cookie could point at a deleted/expired row).
 *
 * What it therefore does: a single cheap check — is an Auth.js session-token
 * cookie present at all? If not, the request is obviously unauthenticated, so
 * we bounce it straight to `/login` (with a `callbackUrl`) instead of letting
 * it reach the server and bounce there. This is a UX optimisation, not the
 * security boundary.
 *
 * The REAL access control:
 *   - `/admin/*`   -> `requireAdmin()` in `src/app/(admin)/layout.tsx`, which
 *                     reads the DB session and checks for a staff role.
 *   - `/account/*` -> the page/layout-level `requireUser()` guard.
 * Both run in Server Components where the DB session is fully resolvable. A
 * forged or stale cookie passes middleware but fails those guards.
 *
 * Cookie names mirror `modules/identity/lib/auth.ts`: `authjs.session-token`
 * in dev, `__Secure-authjs.session-token` in prod. Auth.js also *chunks* large
 * cookies (`<name>.0`, `<name>.1`, ...), so we match by prefix.
 */

/** Auth.js session-cookie name prefixes (dev + prod), chunk-aware. */
const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/** True if the request carries any Auth.js session cookie (possibly chunked). */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) =>
      SESSION_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix)),
    );
}

export function middleware(request: NextRequest): NextResponse {
  // The matcher already scopes us to /admin/* and /account/*, so every request
  // that reaches here is to a protected area.
  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  // No session cookie at all -> definitely not signed in. Send to login and
  // preserve where they were headed so the sign-in flow can return them.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(loginUrl);
}

/**
 * Run only for the two protected route groups. Static assets, `/api/*`, and
 * public marketing pages are untouched.
 */
export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
