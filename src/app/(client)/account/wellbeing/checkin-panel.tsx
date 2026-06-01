"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { createCheckinAction } from "@/modules/wellbeing/actions/create-checkin";
import type { CheckinRow } from "@/modules/wellbeing/queries/list-checkins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, label: "Very low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

const FEELINGS = [
  "Anxious",
  "Sad",
  "Lonely",
  "Homesick",
  "Overwhelmed",
  "Stressed",
  "Tired",
  "Angry",
  "Calm",
  "Hopeful",
  "Grateful",
  "Okay",
];

function moodBar(mood: number): string {
  if (mood <= 1) return "bg-destructive/70";
  if (mood === 2) return "bg-destructive/45";
  if (mood === 3) return "bg-muted-foreground/40";
  if (mood === 4) return "bg-success/60";
  return "bg-success";
}

function moodLabel(mood: number): string {
  return MOODS.find((m) => m.value === mood)?.label ?? "Okay";
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function CheckinPanel({
  initialCheckins,
}: {
  initialCheckins: CheckinRow[];
}) {
  const router = useRouter();
  const [checkins, setCheckins] = React.useState(initialCheckins);
  const [mood, setMood] = React.useState<number | null>(null);
  const [feelings, setFeelings] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [share, setShare] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function toggleFeeling(f: string) {
    setFeelings((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  function submit() {
    if (mood === null) {
      toast.error("Choose how you're feeling first.");
      return;
    }
    startTransition(async () => {
      const r = await createCheckinAction({
        mood,
        feelings,
        note: note.trim() || undefined,
        sharedWithTherapist: share,
      });
      if (r.ok) {
        toast.success("Checked in. Thank you for taking a moment.");
        // Optimistically prepend so the trend updates instantly.
        setCheckins((prev) => [
          {
            id: r.id,
            mood,
            feelings: [...new Set(feelings)],
            note: note.trim() || null,
            sharedWithTherapist: share,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setMood(null);
        setFeelings([]);
        setNote("");
        setShare(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  // Trend = last 14 check-ins, chronological (oldest → newest).
  const trend = [...checkins].slice(0, 14).reverse();

  return (
    <div className="space-y-8">
      {/* Check-in form */}
      <Card>
        <CardContent className="space-y-5 py-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">How are you feeling today?</p>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  aria-pressed={mood === m.value}
                  className={cn(
                    "flex min-h-11 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition-colors",
                    mood === m.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", moodBar(m.value))} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Anything you&rsquo;re feeling?{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFeeling(f)}
                  aria-pressed={feelings.includes(f)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors",
                    feelings.includes(f)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-secondary/50",
                  )}
                >
                  {feelings.includes(f) ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a note for yourself (optional)…"
            aria-label="Note"
          />

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
            />
            <span className="text-muted-foreground">
              Share this with my therapist, so they can see how I&rsquo;ve been
              between sessions.
            </span>
          </label>

          <Button onClick={submit} disabled={pending} className="w-full sm:w-auto">
            {pending ? "Saving…" : "Check in"}
          </Button>
        </CardContent>
      </Card>

      {/* Trend */}
      {trend.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Your recent mood</h2>
          <Card>
            <CardContent className="py-5">
              <div className="flex h-28 items-end justify-between gap-1.5">
                {trend.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-1 flex-col items-center justify-end"
                    title={`${moodLabel(c.mood)} · ${DATE_FMT.format(new Date(c.createdAt))}`}
                  >
                    <div
                      className={cn(
                        "w-full max-w-6 rounded-t-md transition-all",
                        moodBar(c.mood),
                      )}
                      style={{ height: `${(c.mood / 5) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Last {trend.length} check-in{trend.length === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* History */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">History</h2>
        {checkins.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No check-ins yet. Your first one is above whenever you&rsquo;re
              ready.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {checkins.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className={cn("h-2.5 w-2.5 rounded-full", moodBar(c.mood))} />
                        {moodLabel(c.mood)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {DATE_FMT.format(new Date(c.createdAt))}
                      </span>
                      {c.sharedWithTherapist ? (
                        <Badge variant="accent" className="px-1.5 py-0 text-[10px]">
                          Shared
                        </Badge>
                      ) : null}
                    </div>
                    {c.feelings.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.feelings.map((f) => (
                          <Badge key={f} variant="secondary" className="font-normal">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {c.note ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {c.note}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
