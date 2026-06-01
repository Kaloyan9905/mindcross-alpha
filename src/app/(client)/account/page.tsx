import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/modules/identity";
import {
  listBookingsForClient,
  listBookingInvites,
  type BookingInviteRow,
  type ClientBookingRow,
} from "@/modules/booking";
import { listOpenSlotsForTherapist } from "@/modules/therapists";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsList, type SlotOption } from "./bookings-list";
import { AccountDeletion } from "./account-deletion";
import { GroupInvitations } from "./group-invitations";

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
  let loadFailed = false;
  try {
    bookings = await listBookingsForClient(user.id);
  } catch {
    // A read failure must NOT be shown as "you have no sessions".
    loadFailed = true;
  }

  const { upcoming, past } = splitBookings(bookings);
  const firstName = user.name?.split(" ")[0];

  let invites: BookingInviteRow[] = [];
  try {
    invites = await listBookingInvites(user.id);
  } catch {
    // Non-fatal — just don't show invitations this render.
  }

  // For each upcoming booking's therapist, load their OTHER open slots so the
  // client can reschedule into one. Keyed by therapistId.
  const therapistIds = [...new Set(upcoming.map((b) => b.therapistId))];
  const openSlotsByTherapist: Record<string, SlotOption[]> = {};
  try {
    await Promise.all(
      therapistIds.map(async (tid) => {
        const slots = await listOpenSlotsForTherapist(tid);
        openSlotsByTherapist[tid] = slots.map((s) => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
        }));
      }),
    );
  } catch {
    // Non-fatal — reschedule just won't offer alternatives this render.
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
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

      <div className="mt-8">
        <GroupInvitations invites={invites} />
      </div>

      <div className="mt-10">
        {loadFailed ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
          >
            <p className="font-medium text-foreground">
              We couldn&rsquo;t load your sessions
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Something went wrong on our side — your sessions are safe. Please
              refresh the page to try again.
            </p>
          </div>
        ) : (
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
                variant="upcoming"
                openSlotsByTherapist={openSlotsByTherapist}
              />
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              <BookingsList bookings={past} variant="past" />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Quiet, de-emphasized account controls — kept well away from the
          everyday booking actions above. */}
      <footer className="mt-24 border-t border-border pt-5">
        <AccountDeletion />
      </footer>
    </div>
  );
}
