"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, LifeBuoy, LogIn } from "lucide-react";

import type { AvailabilitySlot } from "@/modules/therapists";
import { createBookingAction } from "@/modules/booking/actions/create-booking";
import { EmptyIllustration } from "@/components/shared/empty-illustration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Booking panel on a therapist's profile.
 *
 * - Signed-out visitors are prompted to log in / sign up, carrying a
 *   `callbackUrl` back to this profile so they return here after auth.
 * - Signed-in clients pick a slot (with a clear day · time-range · duration ·
 *   timezone summary before confirming), optionally leave a note, and confirm.
 *   Errors surface inline with `role="alert"`.
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

/** "45 min" / "1 hour" / "1 hour 30 min". */
function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} hour${h > 1 ? "s" : ""}`;
  return m === 0 ? hours : `${hours} ${m} min`;
}

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

/** Calm, always-present crisis note. Shown near the note + confirm. */
function CrisisNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
      <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>
        If you&rsquo;re in crisis or need urgent help, this isn&rsquo;t the place
        — please call your local emergency number (<strong>112</strong> in the
        EU) or a crisis line right away.
      </span>
    </div>
  );
}

export function BookingSection({
  therapistName,
  slots,
  clientId,
  slug,
}: BookingSectionProps) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const groups = React.useMemo(() => groupSlotsByDay(slots), [slots]);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  // Signed-out state.
  if (!clientId) {
    const callback = encodeURIComponent(`/therapists/${slug}`);
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
            <Link href={`/login?callbackUrl=${callback}`}>
              <LogIn aria-hidden="true" />
              Log in to book a session
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            New to MindCross?{" "}
            <Link
              href={`/register?callbackUrl=${callback}`}
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
            <EmptyIllustration name="clock" className="mb-1" />
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
      setBookingError("Please choose a time first.");
      return;
    }
    setBookingError(null);
    const trimmedNotes = notes.trim();
    startTransition(async () => {
      const result = await createBookingAction({
        slotId: selectedSlotId,
        clientNotes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
      });
      if (result.ok) {
        toast.success("Your session is booked. We've sent you a confirmation.");
        // A brief, warm confirmation before whisking them to their sessions.
        setConfirmed(true);
        const reduce =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => router.push("/account"), reduce ? 250 : 1150);
      } else {
        setBookingError(result.error);
        setSelectedSlotId(null);
        // Refresh so a slot taken by someone else disappears from the list.
        router.refresh();
      }
    });
  };

  // Warm success moment after a confirmed booking.
  if (confirmed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="animate-pop relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-soft-lg">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-success/25 [animation:mc-pop_0.6s_ease-out]"
            />
            <Check className="h-8 w-8" aria-hidden="true" strokeWidth={3} />
          </span>
          <p className="text-lg font-semibold">You&rsquo;re booked!</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            We&rsquo;ve sent a confirmation. Taking you to your sessions…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Book a session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Choose a time that works for you. Your first session is free.
        </p>

        {/* Slot picker, grouped by day — held in a soft container so the
            choice feels contained and calm */}
        <div className="space-y-4 rounded-xl bg-secondary/30 p-4">
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
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setBookingError(null);
                      }}
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

        {/* Selected-slot summary: what you're reserving, in your timezone */}
        {selectedSlot ? (
          <div className="rounded-lg border border-border border-l-4 border-l-primary bg-accent/20 p-3 text-sm">
            <p className="font-medium text-foreground">
              {dayFormatter.format(new Date(selectedSlot.startsAt))}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {timeFormatter.format(new Date(selectedSlot.startsAt))}–
              {timeFormatter.format(new Date(selectedSlot.endsAt))} ·{" "}
              {durationLabel(
                Math.round(
                  (new Date(selectedSlot.endsAt).getTime() -
                    new Date(selectedSlot.startsAt).getTime()) /
                    60000,
                ),
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Times shown in your timezone (
              {Intl.DateTimeFormat().resolvedOptions().timeZone}).
            </p>
          </div>
        ) : null}

        {/* Optional note to the therapist */}
        <div className="space-y-2">
          <Label htmlFor="booking-notes">
            Anything you&rsquo;d like your therapist to know?
          </Label>
          <Textarea
            id="booking-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional — share anything that would help your first session."
            rows={3}
            maxLength={2000}
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">
            {notes.length} / 2000
          </p>
        </div>

        <CrisisNote />

        {bookingError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {bookingError}
          </p>
        ) : null}

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
