"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { reviewApplicationAction } from "@/modules/therapists/actions/review-application";
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
 * Approve / Reject controls for a single therapist application.
 *
 * The action self-authorizes server-side (`getAdminUser()`) and derives the
 * reviewer from the verified session. Rejection is IRREVERSIBLE (the action
 * refuses to re-process), so it is gated behind a confirmation dialog.
 */
export function ApplicationActions({
  applicationId,
  applicantName,
}: {
  applicationId: string;
  applicantName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [rejectOpen, setRejectOpen] = React.useState(false);

  function review(decision: "approve" | "reject") {
    startTransition(async () => {
      const result = await reviewApplicationAction({ applicationId, decision });

      if (!result.ok) {
        toast.error("Couldn't update the application", {
          description: result.error,
        });
        return;
      }

      if (result.decision === "approve") {
        toast.success(`Approved ${applicantName}`, {
          description: "A therapist profile was created in pending review.",
        });
      } else {
        toast.success(`Rejected ${applicantName}'s application`);
        setRejectOpen(false);
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => review("approve")}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        Approve
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            <X className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this application?</DialogTitle>
            <DialogDescription>
              This permanently rejects {applicantName}&rsquo;s application — it
              can&rsquo;t be reviewed again afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={pending}>
                Keep for review
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => review("reject")}
            >
              {pending ? "Rejecting…" : "Yes, reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
