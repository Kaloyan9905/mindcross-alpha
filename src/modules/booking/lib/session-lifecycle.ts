/**
 * Pure helpers for the session grace period + recycle-bin retention. Shared by
 * the UI (badges, the Join window) and the server cores/scans, so the rules live
 * in exactly one place.
 */

/** A session stays joinable for this long after its start even if nobody joined. */
export const GRACE_MINUTES = 10;
export const GRACE_MS = GRACE_MINUTES * 60 * 1000;

/** A removed session is recoverable for this long before it is purged. */
export const RETENTION_DAYS = 30;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** The minimal booking shape these helpers reason about. */
export interface SessionTiming {
  status: string;
  startsAt: Date;
  endsAt: Date;
  startedAt: Date | null;
}

/**
 * The latest moment a confirmed session can still be joined: its scheduled end
 * once someone has joined, otherwise `start + grace` (so an unattended session
 * closes shortly after its start rather than lingering all hour).
 */
export function joinDeadline(b: SessionTiming): number {
  return b.startedAt ? b.endsAt.getTime() : b.startsAt.getTime() + GRACE_MS;
}

/** A confirmed session that can still be joined right now (incl. the grace). */
export function isJoinable(b: SessionTiming, now: Date = new Date()): boolean {
  return b.status === "confirmed" && now.getTime() < joinDeadline(b);
}

/** A confirmed session whose start+grace passed with nobody joining (a no-show). */
export function isMissed(b: SessionTiming, now: Date = new Date()): boolean {
  return (
    b.status === "confirmed" &&
    !b.startedAt &&
    now.getTime() >= b.startsAt.getTime() + GRACE_MS
  );
}

/** A confirmed session happening right now (after start, still joinable). */
export function isLive(b: SessionTiming, now: Date = new Date()): boolean {
  const t = now.getTime();
  return b.status === "confirmed" && t >= b.startsAt.getTime() && t < joinDeadline(b);
}

export type SessionPhase = "upcoming" | "live" | "missed" | "ended" | "cancelled";

/** A derived, display-friendly phase for a booking. */
export function sessionPhase(b: SessionTiming, now: Date = new Date()): SessionPhase {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "completed") return "ended";
  if (b.status === "no_show") return "missed";
  // confirmed (the only remaining non-terminal status at MVP):
  const t = now.getTime();
  if (t < b.startsAt.getTime()) return "upcoming";
  if (isMissed(b, now)) return "missed";
  if (t < joinDeadline(b)) return "live";
  return "ended";
}
