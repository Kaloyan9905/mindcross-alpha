import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";

import { signOut } from "@/modules/identity";
import { requireAdmin } from "@/modules/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { AdminSidebarNav } from "./admin-nav";

export const metadata: Metadata = {
  title: "Admin · MindCross",
  description: "MindCross staff console.",
};

/** Human-readable label for a staff role string (e.g. `admin_ops` -> "Ops"). */
function staffRoleLabel(role: string): string {
  const suffix = role.startsWith("admin_") ? role.slice("admin_".length) : role;
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/** First word of a name, for a compact greeting. Falls back to "there". */
function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/**
 * Layout for the `(admin)` route group — the MindCross staff console.
 *
 * The access gate: `requireAdmin()` runs first thing on every render. It reads
 * the DB-backed session and `redirect()`s any non-staff request to `/login`,
 * so every page nested under this layout is unreachable by clients,
 * therapists, and anonymous visitors. (The edge middleware only does a coarse
 * cookie-presence pre-check; this is the real boundary.)
 *
 * The chrome is deliberately distinct from the public `Navbar`/`Footer`: a
 * fixed sidebar + a thin top bar, signalling "internal tool", not "marketing
 * site".
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="MindCross admin — go to dashboard"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-heading text-base font-bold tracking-tight">
              MindCross
            </span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Staff console
            </Badge>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-sm font-medium text-foreground">
                {admin.name ?? admin.email ?? "Staff member"}
              </span>
              <span className="text-xs text-muted-foreground">
                {staffRoleLabel(admin.role)}
              </span>
            </div>
            {/*
              Sign out: a form posting to an inline Server Action that calls
              Auth.js `signOut`. `signOut` clears the session row + cookie and
              redirects, so no client JS is needed here.
            */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm md:sticky md:top-20">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hi, {firstName(admin.name)}
            </p>
            <AdminSidebarNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
