"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, Check, LogIn } from "lucide-react";

import type { AvailabilitySlot } from "@/modules/therapists";
import { createBookingAction } from "@/modules/booking/actions/create-booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Booking panel on a therapist's profile.
 *
 * - Signed-out visitors see a prompt to log in (with a callbackUrl back here).
 * - Signed-in clients can pick an available slot, optionally leave a note, and
 *   confirm. The booking server action returns a discriminated result; success
 *   routes to the account page, failure shows a toast.
 */

export interface BookingSectionProps {
  therapistName: string;
  slots: AvailabilitySlot[];
  /** Current user's id, or null when signed out. */
  clientId: string | null;
  slug: string;
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

type SlotGroup = { dayKey: string; dayLabel: string; slots: AvailabilitySlot[] };

/** Group slots by calendar day, preserving the (already ascending) order. */
function groupSlotsByDay(slots: AvailabilitySlot[]): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const slot of slots) {
    const start = new Date(slot.startsAt);
    const dayKey = start.toISOString().slice(0, 10);
    let group = groups.get(dayKey);
    if (!group) {
      group = { dayKey, dayLabel: dayFormatter.format(start), slots: [] };
      groups.set(dayKey, group);
    }
    group.slots.push(slot);
  }
  return [...groups.values()];
}

export function BookingSection({
  therapistName,
  slots,
  clientId,
  slug,
}: BookingSectionProps) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(
    null,
  );
  const [notes, setNotes] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const groups = React.useMemo(() => groupSlotsByDay(slots), [slots]);

  // Signed-out state.
  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Book a session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Log in to your MindCross account to see available times and book a
            free session with {therapistName.split(" ")[0]}.
          </p>
          <Button asChild className="w-full">
            <Link href={`/login?callbackUrl=/therapists/${slug}`}>
              <LogIn aria-hidden="true" />
              Log in to book a session
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            New to MindCross?{" "}
            <Link
              href="/register"
              className="text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // No availability.
  if (slots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Book a session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CalendarClock
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {therapistName.split(" ")[0]} has no open times right now. Please
              check back soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfirm = () => {
    if (!selectedSlotId) {
      toast.error("Please choose a time first.");
      return;
    }
    const trimmedNotes = notes.trim();
    startTransition(async () => {
      const result = await createBookingAction({
        clientId,
        slotId: selectedSlotId,
        clientNotes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
      });
      if (result.ok) {
        toast.success("Your session is booked. We've sent you a confirmation.");
        router.push("/account");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Book a session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Choose a time that works for you. Your first session is free.
        </p>

        {/* Slot picker, grouped by day */}
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.dayKey}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.dayLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((slot) => {
                  const selected = slot.id === selectedSlotId;
                  return (
                    <Button
                      key={slot.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className="gap-1.5"
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {timeFormatter.format(new Date(slot.startsAt))}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Optional note to the therapist */}
        <div className="space-y-2">
          <Label htmlFor="booking-notes">
            Anything you’d like your therapist to know?
          </Label>
          <Textarea
            id="booking-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional — share anything that would help your first session."
            rows={3}
            maxLength={2000}
          />
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={isPending || !selectedSlotId}
          onClick={handleConfirm}
        >
          {isPending ? "Confirming…" : "Confirm booking"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You can cancel any time from your account.
        </p>
      </CardContent>
    </Card>
  );
}
