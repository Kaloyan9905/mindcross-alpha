import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  listPendingApplications,
  listTherapistsAdmin,
} from "@/modules/therapists";
import { listBookingsAdmin } from "@/modules/booking";

/**
 * Admin dashboard — `/admin`.
 *
 * Shows three at-a-glance summary cards. At MVP scale the counts are derived
 * from the existing list queries (no dedicated COUNT query); the brief
 * explicitly accepts this. Each card links to its section.
 */

type SummaryCard = {
  label: string;
  count: number;
  href: string;
  hint: string;
};

export default async function AdminDashboardPage() {
  // Fetched in parallel — three independent reads.
  const [pendingApplications, therapists, bookings] = await Promise.all([
    listPendingApplications(),
    listTherapistsAdmin(),
    listBookingsAdmin(),
  ]);

  const activeTherapistCount = therapists.filter(
    (t) => t.status === "active",
  ).length;

  const cards: SummaryCard[] = [
    {
      label: "Pending applications",
      count: pendingApplications.length,
      href: "/admin/therapists",
      hint: "Therapist applications awaiting review",
    },
    {
      label: "Active therapists",
      count: activeTherapistCount,
      href: "/admin/therapists",
      hint: `of ${therapists.length} total in the directory`,
    },
    {
      label: "Total bookings",
      count: bookings.length,
      href: "/admin/bookings",
      hint: "Sessions booked across the platform",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A quick overview of what needs your attention.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex flex-col rounded-lg border border-border p-5 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {card.count}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{card.hint}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
              View
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
