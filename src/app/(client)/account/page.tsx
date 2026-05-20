import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/modules/identity";
import {
  listBookingsForClient,
  type ClientBookingRow,
} from "@/modules/booking";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsList } from "./bookings-list";

export const metadata: Metadata = {
  title: "My sessions — MindCross",
};

/**
 * Split a client's bookings into upcoming vs. past at request time.
 *
 * Upcoming = a future session that is not cancelled. Everything else (past
 * sessions and cancelled bookings) goes to the history list. Reading the
 * clock lives in this plain helper, not in the component body.
 */
function splitBookings(bookings: ClientBookingRow[]): {
  upcoming: ClientBookingRow[];
  past: ClientBookingRow[];
} {
  const now = Date.now();
  const upcoming: ClientBookingRow[] = [];
  const past: ClientBookingRow[] = [];
  for (const booking of bookings) {
    const isFuture = new Date(booking.startsAt).getTime() >= now;
    if (booking.status !== "cancelled" && isFuture) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  }
  return { upcoming, past };
}

export default async function AccountPage() {
  // The layout already guards this route; this is a defensive narrow so
  // `user` is non-null for the query below.
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  let bookings: ClientBookingRow[] = [];
  try {
    bookings = await listBookingsForClient(user.id);
  } catch {
    bookings = [];
  }

  const { upcoming, past } = splitBookings(bookings);
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "My sessions"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here are your therapy sessions. You can join or cancel them at any
            time.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          <Link href="/find-a-therapist">Book another session</Link>
        </Button>
      </header>

      <div className="mt-10">
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past &amp; cancelled ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <BookingsList
              bookings={upcoming}
              userId={user.id}
              variant="upcoming"
            />
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <BookingsList bookings={past} userId={user.id} variant="past" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
