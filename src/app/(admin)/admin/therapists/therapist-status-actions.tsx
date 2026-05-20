"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setTherapistStatusAction } from "@/modules/therapists/actions/set-therapist-status";
import {
  THERAPIST_STATUS,
  type TherapistStatus,
} from "@/modules/therapists/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentence-case labels for the therapist lifecycle statuses. */
const STATUS_LABELS: Record<TherapistStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Active",
  paused: "Paused",
  disabled: "Disabled",
};

/**
 * Status changer for a single therapist row.
 *
 * Renders a Select over the full `THERAPIST_STATUS` enum. Picking a value
 * other than the current one calls `setTherapistStatusAction` with the admin's
 * `reviewerId` (passed in from the Server Component page). The action returns
 * a discriminated `{ ok }` result; on failure we toast `error` and leave the
 * Select on its previous value.
 */
export function TherapistStatusActions({
  therapistId,
  displayName,
  currentStatus,
  reviewerId,
}: {
  therapistId: string;
  displayName: string;
  currentStatus: TherapistStatus;
  reviewerId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function changeStatus(next: string) {
    const nextStatus = next as TherapistStatus;
    if (nextStatus === currentStatus) return;

    startTransition(async () => {
      const result = await setTherapistStatusAction({
        therapistId,
        status: nextStatus,
        reviewerId,
      });

      if (!result.ok) {
        toast.error("Couldn't change the status", {
          description: result.error,
        });
        return;
      }

      toast.success(
        `${displayName} is now ${STATUS_LABELS[result.status].toLowerCase()}`,
      );
      router.refresh();
    });
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={changeStatus}
      disabled={pending}
    >
      <SelectTrigger
        className="h-9 w-[170px]"
        aria-label={`Change status for ${displayName}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {THERAPIST_STATUS.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
