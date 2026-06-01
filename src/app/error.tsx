"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Renders a calm, on-brand recovery screen with a retry
 * instead of Next's bare error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-foreground"
      >
        MindCross
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Sorry — something didn&rsquo;t load as it should. Please try again.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
      <p className="mx-auto mt-12 max-w-md text-xs text-muted-foreground">
        In a crisis or emergency, please call your local emergency number
        (112 in the EU) or a crisis line right away.
      </p>
    </div>
  );
}
