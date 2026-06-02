import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/modules/identity";
import {
  listDeletedBookingsForClient,
  RETENTION_DAYS,
} from "@/modules/booking";
import { Button } from "@/components/ui/button";
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
  title: "Recycle bin — MindCross",
};

const DT_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function daysLeft(deletedAt: Date, now: Date): number {
  const elapsed = Math.floor((now.getTime() - deletedAt.getTime()) / 86_400_000);
  return Math.max(0, RETENTION_DAYS - elapsed);
}

export default async function ClientRecycleBinPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await listDeletedBookingsForClient(user.id);
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Recycle bin</h1>
          <p className="text-muted-foreground">
            Removed sessions stay here for {RETENTION_DAYS} days, then are
            permanently deleted. Restore one with a single click.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          <Link href="/account">Back to my sessions</Link>
        </Button>
      </header>

      <div className="mt-10">
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
                          {r.therapistDisplayName}
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
    </div>
  );
}
