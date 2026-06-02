"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { LogOut, MessageCircle, Users, Video } from "lucide-react";

import { EmptyIllustration } from "@/components/shared/empty-illustration";

import type { ClientBookingRow, BookingStatus } from "@/modules/booking";
import { cancelBookingAction } from "@/modules/booking/actions/cancel-booking";
import { rescheduleBookingAction } from "@/modules/booking/actions/reschedule-booking";
import { leaveBookingAction } from "@/modules/booking/actions/group";
import { startTherapistConversationAction } from "@/modules/messaging/actions/start-therapist-conversation";
import { GroupInviteDialog } from "./group-invite-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Renders a client's bookings (upcoming or past). The Cancel control opens a
 * confirmation dialog; the Reschedule control offers the therapist's other open
 * slots. Both call a server action and refresh on success.
 */

/** A reschedule target slot (serialized for the client). */
export interface SlotOption {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface BookingsListProps {
  bookings: ClientBookingRow[];
  variant: "upcoming" | "past";
  /** therapistId -> the therapist's other open slots (upcoming variant only). */
  openSlotsByTherapist?: Record<string, SlotOption[]>;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** "45 min" / "1 hour" / "1 hour 30 min" from start/end. */
function durationLabel(startsAt: Date, endsAt: Date): string {
  const minutes = Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000,
  );
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} hour${h > 1 ? "s" : ""}`;
  return m === 0 ? hours : `${hours} ${m} min`;
}

/** Human-readable label + badge style for each booking status. */
const STATUS_META: Record<
  BookingStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "accent" },
  // Cancelled is not "danger" — red is reserved for genuine danger.
  cancelled: { label: "Cancelled", variant: "secondary" },
  completed: { label: "Completed", variant: "tertiary" },
  no_show: { label: "Missed", variant: "outline" },
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

function CancelBookingDialog({
  bookingId,
  therapistName,
}: {
  bookingId: string;
  therapistName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      // No userId is sent — the server action derives identity from the session.
      const result = await cancelBookingAction({ bookingId });
      if (result.ok) {
        toast.success("Your session has been cancelled.");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            This will cancel your session with {therapistName}. The time slot
            will be freed up, and you can always book again later. Sessions
            can&rsquo;t be cancelled within an hour of the start time.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>
              Keep my session
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const slotFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function RescheduleDialog({
  bookingId,
  therapistName,
  slots,
}: {
  bookingId: string;
  therapistName: string;
  slots: SlotOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleReschedule = () => {
    if (!selected) {
      setError("Pick a new time first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBookingAction({ bookingId, newSlotId: selected });
      if (result.ok) {
        toast.success("Your session has been moved.");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule your session</DialogTitle>
          <DialogDescription>
            Choose another open time with {therapistName}. Your current slot will
            be freed for someone else.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {therapistName} has no other open times right now. Please check back
            soon.
          </p>
        ) : (
          <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {slots.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant={selected === s.id ? "default" : "outline"}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {slotFormatter.format(new Date(s.startsAt))}
              </Button>
            ))}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>
              Keep current time
            </Button>
          </DialogClose>
          <Button
            onClick={handleReschedule}
            disabled={isPending || slots.length === 0 || !selected}
          >
            {isPending ? "Moving…" : "Move session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Message" the therapist — opens (or creates) the client↔therapist thread. */
function MessageTherapistButton({ therapistId }: { therapistId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="gap-1.5"
      onClick={() =>
        startTransition(async () => {
          const r = await startTherapistConversationAction({ therapistId });
          if (r.ok) router.push(`/account/messages/${r.conversationId}`);
          else toast.error(r.error);
        })
      }
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Message
    </Button>
  );
}

/** A guest leaves a group session (frees their seat). */
function LeaveSessionButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="gap-1.5 text-muted-foreground hover:text-destructive"
      onClick={() =>
        startTransition(async () => {
          const r = await leaveBookingAction({ bookingId });
          if (r.ok) {
            toast.success("You've left the session.");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Leave
    </Button>
  );
}

function BookingCard({
  booking,
  variant,
  slots,
}: {
  booking: ClientBookingRow;
  variant: "upcoming" | "past";
  slots: SlotOption[];
}) {
  const status = STATUS_META[booking.status];
  const isHost = booking.role === "host";
  const isUpcomingConfirmed =
    variant === "upcoming" && booking.status === "confirmed";
  // Only the host can manage the booking itself; guests can only leave.
  const canCancel = isUpcomingConfirmed && isHost;
  const canReschedule = canCancel;
  const canInvite = isUpcomingConfirmed && isHost;
  const canLeave = isUpcomingConfirmed && !isHost;
  const canMessage =
    isHost && (booking.status === "confirmed" || booking.status === "completed");
  // The session room is in-app (one per booking), so a join is always available
  // for an upcoming confirmed session — no external link required.
  const showJoinLink = variant === "upcoming" && booking.status === "confirmed";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            {booking.therapistPhotoUrl ? (
              <AvatarImage src={booking.therapistPhotoUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-sm font-medium">
              {initialsFor(booking.therapistDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/therapists/${booking.therapistSlug}`}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {booking.therapistDisplayName}
              </Link>
              <Badge variant={status.variant}>{status.label}</Badge>
              {booking.groupCapacity > 1 ? (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  Group{!isHost ? " · joined" : ""}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateTimeFormatter.format(new Date(booking.startsAt))}
              {durationLabel(booking.startsAt, booking.endsAt)
                ? ` · ${durationLabel(booking.startsAt, booking.endsAt)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showJoinLink ? (
            <Button asChild size="sm">
              <Link href={`/session/${booking.id}`}>
                <Video aria-hidden="true" />
                Join session
              </Link>
            </Button>
          ) : null}
          {canMessage ? (
            <MessageTherapistButton therapistId={booking.therapistId} />
          ) : null}
          {canInvite ? (
            <GroupInviteDialog
              bookingId={booking.id}
              groupCapacity={booking.groupCapacity}
              therapistName={booking.therapistDisplayName}
            />
          ) : null}
          {canReschedule ? (
            <RescheduleDialog
              bookingId={booking.id}
              therapistName={booking.therapistDisplayName}
              slots={slots}
            />
          ) : null}
          {canCancel ? (
            <CancelBookingDialog
              bookingId={booking.id}
              therapistName={booking.therapistDisplayName}
            />
          ) : null}
          {canLeave ? <LeaveSessionButton bookingId={booking.id} /> : null}
          {variant === "past" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/therapists/${booking.therapistSlug}`}>
                Book again
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingsList({
  bookings,
  variant,
  openSlotsByTherapist = {},
}: BookingsListProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <EmptyIllustration name="calendar" className="mb-1" />
          <p className="text-lg font-semibold">
            {variant === "upcoming"
              ? "No upcoming sessions"
              : "Nothing here yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {variant === "upcoming"
              ? "When you book a session, it will appear here so you can join or manage it."
              : "Your past and cancelled sessions will be listed here."}
          </p>
          {variant === "upcoming" ? (
            <Button asChild variant="outline" className="mt-2">
              <Link href="/find-a-therapist">Find a therapist</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {bookings.map((booking, index) => (
        <li
          key={booking.id}
          className="animate-rise"
          style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
        >
          <BookingCard
            booking={booking}
            variant={variant}
            slots={openSlotsByTherapist[booking.therapistId] ?? []}
          />
        </li>
      ))}
    </ul>
  );
}
