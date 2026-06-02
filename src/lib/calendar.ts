/**
 * Small, pure date helpers for the availability calendar — local-time based,
 * Monday-first weeks. Kept dependency-free (no date library) and unit-tested.
 */

export const MINUTES_PER_DAY = 24 * 60;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-based start of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const daysSinceMonday = (x.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat
  return addDays(x, -daysSinceMonday);
}

/** The seven days (Mon→Sun) of the week containing `d`. */
export function daysOfWeek(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

/** 42 days (6 Monday-first weeks) covering the month of `d`. */
export function monthGridDays(d: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(d));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Half-open overlap of [aStart,aEnd) and [bStart,bEnd). */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/**
 * The portion of [start,end) that falls on `day`, expressed as minutes-from-
 * midnight `[top, bottom)`. Returns null if the event doesn't touch the day.
 * Multi-day events (e.g. time off) are clamped to the day.
 */
export function dayBlockBounds(
  start: Date,
  end: Date,
  day: Date,
): { top: number; bottom: number } | null {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + MINUTES_PER_DAY * 60_000;
  const s = Math.max(start.getTime(), dayStart);
  const e = Math.min(end.getTime(), dayEnd);
  if (e <= s) return null;
  return { top: (s - dayStart) / 60_000, bottom: (e - dayStart) / 60_000 };
}

/** Round a Date to the nearest `step` minutes (within the same day). */
export function roundToStep(d: Date, step: number): Date {
  const x = startOfDay(d);
  const rounded = Math.round(minutesSinceMidnight(d) / step) * step;
  x.setMinutes(rounded);
  return x;
}

/** "YYYY-MM-DD" for a date input, in local time. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "HH:MM" for a time input/select, in local time. */
export function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
