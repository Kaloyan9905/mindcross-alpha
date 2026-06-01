"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

/** Apply a theme choice to <html> (mirrors the no-flash script in layout). */
function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  // One object so the mount-time external read is a single setState. Until
  // `mounted` is true we render a stable neutral icon (no hydration mismatch).
  const [{ theme, mounted }, setState] = React.useState<{
    theme: Theme;
    mounted: boolean;
  }>({ theme: "system", mounted: false });

  React.useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "system";
    // Deliberate external→React sync on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ theme: saved, mounted: true });
  }, []);

  // While on "system", follow OS changes live.
  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function choose(next: Theme) {
    setState((s) => ({ ...s, theme: next }));
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore storage failures (private mode etc.)
    }
    applyTheme(next);
  }

  // Until mounted, render a stable neutral icon to avoid a hydration mismatch.
  const Active = !mounted
    ? Sun
    : (OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Active className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <DropdownMenuItem
              key={o.value}
              onClick={() => choose(o.value)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4" />
                {o.label}
              </span>
              {mounted && theme === o.value ? (
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
