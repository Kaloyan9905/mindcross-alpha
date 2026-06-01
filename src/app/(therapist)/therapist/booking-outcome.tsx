"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Deep-import the "use server" action (RPC boundary) — not the booking barrel,
// which would pull server-only code into this client bundle.
import { setBookingOutcomeAction } from "@/modules/booking/actions/set-booking-outcome";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Record the outcome of a session (completed / no-show) + private notes. */
export function BookingOutcome({
  bookingId,
  clientLabel,
  currentStatus,
  currentNotes,
}: {
  bookingId: string;
  clientLabel: string;
  currentStatus: string;
  currentNotes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // No default — the therapist must choose, so a stray click can't record a
  // false "completed".
  const [outcome, setOutcome] = React.useState<"completed" | "no_show" | null>(
    currentStatus === "no_show"
      ? "no_show"
      : currentStatus === "completed"
        ? "completed"
        : null,
  );
  const [notes, setNotes] = React.useState(currentNotes ?? "");
  const [pending, startTransition] = React.useTransition();

  const alreadyMarked = currentStatus === "completed" || currentStatus === "no_show";

  function save() {
    if (!outcome) return;
    startTransition(async () => {
      const result = await setBookingOutcomeAction({
        bookingId,
        outcome,
        therapistNotes: notes.trim().length > 0 ? notes.trim() : undefined,
      });
      if (result.ok) {
        toast.success("Session updated.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {alreadyMarked ? "Edit outcome" : "Record outcome"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record session outcome</DialogTitle>
          <DialogDescription>
            How did your session with {clientLabel} go? Notes are private to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={outcome === "completed" ? "default" : "outline"}
              size="sm"
              aria-pressed={outcome === "completed"}
              onClick={() => setOutcome("completed")}
            >
              Completed
            </Button>
            <Button
              type="button"
              variant={outcome === "no_show" ? "default" : "outline"}
              size="sm"
              aria-pressed={outcome === "no_show"}
              onClick={() => setOutcome("no_show")}
            >
              No-show
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${bookingId}`}>Private notes (optional)</Label>
            <Textarea
              id={`notes-${bookingId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Anything you want to remember for next time."
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || !outcome}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
