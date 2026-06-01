"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addAvailabilitySlotAction,
  removeAvailabilitySlotAction,
} from "@/modules/therapists/actions/manage-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SlotView {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  isBooked: boolean;
}

const RANGE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME_FMT = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const PREVIEW_DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Times from 07:00 to 21:00 in 30-minute steps. */
const TIME_OPTIONS = Array.from({ length: (21 - 7) * 2 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

const LENGTH_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1 hour 30 minutes" },
];

const REPEAT_OPTIONS = [
  { value: "1", label: "Just this day" },
  { value: "2", label: "2 weeks" },
  { value: "4", label: "4 weeks" },
  { value: "6", label: "6 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "12", label: "12 weeks" },
];

/** Today as YYYY-MM-DD (for the date input's min). */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Advance a YYYY-MM-DD string by `days`, returning the same format. */
function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AvailabilityManager({ slots }: { slots: SlotView[] }) {
  const router = useRouter();
  const today = React.useMemo(() => todayStr(), []);
  const [date, setDate] = React.useState(today);
  const [time, setTime] = React.useState("09:00");
  const [length, setLength] = React.useState("60");
  const [repeatWeeks, setRepeatWeeks] = React.useState("1");
  const [pending, startTransition] = React.useTransition();

  // Build the start/end instants from the friendly inputs.
  const start = date && time ? new Date(`${date}T${time}`) : null;
  const end =
    start && !Number.isNaN(start.getTime())
      ? new Date(start.getTime() + Number(length) * 60_000)
      : null;

  function add() {
    if (!start || !end || Number.isNaN(start.getTime())) {
      toast.error("Please choose a day and start time.");
      return;
    }
    // Expand the weekly recurrence HERE, in the user's own timezone, so each
    // occurrence keeps the same wall-clock time even across a DST change
    // (setDate advances the local calendar day; a fixed +7×24h offset would
    // drift by an hour). The server receives concrete instants.
    const weeks = Number(repeatWeeks);
    const durationMs = end.getTime() - start.getTime();
    const occurrences = Array.from({ length: weeks }, (_, i) => {
      const s = new Date(start);
      s.setDate(s.getDate() + 7 * i);
      const e = new Date(s.getTime() + durationMs);
      return { startsAt: s.toISOString(), endsAt: e.toISOString() };
    });

    startTransition(async () => {
      const result = await addAvailabilitySlotAction({ slots: occurrences });
      if (result.ok) {
        const added = result.added ?? 1;
        const skipped = result.skipped ?? 0;
        toast.success(
          added === 1
            ? "Time added."
            : `Added ${added} weekly times${skipped > 0 ? ` (${skipped} skipped — you already had those times)` : ""}.`,
        );
        // Advance a day so the therapist can quickly add the next one without
        // re-typing or colliding with what they just added.
        setDate((d) => addDaysToStr(d, 1));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(slotId: string) {
    startTransition(async () => {
      const result = await removeAvailabilitySlotAction({ slotId });
      if (result.ok) {
        toast.success("Time removed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Add a time — plain pickers, no raw datetime field */}
      <div className="rounded-lg border border-border p-4">
        <p className="mb-4 text-sm font-medium">Add a time you can see clients</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="slot-date">Day</Label>
            <Input
              id="slot-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-time">Start time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="slot-time" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-length">Length</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger id="slot-length" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTH_OPTIONS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-repeat">Repeat weekly</Label>
            <Select value={repeatWeeks} onValueChange={setRepeatWeeks}>
              <SelectTrigger id="slot-repeat" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPEAT_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {start && end && !Number.isNaN(start.getTime()) ? (
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            You&rsquo;ll be available on{" "}
            <span className="font-medium text-foreground">
              {PREVIEW_DAY_FMT.format(start)}
            </span>{" "}
            from{" "}
            <span className="font-medium text-foreground">
              {TIME_FMT.format(start)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">{TIME_FMT.format(end)}</span>
            {repeatWeeks !== "1" ? (
              <>
                , repeating every week for{" "}
                <span className="font-medium text-foreground">
                  {repeatWeeks} weeks
                </span>
              </>
            ) : null}
            .
          </p>
        ) : null}

        <Button onClick={add} disabled={pending} className="mt-4 gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add this time
        </Button>
      </div>

      {/* Existing times */}
      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          You haven&rsquo;t added any times yet. Add one above so clients can book
          you.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-foreground">
                  {RANGE_FMT.format(new Date(slot.startsAt))} &ndash;{" "}
                  {TIME_FMT.format(new Date(slot.endsAt))}
                </span>
                {slot.isBooked ? (
                  <Badge variant="accent">Booked</Badge>
                ) : (
                  <Badge variant="outline">Open</Badge>
                )}
              </div>
              {slot.isBooked ? (
                <span className="text-xs text-muted-foreground">
                  Cancel the booking to free this
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => remove(slot.id)}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
