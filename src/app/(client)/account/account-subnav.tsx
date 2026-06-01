"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, HeartPulse, MessageCircle, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Secondary navigation for the account hub — Sessions / Messages / Friends.
 * A small client component so it can read the active path; the surrounding
 * layout stays a Server Component. Unread messages + pending friend requests
 * surface as small badges.
 */
const ITEMS = [
  { href: "/account", label: "Sessions", icon: CalendarDays, exact: true, badge: "none" },
  { href: "/account/messages", label: "Messages", icon: MessageCircle, exact: false, badge: "unread" },
  { href: "/account/friends", label: "Friends", icon: Users, exact: false, badge: "requests" },
  { href: "/account/wellbeing", label: "Wellbeing", icon: HeartPulse, exact: false, badge: "none" },
] as const;

export function AccountSubnav({
  unread,
  requests,
}: {
  unread: number;
  requests: number;
}) {
  const pathname = usePathname() ?? "/account";

  return (
    <nav
      aria-label="Account sections"
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badge =
          item.badge === "unread" ? unread : item.badge === "requests" ? requests : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
            {badge > 0 ? (
              <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                {badge > 99 ? "99+" : badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
