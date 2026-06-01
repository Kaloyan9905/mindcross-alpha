import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { CrisisLinesView } from "./crisis-lines-view";

export const metadata: Metadata = {
  title: "Get urgent help — MindCross",
  description:
    "Crisis helplines by region, plus international support. If you're in immediate danger, call your local emergency number.",
};

export default function CrisisSupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16 lg:px-8">
      <header className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
          <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          You&rsquo;re not alone
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          MindCross is for ongoing support, not emergencies. If you&rsquo;re in
          danger or thinking about harming yourself, please reach out now — these
          lines are free and confidential.
        </p>
      </header>

      {/* Immediate-danger banner */}
      <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-sm font-medium text-foreground">
          In immediate danger? Call your local emergency number right away —{" "}
          <a href="tel:112" className="font-semibold text-destructive underline-offset-4 hover:underline">
            112
          </a>{" "}
          across the EU.
        </p>
      </div>

      <CrisisLinesView />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        These numbers are a starting point and may change. When you&rsquo;re
        safe, you can build a personal{" "}
        <Link href="/account/safety-plan" className="text-primary underline-offset-4 hover:underline">
          safety plan
        </Link>{" "}
        to keep close.
      </p>
    </div>
  );
}
