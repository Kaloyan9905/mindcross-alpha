/** Shared result for group-session mutations. */
export type GroupResult = { ok: true } | { ok: false; error: string };

/** Maximum seats in a group session (including the host). */
export const MAX_GROUP_CAPACITY = 6;
