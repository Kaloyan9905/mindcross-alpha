"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";

// Deep-import the `"use server"` action files (Next compiles them to client-safe
// RPC proxies); importing the @/modules/therapists barrel would pull server-only
// query/db code into this client bundle.
import {
  addAvailabilitySlotAction,
  removeAvailabilitySlotAction,
} from "@/modules/therapists/actions/manage-availability";
import {
  addTimeOffAction,
  removeTimeOffAction,
} from "@/modules/therapists/actions/manage-time-off";
import {
  addDays,
  dayBlockBounds,
  daysOfWeek,
  isSameMonth,
  minutesSinceMidnight,
  monthGridDays,
  sameDay,
  startOfDay,
  startOfWeek,
  toDateInput,
  toTimeInput,
} from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Data shapes (serialized from the server) ────────────────────────────────
interface CalSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
}
interface CalSession {
  id: string;
  startsAt: string;
  endsAt: string;
  clientName: string | null;
  status: string;
}
interface CalTimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
}

type EvKind = "open" | "session" | "off";
interface Ev {
  id: string;
  kind: EvKind;
  start: Date;
  end: Date;
  label: string;
}

type View = "month" | "week" | "day";

const WEEK_PX_PER_HOUR = 44;
const DAY_PX_PER_HOUR = 60;

const TIME_FMT = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const DAY_TITLE = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

const LENGTH_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];
const REPEAT_OPTIONS = [
  { value: "1", label: "Just this day" },
  { value: "2", label: "2 weeks" },
  { value: "4", label: "4 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "12", label: "12 weeks" },
];
/** 00:00 → 23:45 in 15-minute steps for the start-time picker. */
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

function weekTitle(d: Date): string {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  const s = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(start);
  const e = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(end);
  return `${s} – ${e}`;
}

// ── A single positioned block in a time grid ────────────────────────────────
function EventBlock({
  ev,
  day,
  pxPerHour,
  onRemove,
}: {
  ev: Ev;
  day: Date;
  pxPerHour: number;
  onRemove: ((ev: Ev) => void) | null;
}) {
  const bounds = dayBlockBounds(ev.start, ev.end, day);
  if (!bounds) return null;
  const top = (bounds.top / 60) * pxPerHour;
  const height = Math.max(16, ((bounds.bottom - bounds.top) / 60) * pxPerHour - 2);

  const styles: Record<EvKind, string> = {
    open: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200",
    session: "bg-primary text-primary-foreground border border-primary",
    off: "bg-muted text-muted-foreground border border-border [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.05)_6px,rgba(0,0,0,0.05)_12px)]",
  };

  return (
    <div
      className={cn(
        "absolute left-1 right-1 z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight",
        ev.kind === "off" && "z-0",
        styles[ev.kind],
      )}
      style={{ top, height }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-medium">{ev.label}</span>
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ev);
            }}
            className="shrink-0 rounded p-0.5 opacity-70 hover:bg-background/40 hover:opacity-100"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {height > 26 ? (
        <span className="block truncate opacity-80">{TIME_FMT.format(ev.start)}</span>
      ) : null}
    </div>
  );
}

