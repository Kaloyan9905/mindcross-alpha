"use client";

import * as React from "react";
import { toast } from "sonner";

// Deep-import the "use server" action file (RPC boundary), not the identity
// barrel, so server-only code (argon2/auth) stays out of this client bundle.
import { requestDeletionAction } from "@/modules/identity/actions/request-deletion";
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

/**
 * Self-service GDPR "right to erasure" request — intentionally LOW-KEY.
 *
 * The entry point is a small, muted text link (no red, no big button) tucked at
 * the very bottom of the account page, far from the everyday actions. The
 * danger styling lives only inside the confirmation dialog, where it belongs.
 */
export function AccountDeletion() {
  const [open, setOpen] = React.useState(false);
  const [requested, setRequested] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleRequest() {
    startTransition(async () => {
      const result = await requestDeletionAction();
      if (result.ok) {
        setRequested(true);
        setOpen(false);
        toast.success("Your deletion request has been received.", {
          description: "Our team will erase your account and confirm by email.",
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  if (requested) {
    return (
      <p className="text-xs text-muted-foreground">
        Account deletion requested — our team will be in touch by email.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Delete my account
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            We&rsquo;ll erase your account and personal data, and cancel any
            upcoming sessions. This can&rsquo;t be undone. You can also email
            privacy@mindcross.local.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep my account
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleRequest} disabled={pending}>
            {pending ? "Sending…" : "Delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
