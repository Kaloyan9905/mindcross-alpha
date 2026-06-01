import { Skeleton } from "@/components/ui/skeleton";

/** One placeholder booking row matching the real `BookingCard` shape. */
function BookingCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-5 shadow-soft">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="hidden h-9 w-24 rounded-lg sm:block" />
    </div>
  );
}

/**
 * Route-level loading UI for `/account`. Mirrors the heading + a short list of
 * sessions so the page shape appears immediately while bookings load.
 */
export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <div className="mt-10 space-y-4" aria-busy="true" aria-label="Loading your sessions">
        <Skeleton className="h-10 w-56 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
