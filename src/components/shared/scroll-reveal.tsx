"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals its children with a gentle fade + rise when scrolled into view.
 *
 * Degrades safely: the CSS only hides the element once the boot script has
 * marked `<html>` with `.js`, so without JavaScript the content is simply
 * visible. Honors prefers-reduced-motion (reveals immediately, no transition).
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (very old browsers) — reveal next frame. Reduced
    // motion is handled by the global CSS guard (the transition collapses to
    // instant), so the observer path is still fine for those users.
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", visible && "is-visible", className)}
      style={{
        transitionDelay: visible && delayMs ? `${delayMs}ms` : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
