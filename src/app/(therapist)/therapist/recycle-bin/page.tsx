import type { Metadata } from "next";

import { getTherapistForCurrentUser } from "@/modules/therapists";
import {
  listDeletedBookingsForTherapist,
  RETENTION_DAYS,
} from "@/modules/booking";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestoreSessionButton } from "@/components/shared/session-actions";

export const metadata: Metadata = {
  title: "Recycle bin · MindCross",
};

const DT_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Whole days left before a removed session is permanently deleted. */
function daysLeft(deletedAt: Date, now: Date): number {
  const elapsed = Math.floor((now.getTime() - deletedAt.getTime()) / 86_400_000);
  return Math.max(0, RETENTION_DAYS - elapsed);
}

export default async function TherapistRecycleBinPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null;

  const rows = await listDeletedBookingsForTherapist(therapist.id);
  const now = new Date();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Recycle bin</h1>
        <p className="text-sm text-muted-foreground">
          Removed sessions are kept here for {RETENTION_DAYS} days, then
          permanently deleted. Restore one with a single click.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recently deleted <Badge variant="secondary">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>Most recently removed first.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing in the recycle bin.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => {
                const left = daysLeft(r.deletedAt, now);
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {r.clientName ?? "Client"}{" "}
                        <span className="text-muted-foreground">· {r.clientEmail}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Session {DT_FMT.format(new Date(r.startsAt))} · removed{" "}
                        {DT_FMT.format(new Date(r.deletedAt))}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {left === 0
                          ? "Will be permanently deleted soon."
                          : `Permanently deleted in ${left} day${left === 1 ? "" : "s"}.`}
                      </p>
                    </div>
                    <RestoreSessionButton bookingId={r.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
