import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { getCurrentUser } from "@/modules/identity";
import { getSafetyPlan } from "@/modules/safety";
import { SafetyPlanForm } from "./safety-plan-form";

export const metadata: Metadata = { title: "My safety plan — MindCross" };

export default async function SafetyPlanPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const plan = await getSafetyPlan(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My safety plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A private plan for hard moments — only you can see it. Fill in whatever
          helps; you can come back and change it any time.
        </p>
      </header>

      <Link
        href="/crisis-support"
        className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm transition-colors hover:border-primary/40"
      >
        <LifeBuoy className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <span className="font-medium text-foreground">Need help right now?</span>{" "}
          <span className="text-muted-foreground">
            See crisis lines for your region →
          </span>
        </span>
      </Link>

      <SafetyPlanForm plan={plan} />
    </div>
  );
}
