/**
 * Absolute base URL of the deployed site, used for canonical URLs, Open Graph
 * tags, the sitemap, and robots. Override with `NEXT_PUBLIC_SITE_URL` in
 * production; defaults to localhost for dev. No secret — a public origin only.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

/**
 * Absolute URL of the in-app video room for a booking. Used in emails (the
 * link a client follows to join their session). Requires login, then drops the
 * user straight into `/session/[bookingId]`.
 */
export function sessionRoomUrl(bookingId: string): string {
  return `${SITE_URL}/session/${bookingId}`;
}
