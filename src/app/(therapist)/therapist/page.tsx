import Link from "next/link";
import { Mail, Users, Video } from "lucide-react";

import { getTherapistForCurrentUser } from "@/modules/therapists";
import {
  listBookingsForTherapist,
  listRostersForTherapist,
  isJoinable,
  sessionPhase,
  type TherapistBookingRow,
  type ParticipantRow,
  type SessionPhase,
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
import {
  CancelSessionButton,
  RemoveSessionButton,
} from "@/components/shared/session-actions";

import { BookingOutcome } from "./booking-outcome";

const DT_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const PHASE_META: Record<SessionPhase, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  upcoming: { label: "Upcoming", variant: "accent" },
  live: { label: "Live now", variant: "default" },
  missed: { label: "Missed", variant: "outline" },
  ended: { label: "Ended", variant: "tertiary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

/** Who is attending a group session (names + emails). */
function Roster({ participants }: { participants: ParticipantRow[] }) {
  const accepted = participants.filter((p) => p.role === "host" || p.status === "accepted");
  const invited = participants.filter((p) => p.role === "guest" && p.status === "invited").length;
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Group session · {accepted.length} attending
        {invited > 0 ? ` · ${invited} invited` : ""}
      </p>
      <ul className="mt-1.5 space-y-1">
        {accepted.map((p) => (
          <li key={p.userId} className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-medium text-foreground">{p.name ?? "—"}</span>
            {p.role === "host" ? (
              <Badge variant="outline" className="px-1 py-0 text-[10px]">
                Host
              </Badge>
            ) : null}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Mail className="h-3 w-3" aria-hidden="true" />
              {p.email}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionCard({
  booking,
  roster,
  now,
}: {
  booking: TherapistBookingRow;
  roster: ParticipantRow[] | undefined;
  now: Date;
}) {
  const phase = sessionPhase(booking, now);
  const meta = PHASE_META[phase];
  const joinable = isJoinable(booking, now);
  // Past sessions still awaiting a recorded outcome.
  const canRecord =
    !joinable && booking.status !== "cancelled" && booking.status !== "completed";

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {booking.clientName ?? "Client"}
            </span>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {DT_FMT.format(new Date(booking.startsAt))} · {booking.clientEmail}
          </p>
          {booking.clientNotes ? (
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              “{booking.clientNotes}”
            </p>
          ) : null}
          {booking.groupCapacity > 1 && roster ? <Roster participants={roster} /> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {joinable ? (
            <Link
              href={`/session/${booking.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Join
            </Link>
          ) : null}
          {canRecord ? (
            <BookingOutcome
              bookingId={booking.id}
              clientLabel={booking.clientName ?? booking.clientEmail}
              currentStatus={booking.status}
              currentNotes={booking.therapistNotes}
            />
          ) : null}
          {joinable ? (
            <CancelSessionButton
              bookingId={booking.id}
              label={booking.clientName ?? booking.clientEmail}
            />
          ) : null}
          <RemoveSessionButton
            bookingId={booking.id}
            label={booking.clientName ?? booking.clientEmail}
          />
        </div>
      </div>
    </li>
  );
}

export default async function TherapistDashboardPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null; // layout already guards.

  const now = new Date();
  const rows = await listBookingsForTherapist(therapist.id);

  let rosters = new Map<string, ParticipantRow[]>();
  try {
    rosters = await listRostersForTherapist(therapist.id);
  } catch {
    // Non-fatal — sessions still render without the roster.
  }

  // "Current" = still joinable (upcoming + live, incl. the grace window).
  const upcoming: TherapistBookingRow[] = [];
  const past: TherapistBookingRow[] = [];
  for (const r of rows) {
    if (isJoinable(r, now)) upcoming.push(r);
    else past.push(r);
  }
  upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  let sharedCheckins: SharedCheckinRow[] = [];
  try {
    sharedCheckins = await listSharedCheckinsForTherapist(therapist.id);
  } catch {
    // Non-fatal.
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your sessions</h1>
          <p className="text-sm text-muted-foreground">
            {therapist.status === "active"
              ? "Clients can book your open availability slots."
              : "Your profile is in review — clients cannot book you yet."}{" "}
            Manage open times under{" "}
            <Link href="/therapist/availability" className="text-primary underline-offset-4 hover:underline">
              Availability
            </Link>
            .
          </p>
        </div>
        <Link
          href="/therapist/recycle-bin"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Recycle bin
        </Link>
      </header>

      <section aria-labelledby="upcoming-heading">
        <Card>
          <CardHeader>
            <CardTitle id="upcoming-heading" className="flex items-center gap-2">
              Upcoming &amp; live <Badge variant="secondary">{upcoming.length}</Badge>
            </CardTitle>
            <CardDescription>
              Sessions stay joinable for a 10-minute grace period after the start
              time. Group sessions show everyone attending.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming sessions.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <SessionCard key={b.id} booking={b} roster={rosters.get(b.id)} now={now} />
                ))}
              </ul>
            )}
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
              Mark how each session went — completed or missed — and add private
              notes. Remove old sessions to the recycle bin to declutter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No past sessions yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {past.map((b) => (
                  <SessionCard key={b.id} booking={b} roster={rosters.get(b.id)} now={now} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
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
