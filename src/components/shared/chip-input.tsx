"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Tap-friendly multi-value input. Instead of asking people to type a
 * comma-separated list (developer-y, error-prone), they tap suggestions to add
 * them and tap a chip's × to remove it — and can still type a custom value.
 *
 * Designed for low-digital-literacy mobile users: large tap targets, plain
 * language, no hidden syntax.
 */
export interface ChipInputProps {
  /** Visible label. */
  label: string;
  /** Short helper line under the label. */
  hint?: string;
  /** Current selected values. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Tappable suggestions (already-selected ones are hidden). */
  suggestions?: string[];
  /** Placeholder for the "add your own" input. */
  placeholder?: string;
}

export function ChipInput({
  label,
  hint,
  value,
  onChange,
  suggestions = [],
  placeholder = "Add your own…",
}: ChipInputProps) {
  const [draft, setDraft] = React.useState("");
  const labelId = React.useId();

  const has = (s: string) =>
    value.some((v) => v.trim().toLowerCase() === s.trim().toLowerCase());

  function add(raw: string) {
    const v = raw.trim();
    setDraft("");
    if (!v || has(v)) return;
    onChange([...value, v]);
  }

  function remove(v: string) {
    onChange(value.filter((s) => s !== v));
  }

  const remaining = suggestions.filter((s) => !has(s));

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        {value.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {value.length} selected
          </span>
        ) : null}
      </div>
      {hint ? <p className="-mt-1 text-xs text-muted-foreground">{hint}</p> : null}

      {/* Selected chips — tap to remove */}
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-labelledby={labelId}>
          {value.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {v}
                <X className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Suggestions — tap to add */}
      {remaining.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              aria-label={`Add ${s}`}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Add your own */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              // Empty input + Backspace removes the last chip.
              remove(value[value.length - 1]);
            }
          }}
          // Flush a typed-but-not-added value so it isn't silently lost.
          onBlur={() => add(draft)}
          placeholder={placeholder}
          aria-label={`${label} — add your own`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
