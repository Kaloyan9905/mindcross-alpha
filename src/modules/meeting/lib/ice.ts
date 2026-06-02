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
const TURN_FETCH_TIMEOUT_MS = 5000;

/** POST/GET a TURN provider's credential API with a timeout; null on any error. */
async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TURN_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      console.error(`[meeting] TURN provider responded ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[meeting] TURN credential fetch failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeIceList(raw: unknown): IceServer[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const list: IceServer[] = [];
  for (const s of raw) {
    const e = s as { urls?: string | string[]; username?: string; credential?: string };
    // Port 53 is blocked by browsers and can stall ICE — drop it.
    const urls = Array.isArray(e.urls) ? e.urls.filter((u) => !u.includes(":53")) : e.urls;
    if (!urls || (Array.isArray(urls) && urls.length === 0)) continue;
    const entry: IceServer = { urls };
    if (e.username !== undefined) entry.username = e.username;
    if (e.credential !== undefined) entry.credential = e.credential;
    list.push(entry);
  }
  return list.length > 0 ? list : null;
}

/**
 * Cloudflare TURN — managed, free, reliable. Mints short-lived ICE servers from
 * a TURN key. Set `CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN`.
 */
async function cloudflareIceServers(): Promise<IceServer[] | null> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();
  if (!keyId || !token) return null;
  const data = await fetchJson(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
    },
  );
  return normalizeIceList((data as { iceServers?: unknown })?.iceServers);
}

/**
 * Metered Open Relay — free TURN, free account, NO credit card (20 GB/month).
 * Returns the `iceServers` array directly. Set `METERED_TURN_SUBDOMAIN`
 * (your-app from your-app.metered.live) + `METERED_TURN_API_KEY`.
 */
async function meteredIceServers(): Promise<IceServer[] | null> {
  const subdomain = process.env.METERED_TURN_SUBDOMAIN?.trim();
  const apiKey = process.env.METERED_TURN_API_KEY?.trim();
  if (!subdomain || !apiKey) return null;
  const data = await fetchJson(
    `https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
  );
  return normalizeIceList(data);
}

/**
 * ICE servers handed to the browser at join time, resolved server-side so
 * secrets never reach the bundle. Public STUN is always included; a TURN relay
 * is added when configured (so users behind symmetric NAT / strict firewalls,
 * or simply on two different home networks, can still connect).
 *
 * TURN, in priority order — all free; (1) and (2) need no credit card:
 *  1. Cloudflare TURN (`CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN`).
 *  2. Metered Open Relay (`METERED_TURN_SUBDOMAIN` + `METERED_TURN_API_KEY`).
 *  3. Self-hosted coturn — `MEETING_TURN_URL` + `MEETING_TURN_SECRET` (minted
 *     HMAC `use-auth-secret` creds), or static username/credential. This also
 *     drives the no-signup public relay: MEETING_TURN_URL=
 *     turn:staticauth.openrelay.metered.ca:443 + MEETING_TURN_SECRET=
 *     openrelayprojectsecret.
 */
export async function getIceServers(): Promise<IceServer[]> {
  const servers = [...PUBLIC_STUN];

  const cf = await cloudflareIceServers();
  if (cf) return [...servers, ...cf];

  const metered = await meteredIceServers();
  if (metered) return [...servers, ...metered];

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
