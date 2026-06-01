"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { reviewReportAction } from "@/modules/admin/actions/review-report";
import type { ReportListRow } from "@/modules/friends/queries/list-reports";
import type { ReportReason, ReportStatus } from "@/modules/friends/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DATE_FMT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const REASON_LABEL: Record<ReportReason, string> = {
  harassment: "Harassment",
  spam: "Spam",
  inappropriate: "Inappropriate",
  safety_concern: "Safety concern",
  other: "Other",
};

const STATUSES: ReportStatus[] = ["open", "reviewing", "actioned", "dismissed"];

const STATUS_VARIANT: Record<ReportStatus, NonNullable<BadgeProps["variant"]>> = {
  open: "destructive",
  reviewing: "secondary",
  actioned: "success",
  dismissed: "outline",
};

export function ReportsTable({ reports }: { reports: ReportListRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function setStatus(reportId: string, status: ReportStatus) {
    startTransition(async () => {
      const r = await reviewReportAction({ reportId, status });
      if (r.ok) {
        toast.success("Report updated.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No reports. When a client reports someone, it appears here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2">Reported</th>
            <th scope="col" className="px-3 py-2">Reason</th>
            <th scope="col" className="px-3 py-2">From</th>
            <th scope="col" className="px-3 py-2 whitespace-nowrap">When</th>
            <th scope="col" className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr
              key={r.id}
              className="border-b border-border align-top last:border-0"
            >
              <td className="px-3 py-3">
                <div className="font-medium text-foreground">
                  {r.reportedName ?? "(deleted account)"}
                </div>
                {r.details ? (
                  <p className="mt-1 max-w-xs whitespace-pre-line text-xs text-muted-foreground">
                    {r.details}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-3">
                <Badge variant="outline">{REASON_LABEL[r.reason]}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {r.reporterName ?? "—"}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                {DATE_FMT.format(new Date(r.createdAt))}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                    {r.status}
                  </Badge>
                  <Select
                    value={r.status}
                    onValueChange={(v) => setStatus(r.id, v as ReportStatus)}
                    disabled={pending}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
