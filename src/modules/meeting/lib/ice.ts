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
const CF_FETCH_TIMEOUT_MS = 5000;

/**
 * Cloudflare TURN (managed, free, reliable). Mints short-lived ICE servers
 * (STUN + TURN over UDP/TCP/TLS, incl. :443 to punch through hostile firewalls)
 * from a TURN key. Returns null when unconfigured or on any error/timeout so
 * the caller falls back to STUN / a self-hosted relay.
 *
 * Set `CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN` (server-side only).
 */
async function cloudflareIceServers(): Promise<IceServer[] | null> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();
  if (!keyId || !token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CF_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.error(`[meeting] Cloudflare TURN responded ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
    };
    const list = data.iceServers;
    if (!Array.isArray(list) || list.length === 0) return null;

    return list
      .map((s) => {
        // Port 53 is blocked by browsers and can stall ICE — drop it.
        const urls = Array.isArray(s.urls)
          ? s.urls.filter((u) => !u.includes(":53"))
          : s.urls;
        return { urls, username: s.username, credential: s.credential };
      })
      .filter((s) => (Array.isArray(s.urls) ? s.urls.length > 0 : Boolean(s.urls)));
  } catch (err) {
    console.error("[meeting] Cloudflare TURN fetch failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ICE servers handed to the browser at join time, resolved server-side so
 * secrets never reach the bundle. Public STUN is always included; a TURN relay
 * is added when configured (so users behind symmetric NAT / strict firewalls —
 * common on mobile/CGNAT and shelter/campus networks — can still connect).
 *
 * TURN, in priority order:
 *  1. Cloudflare TURN (`CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN`) —
 *     managed, free, short-lived creds minted per join.
 *  2. Self-hosted coturn via `MEETING_TURN_URL` + `MEETING_TURN_SECRET` — minted
 *     HMAC `use-auth-secret` credentials.
 *  3. Static `MEETING_TURN_URL` + `MEETING_TURN_USERNAME` + `MEETING_TURN_CREDENTIAL`.
 */
export async function getIceServers(): Promise<IceServer[]> {
  const servers = [...PUBLIC_STUN];

  const cf = await cloudflareIceServers();
  if (cf) return [...servers, ...cf];

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
