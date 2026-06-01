import { and, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { friendships, userBlocks } from "../db/schema";

/** Connection state of a search hit relative to the viewer. */
export type ConnectionState =
  | "none"
  | "request_sent"
  | "request_received"
  | "friends";

export interface ClientSearchResult {
  id: string;
  name: string;
  status: ConnectionState;
}

const MAX_RESULTS = 20;
const MIN_QUERY = 2;

/**
 * Open name search over CLIENT accounts only (therapists/admins are never
 * surfaced). Excludes the viewer and anyone blocked in either direction, never
 * returns email, and annotates each hit with the current connection state so
 * the UI can show Add / Pending / Friends. Backed by the `users_name_trgm` GIN
 * index.
 */
export async function searchClients(
  viewerId: string,
  query: string,
): Promise<ClientSearchResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];

  const db = getDb();

  // Everyone the viewer has blocked or been blocked by — excluded from results.
  const blocks = await db
    .select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(
      or(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, viewerId)),
    );
  const blockedIds = new Set<string>();
  for (const b of blocks) {
    blockedIds.add(b.blockerId === viewerId ? b.blockedId : b.blockerId);
  }

  const candidates = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.role, "client"),
        ne(users.id, viewerId),
        ilike(users.name, `%${q}%`),
      ),
    )
    .limit(MAX_RESULTS);

  const filtered = candidates.filter(
    (c): c is { id: string; name: string } =>
      Boolean(c.name) && !blockedIds.has(c.id),
  );
  if (filtered.length === 0) return [];

  const ids = filtered.map((c) => c.id);
  const rels = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, viewerId),
          inArray(friendships.addresseeId, ids),
        ),
        and(
          eq(friendships.addresseeId, viewerId),
          inArray(friendships.requesterId, ids),
        ),
      ),
    );
  const relByOther = new Map<string, (typeof rels)[number]>();
  for (const r of rels) {
    const other = r.requesterId === viewerId ? r.addresseeId : r.requesterId;
    relByOther.set(other, r);
  }

  return filtered.map((c) => {
    const r = relByOther.get(c.id);
    let status: ConnectionState = "none";
    if (r) {
      if (r.status === "accepted") status = "friends";
      else if (r.status === "pending") {
        status = r.requesterId === viewerId ? "request_sent" : "request_received";
      }
    }
    return { id: c.id, name: c.name, status };
  });
}
