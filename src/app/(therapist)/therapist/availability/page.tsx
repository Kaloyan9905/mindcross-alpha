import { getTherapistForCurrentUser, listUpcomingAvailability } from "@/modules/therapists";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AvailabilityManager, type SlotView } from "./availability-manager";

export default async function TherapistAvailabilityPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null; // layout guards.

  const slots = await listUpcomingAvailability(therapist.id);
  const slotViews: SlotView[] = slots.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    isBooked: s.isBooked,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Add the times you can see clients. Open slots appear on your public
          profile; booked slots can&rsquo;t be removed until the booking is
          cancelled.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your upcoming slots</CardTitle>
          <CardDescription>
            Times are shown in your browser&rsquo;s local timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityManager slots={slotViews} />
        </CardContent>
      </Card>
    </div>
  );
}
