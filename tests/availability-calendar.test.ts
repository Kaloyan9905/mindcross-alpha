/**
 * Integration tests for the calendar's time-off backend against the live DB:
 * blocking time clears overlapping OPEN slots (but not booked ones, nor slots
 * outside the range), the range queries window correctly, and remove works.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { therapists, availabilitySlots } from "@/modules/therapists/db/schema";
import { addTimeOff, removeTimeOff } from "@/modules/therapists/lib/manage-time-off";
import { listTimeOff } from "@/modules/therapists/queries/list-time-off";
import { listAvailabilityInRange } from "@/modules/therapists/queries/list-availability-for-therapist";

const TAG = Math.random().toString(36).slice(2, 8);
let therapistId: string;

const t0 = new Date();
const offStart = new Date(t0);
offStart.setDate(t0.getDate() + 1);
offStart.setHours(0, 0, 0, 0);
const offEnd = new Date(offStart);
offEnd.setDate(offStart.getDate() + 2); // a 2-day block

function at(base: Date, addDays: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function mkSlot(start: Date, end: Date, isBooked = false): Promise<string> {
  const id = uuidv7();
  await getDb().insert(availabilitySlots).values({ id, therapistId, startsAt: start, endsAt: end, isBooked, createdAt: new Date() });
  return id;
}

let openIn: string;
let bookedIn: string;
let openOut: string;

beforeAll(async () => {
  therapistId = uuidv7();
  await getDb().insert(therapists).values({
    id: therapistId,
    slug: `cal-${TAG}`,
    displayName: `Dr Cal ${TAG}`,
    email: `cal-${TAG}@example.com`,
    bio: "Test.",
    yearsOfExperience: 5,
    status: "active",
  });
  openIn = await mkSlot(at(offStart, 0, 10), at(offStart, 0, 11)); // inside the block, open
  bookedIn = await mkSlot(at(offStart, 1, 10), at(offStart, 1, 11), true); // inside, booked
  openOut = await mkSlot(at(offEnd, 1, 10), at(offEnd, 1, 11)); // after the block, open
});

afterAll(async () => {
  try {
    // Cascades availability slots + time off.
    await getDb().delete(therapists).where(eq(therapists.id, therapistId));
  } catch (err) {
    console.warn("[availability-calendar.test] cleanup failed:", err);
  }
});

async function slotIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ id: availabilitySlots.id })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.therapistId, therapistId));
  return rows.map((r) => r.id);
}

describe("time off", () => {
  it("blocks a span and clears only overlapping OPEN slots", async () => {
    const r = await addTimeOff({ therapistId, startsAt: offStart, endsAt: offEnd, note: "Vacation" });
    expect(r.ok).toBe(true);

    const ids = await slotIds();
    expect(ids).not.toContain(openIn); // open + overlapping → cleared
    expect(ids).toContain(bookedIn); // booked → kept
    expect(ids).toContain(openOut); // outside the block → kept
  });

  it("is listed by the windowed query and can be removed", async () => {
    const within = await listTimeOff(therapistId, t0, at(offEnd, 10, 0));
    expect(within.length).toBe(1);
    expect(within[0].note).toBe("Vacation");

    const rm = await removeTimeOff({ therapistId, id: within[0].id });
    expect(rm.ok).toBe(true);
    expect((await listTimeOff(therapistId, t0, at(offEnd, 10, 0))).length).toBe(0);
  });

  it("listAvailabilityInRange windows by start time", async () => {
    // Window ends at offEnd (= t0+3d): bookedIn starts t0+2d, openOut starts t0+4d.
    const inRange = await listAvailabilityInRange(therapistId, t0, offEnd);
    const ids = inRange.map((s) => s.id);
    expect(ids).toContain(bookedIn); // within window
    expect(ids).not.toContain(openOut); // starts after the window end
  });

  it("rejects an inverted range", async () => {
    const r = await addTimeOff({ therapistId, startsAt: offEnd, endsAt: offStart });
    expect(r.ok).toBe(false);
  });
});
