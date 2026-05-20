"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarX2, ExternalLink, Video } from "lucide-react";

import type { ClientBookingRow, BookingStatus } from "@/modules/booking";
import { cancelBookingAction } from "@/modules/booking/actions/cancel-booking";
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
 * confirmation dialog, calls the cancel server action, and refreshes the page
 * on success so the lists re-split.
 */

export interface BookingsListProps {
  bookings: ClientBookingRow[];
  userId: string;
  variant: "upcoming" | "past";
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Human-readable label + badge style for each booking status. */
const STATUS_META: Record<
  BookingStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "accent" },
  cancelled: { label: "Cancelled", variant: "destructive" },
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
  userId,
  therapistName,
}: {
  bookingId: string;
  userId: string;
  therapistName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelBookingAction({ bookingId, userId });
      if (result.ok) {
        toast.success("Your session has been cancelled.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            will be freed up, and you can always book again later.
          </DialogDescription>
        </DialogHeader>
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

function BookingCard({
  booking,
  userId,
  variant,
}: {
  booking: ClientBookingRow;
  userId: string;
  variant: "upcoming" | "past";
}) {
  const status = STATUS_META[booking.status];
  const canCancel = variant === "upcoming" && booking.status === "confirmed";
  const showJoinLink =
    variant === "upcoming" &&
    booking.status === "confirmed" &&
    Boolean(booking.joinUrl);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            {booking.therapistPhotoUrl ? (
              <AvatarImage src={booking.therapistPhotoUrl} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initialsFor(booking.therapistDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/therapists/${booking.therapistSlug}`}
                className="font-heading font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {booking.therapistDisplayName}
              </Link>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateTimeFormatter.format(new Date(booking.startsAt))}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showJoinLink && booking.joinUrl ? (
            <Button asChild size="sm">
              <a
                href={booking.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Video aria-hidden="true" />
                Join session
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : null}
          {canCancel ? (
            <CancelBookingDialog
              bookingId={booking.id}
              userId={userId}
              therapistName={booking.therapistDisplayName}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingsList({ bookings, userId, variant }: BookingsListProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"
          >
            <CalendarX2 className="h-6 w-6" />
          </span>
          <p className="font-heading text-lg font-semibold">
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
      {bookings.map((booking) => (
        <li key={booking.id}>
          <BookingCard booking={booking} userId={userId} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
