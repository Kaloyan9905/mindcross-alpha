import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/modules/identity";
import { listCheckins } from "@/modules/wellbeing";
import { CheckinPanel } from "./checkin-panel";

export const metadata: Metadata = { title: "Wellbeing — MindCross" };

export default async function WellbeingPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const checkins = await listCheckins(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Wellbeing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick check-in with yourself. Keep it private, or share it with your
          therapist so your sessions can build on it.
        </p>
      </header>
      <CheckinPanel initialCheckins={checkins} />

      <Link
        href="/account/safety-plan"
        className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40"
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Your safety plan</span>
          <span className="block text-sm text-muted-foreground">
            A private plan to keep close for hard moments.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </div>
  );
}
