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

/**
 * ICE servers handed to the browser at join time. Public STUN by default; if a
 * TURN relay is configured via env (`MEETING_TURN_URL` [+ username/credential])
 * it is appended so users behind symmetric NAT / restrictive firewalls — common
 * on mobile/CGNAT and shelter/campus networks — can still connect. Resolved
 * server-side so credentials never sit in the client bundle.
 *
 * To close the NAT gap for free with no account, point `MEETING_TURN_URL` at a
 * self-hosted coturn instance; or drop in a free TURN provider's credentials.
 */
export function getIceServers(): IceServer[] {
  const servers = [...PUBLIC_STUN];
  const url = process.env.MEETING_TURN_URL?.trim();
  if (url) {
    const turn: IceServer = { urls: url };
    if (process.env.MEETING_TURN_USERNAME) {
      turn.username = process.env.MEETING_TURN_USERNAME;
    }
    if (process.env.MEETING_TURN_CREDENTIAL) {
      turn.credential = process.env.MEETING_TURN_CREDENTIAL;
    }
    servers.push(turn);
  }
  return servers;
}
