import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-foreground"
      >
        MindCross
      </Link>
      <p className="mt-10 text-sm font-medium text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        We couldn&rsquo;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        The page you&rsquo;re looking for may have moved, or the link might be
        incomplete.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/find-a-therapist">Find a therapist</Link>
        </Button>
      </div>
      <p className="mx-auto mt-12 max-w-md text-xs text-muted-foreground">
        In a crisis or emergency, please call your local emergency number
        (112 in the EU) or a crisis line right away.
      </p>
    </div>
  );
}
