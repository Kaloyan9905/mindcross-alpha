"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { reviewApplicationAction } from "@/modules/therapists/actions/review-application";
import { Button } from "@/components/ui/button";

/**
 * Approve / Reject controls for a single therapist application.
 *
 * `reviewerId` is the authenticated admin's user id — it is passed in as a
 * prop from the Server Component page (which has it from `requireAdmin()`).
 * This component never reads the session itself.
 *
 * `reviewApplicationAction` returns a discriminated `{ ok }` result and never
 * throws for expected failures; we render its `error` via a toast.
 */
export function ApplicationActions({
  applicationId,
  applicantName,
  reviewerId,
}: {
  applicationId: string;
  applicantName: string;
  reviewerId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function review(decision: "approve" | "reject") {
    startTransition(async () => {
      const result = await reviewApplicationAction({
        applicationId,
        decision,
        reviewerId,
      });

      if (!result.ok) {
        toast.error("Couldn't update the application", {
          description: result.error,
        });
        return;
      }

      if (result.decision === "approve") {
        toast.success(`Approved ${applicantName}`, {
          description:
            "A therapist profile was created in pending review. Finish it in Drizzle Studio.",
        });
      } else {
        toast.success(`Rejected ${applicantName}'s application`);
      }

      // Re-fetch the Server Component so the row leaves the pending list.
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => review("reject")}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Reject
      </Button>
    </div>
  );
}
