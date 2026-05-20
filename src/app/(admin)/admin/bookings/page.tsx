import { listBookingsAdmin, type BookingStatus } from "@/modules/booking";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

/** Date-only formatter (created column). */
const DATE_FMT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Date + time formatter (session column). */
const DATE_TIME_FMT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Map a booking status to a Badge variant + label. */
function statusBadge(status: BookingStatus): {
  variant: BadgeProps["variant"];
  label: string;
} {
  switch (status) {
    case "confirmed":
      return { variant: "accent", label: "Confirmed" };
    case "completed":
      return { variant: "default", label: "Completed" };
    case "pending":
      return { variant: "tertiary", label: "Pending" };
    case "cancelled":
      return { variant: "destructive", label: "Cancelled" };
    case "no_show":
    default:
      return { variant: "secondary", label: "No show" };
  }
}

/**
 * Bookings admin page — `/admin/bookings`.
 *
 * A read-only view of every booking on the platform (newest first). At MVP the
 * admin does not mutate bookings here — cancellation is a client/therapist
 * action; anything else is done in Drizzle Studio.
 *
 * Gated by the `(admin)` layout's `requireAdmin()`.
 */
export default async function AdminBookingsPage() {
  const bookings = await listBookingsAdmin();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Every session booked across MindCross, most recent first.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            All bookings
            <Badge variant="secondary">{bookings.length}</Badge>
          </CardTitle>
          <CardDescription>
            This view is read-only. Use Drizzle Studio for anything beyond
            inspection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No bookings have been made yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-3 py-2">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Therapist
                    </th>
                    <th scope="col" className="px-3 py-2 whitespace-nowrap">
                      Session
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 whitespace-nowrap">
                      Booked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const badge = statusBadge(booking.status);
                    return (
                      <tr
                        key={booking.id}
                        className="border-b border-border last:border-0 align-top"
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">
                            {booking.clientName ?? "Unnamed client"}
                          </div>
                          <div className="text-muted-foreground">
                            {booking.clientEmail}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">
                          {booking.therapistDisplayName}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {DATE_TIME_FMT.format(booking.startsAt)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {DATE_FMT.format(booking.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
