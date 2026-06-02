import { createHmac } from "node:crypto";

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Free, no-account public STUN servers. STUN only DISCOVERS a peer's public
 * address (it never relays media), so these are sufficient for the ~80% of
 * calls on cone-NAT / typical home + office networks.
 */
const PUBLIC_STUN: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

/** TURN credentials live this long; the browser reconnects well within it. */
const TURN_TTL_SECONDS = 12 * 60 * 60;

/**
 * ICE servers handed to the browser at join time. Public STUN by default; if a
 * TURN relay is configured via env it is appended so users behind symmetric NAT
 * / restrictive firewalls — common on mobile/CGNAT and shelter/campus networks —
 * can still connect. Resolved server-side so secrets never sit in the bundle.
 *
 * TURN auth, in priority order:
 *  1. `MEETING_TURN_SECRET` → mint short-lived coturn `use-auth-secret`
 *     credentials (the documented REST scheme): username = expiry timestamp,
 *     credential = base64(HMAC-SHA1(secret, username)). Leaked creds expire fast
 *     and there's no per-user account — the recommended free, self-hosted setup.
 *  2. `MEETING_TURN_USERNAME` + `MEETING_TURN_CREDENTIAL` → static long-term
 *     credentials.
 *  3. URL only → unauthenticated TURN (rare).
 */
export function getIceServers(): IceServer[] {
  const servers = [...PUBLIC_STUN];

  const url = process.env.MEETING_TURN_URL?.trim();
  if (!url) return servers;

  const secret = process.env.MEETING_TURN_SECRET?.trim();
  if (secret) {
    const username = String(Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS);
    const credential = createHmac("sha1", secret).update(username).digest("base64");
    servers.push({ urls: url, username, credential });
    return servers;
  }

  const username = process.env.MEETING_TURN_USERNAME?.trim();
  const credential = process.env.MEETING_TURN_CREDENTIAL?.trim();
  servers.push(username && credential ? { urls: url, username, credential } : { urls: url });
  return servers;
}
