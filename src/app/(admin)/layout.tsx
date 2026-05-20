import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { signOut } from "@/modules/identity";
import { requireAdmin } from "@/modules/admin";
import { Button } from "@/components/ui/button";

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
 * the session and `redirect()`s any non-staff request to `/login`, so every
 * page nested under this layout is unreachable by clients, therapists, and
 * anonymous visitors. (The edge middleware only does a coarse cookie-presence
 * pre-check; this is the real boundary.)
 *
 * Minimalist chrome: a thin hairline top bar and a plain sidebar — restrained,
 * white, no heavy color.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="MindCross admin — go to dashboard"
          >
            MindCross
            <span className="text-muted-foreground">/ Staff console</span>
          </Link>

          <div className="flex items-center gap-4">
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
              Auth.js `signOut`. `signOut` clears the session + cookie and
              redirects, so no client JS is needed here.
            */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <div className="md:sticky md:top-24">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
