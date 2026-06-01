"use client";

import * as React from "react";
import { ExternalLink, Phone } from "lucide-react";

import {
  CRISIS_REGIONS,
  UNIVERSAL_LINES,
  type CrisisLine,
} from "@/modules/safety/lib/crisis-lines";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function isPhone(value: string): boolean {
  return /^[0-9 +]+$/.test(value);
}

function LineRow({ line }: { line: CrisisLine }) {
  const phone = isPhone(line.number);
  const href = phone
    ? `tel:${line.number.replace(/\s+/g, "")}`
    : `https://${line.number.replace(/^https?:\/\//, "")}`;
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-medium">{line.name}</p>
        {line.note ? (
          <p className="text-sm text-muted-foreground">{line.note}</p>
        ) : null}
        {line.hours ? (
          <p className="text-xs text-muted-foreground">{line.hours}</p>
        ) : null}
      </div>
      <a
        href={href}
        target={phone ? undefined : "_blank"}
        rel={phone ? undefined : "noopener noreferrer"}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/92"
      >
        {phone ? (
          <Phone className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        )}
        {line.number}
      </a>
    </div>
  );
}

export function CrisisLinesView() {
  const [code, setCode] = React.useState(CRISIS_REGIONS[0].code);
  const active =
    CRISIS_REGIONS.find((r) => r.code === code) ?? CRISIS_REGIONS[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium">Where are you right now?</p>
        <div className="flex flex-wrap gap-2">
          {CRISIS_REGIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => setCode(r.code)}
              aria-pressed={code === r.code}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                code === r.code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary/50",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-border py-2">
          {active.lines.map((line) => (
            <LineRow key={`${line.name}-${line.number}`} line={line} />
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Anywhere in the world</h2>
        <Card>
          <CardContent className="divide-y divide-border py-2">
            {UNIVERSAL_LINES.map((line) => (
              <LineRow key={line.name} line={line} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
