import {
  getTherapistForCurrentUser,
  listAvailabilityInRange,
  listTimeOff,
} from "@/modules/therapists";
import { listBookingsForTherapist } from "@/modules/booking";

import { AvailabilityCalendar } from "./availability-calendar";

export default async function TherapistAvailabilityPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null; // layout guards.

  const now = new Date();
  // A generous window for the calendar: a couple of weeks back through ~5 months
  // ahead (covers month/week/day navigation without refetching).
  const from = new Date(now.getTime() - 14 * 86_400_000);
  const to = new Date(now.getTime() + 150 * 86_400_000);

  const [slots, timeOff, bookings] = await Promise.all([
    listAvailabilityInRange(therapist.id, from, to),
    listTimeOff(therapist.id, from, to),
    listBookingsForTherapist(therapist.id),
  ]);

  const slotViews = slots.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    isBooked: s.isBooked,
  }));
  const sessionViews = bookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({
      id: b.id,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      clientName: b.clientName,
      status: b.status,
    }));
  const timeOffViews = timeOff.map((t) => ({
    id: t.id,
    startsAt: t.startsAt.toISOString(),
    endsAt: t.endsAt.toISOString(),
    note: t.note,
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Manage the times you can see clients. Click an empty time (or
          &ldquo;Add availability&rdquo;) to open a slot, click a slot to remove
          it, and block days off for vacation. Times are shown in your local
          timezone.
        </p>
      </header>

      <AvailabilityCalendar
        slots={slotViews}
        sessions={sessionViews}
        timeOff={timeOffViews}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
