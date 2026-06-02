"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  LayoutDashboard,
  MessageCircle,
  Trash2,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Sidebar nav for the therapist self-service area. */
type TherapistNavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
};

const LINKS: TherapistNavLink[] = [
  { label: "Dashboard", href: "/therapist", icon: LayoutDashboard, group: "Overview" },
  { label: "Messages", href: "/therapist/messages", icon: MessageCircle, group: "Overview" },
  { label: "Availability", href: "/therapist/availability", icon: CalendarClock, group: "Your practice" },
  { label: "Profile", href: "/therapist/profile", icon: UserCog, group: "Your practice" },
  { label: "Recycle bin", href: "/therapist/recycle-bin", icon: Trash2, group: "Your practice" },
];

/** Distinct group names in first-seen order. */
const NAV_GROUPS = [...new Set(LINKS.map((l) => l.group))];

function isActive(pathname: string, href: string): boolean {
  return href === "/therapist"
    ? pathname === "/therapist"
    : pathname.startsWith(href);
}

export function TherapistNav() {
  const pathname = usePathname() ?? "/therapist";

  return (
    <nav aria-label="Therapist sections" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {group}
          </p>
          {LINKS.filter((link) => link.group === group).map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-secondary-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
