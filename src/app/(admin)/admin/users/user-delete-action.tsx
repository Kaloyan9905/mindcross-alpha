"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

// Deep-import the `"use server"` action file (Next treats it as an RPC
// boundary). Importing the `@/modules/admin` barrel here would pull server-only
// policy/auth code into this client bundle.
import { deleteUserAction } from "@/modules/admin/actions/delete-user";
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
 * Delete (erase) a single user account. Opens a confirmation dialog and calls
 * the admin-guarded `deleteUserAction`. On success, refreshes so the row
 * disappears. This is the GDPR "right to erasure" control.
 */
export function UserDeleteAction({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAction({ userId });
      if (result.ok) {
        toast.success(`Deleted ${userLabel}`, {
          description: "Their personal data has been erased.",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Couldn't delete the account", { description: result.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Erase this account?</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong>{userLabel}</strong> and their
            bookings, and frees any upcoming session slots they held. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep account
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Yes, erase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
