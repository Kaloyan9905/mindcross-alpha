"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight poller: re-fetches the server component on an interval so new
 * messages appear without a realtime service (the pure-programming constraint).
 * Renders nothing.
 */
export function MessagesRefresher({ intervalMs = 25000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
