"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { setTherapistVerifiedAction } from "@/modules/therapists/actions/set-therapist-verified";
import { createTherapistLoginAction } from "@/modules/admin/actions/create-therapist-login";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Per-therapist admin controls: toggle the Verified badge and provision a
 * therapist login. The created credentials are shown once in a dialog.
 */
export function TherapistAdminControls({
  therapistId,
  displayName,
  verified,
  hasLogin,
}: {
  therapistId: string;
  displayName: string;
  verified: boolean;
  hasLogin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [creds, setCreds] = React.useState<{
    email: string;
    tempPassword: string | null;
    note: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function copyCreds() {
    if (!creds) return;
    const text = creds.tempPassword
      ? `Email: ${creds.email}\nTemporary password: ${creds.tempPassword}`
      : `Email: ${creds.email}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — please select and copy manually.");
    }
  }

  function toggleVerified() {
    startTransition(async () => {
      const result = await setTherapistVerifiedAction({
        therapistId,
        verified: !verified,
      });
      if (result.ok) {
        toast.success(
          result.verified
            ? `${displayName} is now verified`
            : `Removed verification from ${displayName}`,
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function createLogin() {
    startTransition(async () => {
      const result = await createTherapistLoginAction({ therapistId });
      if (result.ok) {
        setCreds({
          email: result.email,
          tempPassword: result.tempPassword,
          note: result.note,
        });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant={verified ? "secondary" : "outline"}
        size="sm"
        disabled={pending}
        onClick={toggleVerified}
        className="gap-1.5"
        title={
          verified
            ? "Identity and credentials confirmed. Click to remove the badge."
            : "Mark this therapist as identity- and credential-checked."
        }
      >
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        {verified ? "Verified" : "Verify"}
      </Button>

      {hasLogin ? (
        <span className="text-xs text-muted-foreground">Has login</span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={createLogin}
          className="gap-1.5"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Create login
        </Button>
      )}

      <Dialog
        open={creds !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreds(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Therapist login</DialogTitle>
            <DialogDescription>{creds?.note}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email: </span>
              <code className="font-mono">{creds?.email}</code>
            </div>
            {creds?.tempPassword ? (
              <div>
                <span className="text-muted-foreground">Temp password: </span>
                <code className="font-mono">{creds.tempPassword}</code>
              </div>
            ) : null}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={copyCreds}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy details"}
            </Button>
            <Button onClick={() => setCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
