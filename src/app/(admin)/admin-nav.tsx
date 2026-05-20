"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sidebar navigation for the admin console. A small client component so it can
 * read `usePathname()` and highlight the active section. The surrounding
 * `(admin)/layout.tsx` stays a Server Component (it must run `requireAdmin()`).
 */

type AdminNavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Therapists", href: "/admin/therapists", icon: Users },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
];

/** True when `href` is the active section for the current `pathname`. */
function isActive(pathname: string, href: string): boolean {
  // `/admin` should match only its exact route, not every `/admin/*` page.
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebarNav() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {ADMIN_NAV_LINKS.map((link) => {
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
    </nav>
  );
}
