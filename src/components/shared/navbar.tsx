"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  MessageCircle,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BadgeProps } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/modules/identity/actions/sign-out";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { type Locale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type NavbarUser = {
  id: string;
  name?: string | null;
  role?: string | null;
} | null;

/** Unseen activity counts surfaced as badges/dots in the account menu. */
export type NavActivity = {
  friendRequests: number;
  unreadMessages: number;
};

/** A small red count pill (Instagram-style), aligned to the right of a row. */
function CountPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type NavLink = {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Find a Therapist", href: "/find-a-therapist" },
  { label: "Our Mission", href: "/our-mission" },
];

function MindCrossLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      aria-label="MindCross — go to home"
    >
      {/* Tiny restrained mark */}
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-primary"
      />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        MindCross
      </span>
    </Link>
  );
}

function NavLinkItem({
  link,
  pathname,
  onSelect,
  className,
}: {
  link: NavLink;
  pathname: string;
  onSelect?: () => void;
  className?: string;
}) {
  const isActive =
    link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

  if (link.disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60 cursor-not-allowed",
          className
        )}
      >
        {link.label}
        {link.badge && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {link.badge}
          </Badge>
        )}
      </span>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        "hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground",
        className
      )}
    >
      {link.label}
      {link.badge && (
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
          {link.badge}
        </Badge>
      )}
    </Link>
  );
}

function initialsFor(name?: string | null) {
  if (!name) return "MC";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

/**
 * The single, role-aware primary destination for a signed-in user. Shared by
 * the desktop dropdown and the mobile drawer so they never drift (the mobile
 * menu previously listed `/account` twice).
 */
function primaryDestination(role?: string | null): {
  href: string;
  label: string;
  icon: LucideIcon;
} {
  if (role?.startsWith("admin_")) {
    return { href: "/admin", label: "Staff console", icon: UserCircle2 };
  }
  if (role === "therapist") {
    return { href: "/therapist", label: "Therapist dashboard", icon: CalendarDays };
  }
  return { href: "/account", label: "My sessions", icon: CalendarDays };
}

/** A friendly, human label + badge tone for a raw role string. */
function roleBadge(
  role?: string | null,
): { label: string; variant: NonNullable<BadgeProps["variant"]> } | null {
  if (!role) return null;
  if (role.startsWith("admin_")) return { label: "Staff", variant: "secondary" };
  if (role === "therapist") return { label: "Therapist", variant: "accent" };
  if (role === "client") return { label: "Client", variant: "outline" };
  return null;
}

function UserMenu({
  user,
  activity,
}: {
  user: NonNullable<NavbarUser>;
  activity?: NavActivity;
}) {
  const dest = primaryDestination(user.role);
  const DestIcon = dest.icon;
  const badge = roleBadge(user.role);
  const requests = activity?.friendRequests ?? 0;
  const unread = activity?.unreadMessages ?? 0;
  const total = requests + unread;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 gap-2 px-2"
          aria-label={total > 0 ? `Open account menu, ${total} new` : "Open account menu"}
        >
          {total > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
            />
          ) : null}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              {initialsFor(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">
            {user.name?.split(" ")[0] ?? "Account"}
          </span>
          <ChevronDown
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium normal-case tracking-normal text-foreground">
              {user.name ?? "Signed in"}
            </span>
            {badge ? (
              <Badge
                variant={badge.variant}
                className="w-fit px-1.5 py-0 text-[10px] font-medium normal-case tracking-normal"
              >
                {badge.label}
              </Badge>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={dest.href}>
            <DestIcon aria-hidden="true" />
            {dest.label}
          </Link>
        </DropdownMenuItem>
        {(!user.role || user.role === "client") ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/account/messages">
                <MessageCircle aria-hidden="true" />
                Messages
                <CountPill count={unread} />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/friends">
                <Users aria-hidden="true" />
                Friends
                <CountPill count={requests} />
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu({
  user,
  pathname,
  links,
  activity,
}: {
  user: NavbarUser;
  pathname: string;
  links: NavLink[];
  activity?: NavActivity;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const requests = activity?.friendRequests ?? 0;
  const unread = activity?.unreadMessages ?? 0;
  const total = requests + unread;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative md:hidden"
          aria-label={total > 0 ? `Open menu, ${total} new` : "Open menu"}
        >
          {total > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
            />
          ) : null}
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "left-auto right-0 top-0 flex h-dvh w-[85vw] max-w-sm translate-x-0 translate-y-0 flex-col rounded-none p-0 sm:rounded-none",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        )}
      >
        <DialogTitle className="sr-only">Site navigation</DialogTitle>
        <div className="flex items-center justify-between border-b border-border p-4">
          <MindCrossLogo />
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <nav
          aria-label="Mobile primary"
          className="flex flex-col gap-1 p-4"
        >
          {links.map((link) => (
            <NavLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
              onSelect={close}
              className="px-3 py-3 text-base"
            />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          {user ? (
            <>
              {(() => {
                const dest = primaryDestination(user.role);
                const DestIcon = dest.icon;
                return (
                  <Link
                    href={dest.href}
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <DestIcon className="h-4 w-4" aria-hidden="true" />
                    {dest.label}
                  </Link>
                );
              })()}
              {!user.role || user.role === "client" ? (
                <>
                  <Link
                    href="/account/messages"
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Messages
                    <CountPill count={unread} />
                  </Link>
                  <Link
                    href="/account/friends"
                    onClick={close}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Friends
                    <CountPill count={requests} />
                  </Link>
                </>
              ) : null}
              {/* Clients reach /account via "My sessions" above; therapists and
                  staff get a direct link to their personal account too. */}
              {user.role && user.role !== "client" ? (
                <Link
                  href="/account"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                  My account
                </Link>
              ) : null}
              <form action={signOutAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/login" onClick={close}>
                  Log in
                </Link>
              </Button>
              <Button asChild>
                <Link href="/register" onClick={close}>
                  Sign up
                </Link>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface NavbarProps {
  user?: NavbarUser;
  /** Translated labels for the primary nav (falls back to English). */
  navLabels?: { home: string; find: string; mission: string };
  /** Active interface language (for the language switcher). */
  locale?: Locale;
  /** Unseen activity (friend requests + unread messages) for the account menu. */
  activity?: NavActivity;
}

export function Navbar({
  user = null,
  navLabels,
  locale = DEFAULT_LOCALE,
  activity,
}: NavbarProps) {
  const pathname = usePathname() ?? "/";

  const links: NavLink[] = navLabels
    ? [
        { label: navLabels.home, href: "/" },
        { label: navLabels.find, href: "/find-a-therapist" },
        { label: navLabels.mission, href: "/our-mission" },
      ]
    : NAV_LINKS;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <MindCrossLogo />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {links.map((link) => (
              <NavLinkItem
                key={link.href}
                link={link}
                pathname={pathname}
                className="link-underline"
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {user ? <NavbarActivityPoller /> : null}
          <LanguageSwitcher current={locale} />
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} activity={activity} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
          <MobileMenu
            user={user}
            pathname={pathname}
            links={links}
            activity={activity}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * Periodically re-fetches the server components on the current route so the
 * account-menu activity counts (friend requests, unread messages) stay fresh
 * without a manual reload — a new friend request lights up the dot within ~a
 * minute. `router.refresh()` preserves client state, so it won't disrupt forms.
 */
function NavbarActivityPoller({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
