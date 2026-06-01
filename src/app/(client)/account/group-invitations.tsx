"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { respondToBookingInviteAction } from "@/modules/booking/actions/group";
import type { BookingInviteRow } from "@/modules/booking/queries/list-booking-invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Pending group-session invitations a client can accept or decline. */
export function GroupInvitations({ invites }: { invites: BookingInviteRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (invites.length === 0) return null;

  function respond(bookingId: string, decision: "accept" | "decline") {
    startTransition(async () => {
      const r = await respondToBookingInviteAction({ bookingId, decision });
      if (r.ok) {
        toast.success(
          decision === "accept" ? "You've joined the session." : "Invitation declined.",
        );
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <section aria-labelledby="group-invites-heading" className="mb-8">
      <h2
        id="group-invites-heading"
        className="mb-2 flex items-center gap-2 text-sm font-semibold"
      >
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        Group invitations ({invites.length})
      </h2>
      <div className="space-y-3">
        {invites.map((inv) => (
          <Card key={inv.bookingId} className="ring-1 ring-primary/10">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {inv.hostName ?? "A friend"} invited you to a session with{" "}
                  {inv.therapistDisplayName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {FMT.format(new Date(inv.startsAt))}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => respond(inv.bookingId, "accept")}
                >
                  Join
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => respond(inv.bookingId, "decline")}
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
