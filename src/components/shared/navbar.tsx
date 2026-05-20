"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  UserCircle2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
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

type NavLink = {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Find a Therapist", href: "/find-a-therapist" },
  {
    label: "Group Sessions",
    href: "/group-sessions",
    disabled: true,
    badge: "soon",
  },
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

function UserMenu({ user }: { user: NonNullable<NavbarUser> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 px-2"
          aria-label="Open account menu"
        >
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
          <div className="flex flex-col">
            <span className="text-sm font-medium normal-case tracking-normal text-foreground">
              {user.name ?? "Signed in"}
            </span>
            {user.role && (
              <span className="text-xs text-muted-foreground normal-case tracking-normal">
                {user.role}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserCircle2 aria-hidden="true" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <CalendarDays aria-hidden="true" />
            My sessions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/api/auth/signout" method="post" className="w-full">
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
}: {
  user: NavbarUser;
  pathname: string;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "left-auto right-0 top-0 h-dvh w-[85vw] max-w-sm translate-x-0 translate-y-0 rounded-none p-0 sm:rounded-none",
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
          {NAV_LINKS.map((link) => (
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
              <Link
                href="/account"
                onClick={close}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                Account
              </Link>
              <Link
                href="/account"
                onClick={close}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                My sessions
              </Link>
              <form action="/api/auth/signout" method="post">
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
                <Link href="/signup" onClick={close}>
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
}

export function Navbar({ user = null }: NavbarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <MindCrossLogo />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((link) => (
              <NavLinkItem
                key={link.href}
                link={link}
                pathname={pathname}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
          <MobileMenu user={user} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
