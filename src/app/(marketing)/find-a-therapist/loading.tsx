import { Skeleton } from "@/components/ui/skeleton";

/** One placeholder card matching the real `TherapistCard` shape. */
function TherapistCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Route-level loading UI for `/find-a-therapist`. Shown while the page's server
 * data (filter options + results) resolves, so the user sees the page shape
 * immediately instead of a blank screen.
 */
export default function FindATherapistLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16 lg:px-8">
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <Skeleton className="mt-8 h-24 w-full rounded-xl" />

      <div className="mt-10">
        <Skeleton className="mb-6 h-4 w-48" />
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading therapists"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <TherapistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
