"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { toast } from "sonner";

// Deep-import the `"use server"` action (Next treats it as an RPC boundary);
// importing the @/modules/admin barrel would pull server-only policy code into
// this client bundle.
import { setUserRoleAction } from "@/modules/admin/actions/set-user-role";
import type { UserRole } from "@/modules/identity/db/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "therapist", label: "Therapist" },
  { value: "admin_ops", label: "Admin · Ops" },
  { value: "admin_clinical", label: "Admin · Clinical" },
  { value: "admin_support", label: "Admin · Support" },
  { value: "admin_super", label: "Admin · Super" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Superuser-only control to change a user's platform role. Opens a dialog with a
 * role picker and calls the admin-guarded `setUserRoleAction`. On success it
 * refreshes so the row's role badge updates. The new role takes effect on the
 * target's next request (the auth `jwt` callback refreshes role from the DB).
 */
export function UserRoleDialog({
  userId,
  userLabel,
  currentRole,
}: {
  userId: string;
  userLabel: string;
  currentRole: UserRole;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>(currentRole);
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const result = await setUserRoleAction({ userId, role });
      if (result.ok) {
        toast.success(`Updated ${userLabel}'s role`, {
          description: `Now ${ROLE_LABEL[role]}. Takes effect on their next request.`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Couldn't change the role", { description: result.error });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setRole(currentRole);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="h-4 w-4" aria-hidden="true" />
          Change role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Set the platform role for <strong>{userLabel}</strong>. Admin roles
            grant access to this staff console — assign them carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === "therapist" ? (
            <p className="text-xs text-muted-foreground">
              A therapist also needs a profile to appear in the directory —
              create one from the Therapists section.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || role === currentRole}>
            {pending ? "Saving…" : "Save role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