// ── Week / Day time grid ────────────────────────────────────────────────────
function TimeGrid({
  days,
  events,
  pxPerHour,
  step,
  now,
  onAddAt,
  onRemove,
}: {
  days: Date[];
  events: Ev[];
  pxPerHour: number;
  step: number;
  now: Date;
  onAddAt: (at: Date) => void;
  onRemove: (ev: Ev) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Open near the working day rather than midnight.
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * pxPerHour;
  }, [pxPerHour]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const gridHeight = 24 * pxPerHour;

  function handleColumnClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = ((e.clientY - rect.top) / pxPerHour) * 60;
    const snapped = Math.max(0, Math.round(minutes / step) * step);
    const at = startOfDay(day);
    at.setMinutes(snapped);
    onAddAt(at);
  }

  return (
    <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto rounded-xl border border-border">
      <div className="flex">
        {/* Hour gutter */}
        <div className="sticky left-0 z-20 w-14 shrink-0 bg-background" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="relative text-right"
              style={{ height: pxPerHour }}
            >
              <span className="absolute -top-2 right-1.5 text-[10px] text-muted-foreground">
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const dayEvents = events.filter((ev) => dayBlockBounds(ev.start, ev.end, day));
            const showNow = sameDay(day, now);
            const nowTop = (minutesSinceMidnight(now) / 60) * pxPerHour;
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-border first:border-l-0"
                style={{ height: gridHeight }}
                onClick={(e) => handleColumnClick(day, e)}
              >
                {/* Hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: h * pxPerHour }}
                  />
                ))}
                {dayEvents.map((ev) => (
                  <EventBlock
                    key={`${ev.kind}-${ev.id}`}
                    ev={ev}
                    day={day}
                    pxPerHour={pxPerHour}
                    onRemove={ev.kind === "session" ? null : onRemove}
                  />
                ))}
                {showNow ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: nowTop }}
                  >
                    <span className="h-2 w-2 -ml-1 rounded-full bg-destructive" />
                    <span className="h-px flex-1 bg-destructive" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month grid ──────────────────────────────────────────────────────────────
function MonthGrid({
  cursor,
  events,
  now,
  onPickDay,
}: {
  cursor: Date;
  events: Ev[];
  now: Date;
  onPickDay: (day: Date) => void;
}) {
  const days = monthGridDays(cursor);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {daysOfWeek(cursor).map((d) => (
          <div key={d.toISOString()} className="py-2">
            {WEEKDAY.format(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const dayEvents = events.filter((ev) => dayBlockBounds(ev.start, ev.end, day));
          const open = dayEvents.filter((e) => e.kind === "open").length;
          const sessions = dayEvents.filter((e) => e.kind === "session").length;
          const off = dayEvents.some((e) => e.kind === "off");
          const today = sameDay(day, now);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPickDay(day)}
              className={cn(
                "flex min-h-[88px] flex-col items-start gap-1 border-b border-l border-border p-2 text-left transition-colors hover:bg-secondary/50 [&:nth-child(7n+1)]:border-l-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-wrap gap-1">
                {open > 0 ? (
                  <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    {open} open
                  </span>
                ) : null}
                {sessions > 0 ? (
                  <span className="rounded bg-primary/15 px-1 text-[10px] font-medium text-primary">
                    {sessions} session{sessions > 1 ? "s" : ""}
                  </span>
                ) : null}
                {off ? (
                  <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                    Off
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Add availability dialog ─────────────────────────────────────────────────
function AddAvailabilityDialog({
  prefill,
  onClose,
  onDone,
}: {
  prefill: { date: string; time: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = React.useState(prefill?.date ?? "");
  const [time, setTime] = React.useState(prefill?.time ?? "09:00");
  const [length, setLength] = React.useState("60");
  const [repeat, setRepeat] = React.useState("1");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const start = date && time ? new Date(`${date}T${time}`) : null;
    if (!start || Number.isNaN(start.getTime())) {
      toast.error("Pick a day and start time.");
      return;
    }
    const durationMs = Number(length) * 60_000;
    const occurrences = Array.from({ length: Number(repeat) }, (_, i) => {
      const s = new Date(start);
      s.setDate(s.getDate() + 7 * i);
      return { startsAt: s.toISOString(), endsAt: new Date(s.getTime() + durationMs).toISOString() };
    });
    startTransition(async () => {
      const r = await addAvailabilitySlotAction({ slots: occurrences });
      if (r.ok) {
        const added = r.added ?? 1;
        toast.success(added === 1 ? "Time added." : `Added ${added} weekly times.`);
        onDone();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add availability</DialogTitle>
          <DialogDescription>
            Open times appear on your public profile so clients can book you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="av-date">Day</Label>
            <Input id="av-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="av-time">Start time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="av-time" className="h-11">
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
            <Label htmlFor="av-length">Length</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger id="av-length" className="h-11">
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
            <Label htmlFor="av-repeat">Repeat weekly</Label>
            <Select value={repeat} onValueChange={setRepeat}>
              <SelectTrigger id="av-repeat" className="h-11">
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
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {pending ? "Adding…" : "Add time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Block time-off dialog ───────────────────────────────────────────────────
function TimeOffDialog({
  defaultDate,
  onClose,
  onDone,
}: {
  defaultDate: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [from, setFrom] = React.useState(defaultDate);
  const [to, setTo] = React.useState(defaultDate);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (!from || !to) {
      toast.error("Pick a start and end day.");
      return;
    }
    const startsAt = new Date(`${from}T00:00`);
    // Inclusive of the last day → block up to the start of the following day.
    const endExclusive = new Date(`${to}T00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    if (Number.isNaN(startsAt.getTime()) || endExclusive <= startsAt) {
      toast.error("The end day must be on or after the start day.");
      return;
    }
    startTransition(async () => {
      const r = await addTimeOffAction({
        startsAt: startsAt.toISOString(),
        endsAt: endExclusive.toISOString(),
        note: note.trim() || undefined,
      });
      if (r.ok) {
        toast.success("Time off blocked.");
        onDone();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block time off</DialogTitle>
          <DialogDescription>
            Mark days as unavailable (vacation, personal time). Any open times in
            the range are cleared so clients can&rsquo;t book them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="off-from">From</Label>
            <Input id="off-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="off-to">To</Label>
            <Input id="off-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="off-note">Note (optional)</Label>
            <Input id="off-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Vacation" className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending} variant="destructive" className="gap-1.5">
            <CalendarOff className="h-4 w-4" aria-hidden="true" />
            {pending ? "Blocking…" : "Block these days"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main calendar ───────────────────────────────────────────────────────────
export function AvailabilityCalendar({
  slots,
  sessions,
  timeOff,
  nowIso,
}: {
  slots: CalSlot[];
  sessions: CalSession[];
  timeOff: CalTimeOff[];
  nowIso: string;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("week");
  const [cursor, setCursor] = React.useState(() => new Date(nowIso));
  const [now, setNow] = React.useState(() => new Date(nowIso));
  const [addPrefill, setAddPrefill] = React.useState<{ date: string; time: string } | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [offOpen, setOffOpen] = React.useState(false);

  // Keep the "now" line fresh.
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const events = React.useMemo<Ev[]>(() => {
    const out: Ev[] = [];
    for (const s of slots) {
      if (s.isBooked) continue; // booked slots are shown via `sessions`
      out.push({ id: s.id, kind: "open", start: new Date(s.startsAt), end: new Date(s.endsAt), label: "Open" });
    }
    for (const s of sessions) {
      if (s.status === "cancelled") continue;
      out.push({
        id: s.id,
        kind: "session",
        start: new Date(s.startsAt),
        end: new Date(s.endsAt),
        label: s.clientName ?? "Booked session",
      });
    }
    for (const t of timeOff) {
      out.push({ id: t.id, kind: "off", start: new Date(t.startsAt), end: new Date(t.endsAt), label: t.note ?? "Time off" });
    }
    return out;
  }, [slots, sessions, timeOff]);

  function shift(dir: -1 | 1) {
    setCursor((c) => {
      if (view === "month") {
        const x = new Date(c);
        x.setMonth(x.getMonth() + dir);
        return x;
      }
      return addDays(c, dir * (view === "week" ? 7 : 1));
    });
  }

  function openAdd(at?: Date) {
    setAddPrefill(at ? { date: toDateInput(at), time: toTimeInput(at) } : { date: toDateInput(cursor), time: "09:00" });
    setAddOpen(true);
  }

  function removeEvent(ev: Ev) {
    startRemove(ev);
  }
  const [, startRemoveTransition] = React.useTransition();
  function startRemove(ev: Ev) {
    startRemoveTransition(async () => {
      const r =
        ev.kind === "off"
          ? await removeTimeOffAction({ id: ev.id })
          : await removeAvailabilitySlotAction({ slotId: ev.id });
      if (r.ok) {
        toast.success(ev.kind === "off" ? "Time off removed." : "Time removed.");
        router.refresh();
      } else {
        toast.error("error" in r ? r.error : "Could not remove.");
      }
    });
  }

  const title = view === "month" ? MONTH_TITLE.format(cursor) : view === "week" ? weekTitle(cursor) : DAY_TITLE.format(cursor);
  const gridDays = view === "week" ? daysOfWeek(cursor) : [startOfDay(cursor)];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <span className="ml-2 min-w-0 text-sm font-semibold">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOffOpen(true)} className="gap-1.5">
            <CalendarOff className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Block time off</span>
          </Button>
          <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add availability
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-500/50 bg-emerald-500/20" /> Open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary" /> Booked session
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-border bg-muted" /> Time off
        </span>
      </div>

      {/* Day headers for week view */}
      {view === "week" ? (
        <div className="flex">
          <div className="w-14 shrink-0" />
          <div className="grid flex-1 grid-cols-7 text-center">
            {gridDays.map((d) => (
              <div key={d.toISOString()} className="pb-1">
                <div className="text-[11px] uppercase text-muted-foreground">{WEEKDAY.format(d)}</div>
                <div
                  className={cn(
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    sameDay(d, now) && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <MonthGrid
          cursor={cursor}
          events={events}
          now={now}
          onPickDay={(day) => {
            setCursor(day);
            setView("day");
          }}
        />
      ) : (
        <TimeGrid
          days={gridDays}
          events={events}
          pxPerHour={view === "day" ? DAY_PX_PER_HOUR : WEEK_PX_PER_HOUR}
          step={view === "day" ? 15 : 30}
          now={now}
          onAddAt={(at) => openAdd(at)}
          onRemove={removeEvent}
        />
      )}

      {addOpen ? (
        <AddAvailabilityDialog
          prefill={addPrefill}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      ) : null}
      {offOpen ? (
        <TimeOffDialog
          defaultDate={toDateInput(cursor)}
          onClose={() => setOffOpen(false)}
          onDone={() => {
            setOffOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
