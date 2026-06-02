"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarX, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Deep-import the `"use server"` action files (Next treats them as RPC
// boundaries); importing the @/modules/booking barrel would pull server-only
// code into these client bundles.
import {
  removeBookingAction,
  restoreBookingAction,
} from "@/modules/booking/actions/recycle-booking";
import { cancelBookingAction } from "@/modules/booking/actions/cancel-booking";
import { Button } from "@/components/ui/button";
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

/** Move a session to the recycle bin (soft-delete) after confirmation. */
export function RemoveSessionButton({
  bookingId,
  label,
}: {
  bookingId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function remove() {
    startTransition(async () => {
      const r = await removeBookingAction({ bookingId });
      if (r.ok) {
        toast.success("Moved to the recycle bin", {
          description: "You can restore it for 30 days.",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Couldn't remove the session", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to recycle bin?</DialogTitle>
          <DialogDescription>
            This hides <strong>{label}</strong> from your sessions. It stays in
            the recycle bin for 30 days, where you can restore it with one click.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Removing…" : "Move to recycle bin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Restore a soft-deleted session from the recycle bin (one click). */
export function RestoreSessionButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="gap-1.5"
      onClick={() =>
        startTransition(async () => {
          const r = await restoreBookingAction({ bookingId });
          if (r.ok) {
            toast.success("Session restored");
            router.refresh();
          } else {
            toast.error("Couldn't restore the session", { description: r.error });
          }
        })
      }
    >
      <RotateCcw className="h-4 w-4" aria-hidden="true" />
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}

/**
 * Cancel a session (frees the slot, notifies the client). For the therapist on
 * an upcoming session; the client has their own cancel control.
 */
export function CancelSessionButton({
  bookingId,
  label,
}: {
  bookingId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function cancel() {
    startTransition(async () => {
      const r = await cancelBookingAction({ bookingId });
      if (r.ok) {
        toast.success("Session cancelled", {
          description: "The time slot has been freed and the client notified.",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Couldn't cancel the session", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarX className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            This cancels the session with <strong>{label}</strong>, frees the time
            slot, and notifies them. This can&rsquo;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep session
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={cancel} disabled={pending}>
            {pending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
