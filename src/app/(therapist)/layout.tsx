import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

import { signOut } from "@/modules/identity";
import { getTherapistForCurrentUser } from "@/modules/therapists";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

import { TherapistNav } from "./therapist-nav";

export const metadata: Metadata = {
  title: "Therapist · MindCross",
  description: "Manage your MindCross profile, availability, and sessions.",
};

/** First word of a name, for a compact greeting. */
function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/**
 * Layout for the `(therapist)` route group — the therapist self-service area.
 *
 * Access gate: `getTherapistForCurrentUser()` resolves the therapist profile
 * linked to the signed-in user. Anyone without a linked therapist profile
 * (anonymous, clients, even admins) is redirected to `/login`. This is the real
 * boundary; the edge middleware only does a coarse cookie pre-check.
 */
export default async function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <Link
            href="/therapist"
            className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="MindCross therapist — go to dashboard"
          >
            MindCross
            <span className="text-muted-foreground">/ Therapist</span>
          </Link>

          <div className="flex items-center gap-4">
            {therapist.status === "active" ? (
              <Link
                href={`/therapists/${therapist.slug}`}
                className="hidden items-center gap-1.5 rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                View public profile
              </Link>
            ) : null}
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-sm font-medium text-foreground">
                {therapist.displayName}
              </span>
              <span className="text-xs text-muted-foreground">
                {therapist.status === "active" ? "Active" : "Pending review"}
              </span>
            </div>
            <ThemeToggle />
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

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <div className="md:sticky md:top-24">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hi, {firstName(therapist.displayName)}
            </p>
            <TherapistNav />
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
