import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Inbox,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { listPendingApplications, listTherapistsAdmin } from "@/modules/therapists";
import { listBookingsAdmin } from "@/modules/booking";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  icon: LucideIcon;
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
      icon: Inbox,
    },
    {
      label: "Active therapists",
      count: activeTherapistCount,
      href: "/admin/therapists",
      hint: `of ${therapists.length} total in the directory`,
      icon: Users,
    },
    {
      label: "Total bookings",
      count: bookings.length,
      href: "/admin/bookings",
      hint: "Sessions booked across the platform",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          A quick overview of what needs your attention.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-card/80">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1.5">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle className="text-3xl">{card.count}</CardTitle>
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.hint}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    View
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
