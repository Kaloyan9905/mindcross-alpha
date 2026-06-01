import Link from "next/link";
import { AlertTriangle, Video } from "lucide-react";

import { getTherapistForCurrentUser } from "@/modules/therapists";
import {
  listBookingsForTherapist,
  type TherapistBookingRow,
} from "@/modules/booking";
import {
  listSharedCheckinsForTherapist,
  type SharedCheckinRow,
} from "@/modules/wellbeing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

import { BookingOutcome } from "./booking-outcome";

const DT_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_META: Record<string, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "accent" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  completed: { label: "Completed", variant: "tertiary" },
  no_show: { label: "No-show", variant: "outline" },
};

function splitBookings(rows: TherapistBookingRow[]) {
  const now = Date.now();
  const upcoming: TherapistBookingRow[] = [];
  const past: TherapistBookingRow[] = [];
  for (const r of rows) {
    if (r.status !== "cancelled" && new Date(r.startsAt).getTime() >= now) {
      upcoming.push(r);
    } else {
      past.push(r);
    }
  }
  // Upcoming should read soonest-first; the query returns newest-first.
  upcoming.reverse();
  return { upcoming, past };
}

function BookingRow({
  booking,
  showOutcome,
}: {
  booking: TherapistBookingRow;
  showOutcome: boolean;
}) {
  const meta = STATUS_META[booking.status] ?? STATUS_META.confirmed;
  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
        {DT_FMT.format(new Date(booking.startsAt))}
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-foreground">
          {booking.clientName ?? "Client"}
        </div>
        <div className="text-muted-foreground">{booking.clientEmail}</div>
        {booking.clientNotes ? (
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            “{booking.clientNotes}”
          </p>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </td>
      <td className="px-3 py-3">
        {showOutcome && booking.status !== "cancelled" ? (
          <div className="flex justify-end">
            <BookingOutcome
              bookingId={booking.id}
              clientLabel={booking.clientName ?? booking.clientEmail}
              currentStatus={booking.status}
              currentNotes={booking.therapistNotes}
            />
          </div>
        ) : !showOutcome && booking.status === "confirmed" && booking.joinUrl ? (
          <div className="flex justify-end">
            <a
              href={booking.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Join
            </a>
          </div>
        ) : (
          <span className="block text-right text-xs text-muted-foreground">
            {booking.therapistNotes ? "Note saved" : "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

function BookingsTable({
  rows,
  showOutcome,
  emptyText,
}: {
  rows: TherapistBookingRow[];
  showOutcome: boolean;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 whitespace-nowrap">When</th>
            <th scope="col" className="px-3 py-2">Client</th>
            <th scope="col" className="px-3 py-2">Status</th>
            <th scope="col" className="px-3 py-2 text-right">
              {showOutcome ? "Outcome" : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <BookingRow key={b.id} booking={b} showOutcome={showOutcome} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MOOD_LABEL: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};
function moodDot(mood: number): string {
  if (mood <= 1) return "bg-destructive/70";
  if (mood === 2) return "bg-destructive/45";
  if (mood === 3) return "bg-muted-foreground/40";
  if (mood === 4) return "bg-success/60";
  return "bg-success";
}

function SharedCheckins({ checkins }: { checkins: SharedCheckinRow[] }) {
  if (checkins.length === 0) return null;
  return (
    <section aria-labelledby="checkins-heading">
      <Card>
        <CardHeader>
          <CardTitle id="checkins-heading" className="flex items-center gap-2">
            Client check-ins <Badge variant="secondary">{checkins.length}</Badge>
          </CardTitle>
          <CardDescription>
            Wellbeing check-ins clients chose to share with you, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {checkins.slice(0, 12).map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.clientName ?? "A client"}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${moodDot(c.mood)}`} />
                    {MOOD_LABEL[c.mood] ?? "Okay"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {DT_FMT.format(new Date(c.createdAt))}
                  </span>
                </div>
                {c.feelings.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.feelings.map((f) => (
                      <Badge key={f} variant="secondary" className="font-normal">
                        {f}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {c.note ? (
                  <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">
                    {c.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

export default async function TherapistDashboardPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null; // layout already guards.

  const rows = await listBookingsForTherapist(therapist.id);
  const { upcoming, past } = splitBookings(rows);

  let sharedCheckins: SharedCheckinRow[] = [];
  try {
    sharedCheckins = await listSharedCheckinsForTherapist(therapist.id);
  } catch {
    // Non-fatal — the dashboard still renders without check-ins.
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your sessions</h1>
        <p className="text-sm text-muted-foreground">
          {therapist.status === "active"
            ? "Clients can book your open availability slots."
            : "Your profile is in review — clients cannot book you yet. An admin will activate you."}{" "}
          Manage your open times under{" "}
          <Link href="/therapist/availability" className="text-primary underline-offset-4 hover:underline">
            Availability
          </Link>
          .
        </p>
      </header>

      {!therapist.sessionUrl ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Add your video room link
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Clients can&rsquo;t join a session without it. Add your Zoom / Meet
              / Whereby link on your{" "}
              <Link
                href="/therapist/profile"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                profile
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="upcoming-heading">
        <Card>
          <CardHeader>
            <CardTitle id="upcoming-heading" className="flex items-center gap-2">
              Upcoming <Badge variant="secondary">{upcoming.length}</Badge>
            </CardTitle>
            <CardDescription>Your confirmed upcoming sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingsTable
              rows={upcoming}
              showOutcome={false}
              emptyText="No upcoming sessions yet."
            />
          </CardContent>
        </Card>
      </section>

      <SharedCheckins checkins={sharedCheckins} />

      <section aria-labelledby="past-heading">
        <Card>
          <CardHeader>
            <CardTitle id="past-heading" className="flex items-center gap-2">
              Past &amp; to review <Badge variant="secondary">{past.length}</Badge>
            </CardTitle>
            <CardDescription>
              Mark how each session went — completed or no-show — and add private
              notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingsTable
              rows={past}
              showOutcome
              emptyText="No past sessions yet."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
