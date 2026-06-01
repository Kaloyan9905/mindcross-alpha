/**
 * Shared result for friends mutations. Discriminated on `ok` — expected
 * failures (not found, not allowed, blocked) are returned, never thrown.
 */
export type FriendResult = { ok: true } | { ok: false; error: string };
