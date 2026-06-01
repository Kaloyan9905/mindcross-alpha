import { cn } from "@/lib/utils";

/**
 * A neutral, pulsing placeholder block. Compose several to mirror the shape of
 * content that is still loading (cards, lines, avatars). Decorative only —
 * marked `aria-hidden` so screen readers skip it; pair with an `aria-busy`
 * region or visible "Loading…" text where the wait needs announcing.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
