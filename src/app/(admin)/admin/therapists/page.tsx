import { Inbox, Users } from "lucide-react";

import {
  listPendingApplications,
  listTherapistsAdmin,
  type TherapistStatus,
} from "@/modules/therapists";
import { requireAdmin } from "@/modules/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

import { ApplicationActions } from "./application-actions";
import { TherapistStatusActions } from "./therapist-status-actions";

/** Shared date formatter — short, locale-aware (DESIGN: dates via Intl). */
const DATE_FMT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Map a therapist status to a Badge variant + label. */
function statusBadge(status: TherapistStatus): {
  variant: BadgeProps["variant"];
  label: string;
} {
  switch (status) {
    case "active":
      return { variant: "accent", label: "Active" };
    case "pending_review":
      return { variant: "tertiary", label: "Pending review" };
    case "paused":
      return { variant: "secondary", label: "Paused" };
    case "disabled":
      return { variant: "destructive", label: "Disabled" };
    case "draft":
    default:
      return { variant: "outline", label: "Draft" };
  }
}

/** Render a list of tags, or an em dash when empty. */
function TagList({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Therapists admin page — `/admin/therapists`.
 *
 * Two sections:
 *   1. Pending applications — review queue. Approve/Reject per row.
 *   2. All therapists — the full directory with a per-row status changer.
 *
 * Gated by the `(admin)` layout's `requireAdmin()`. We call `requireAdmin()`
 * again here only to obtain the admin's id, which the action components need
 * as `reviewerId`.
 */
export default async function AdminTherapistsPage() {
  const admin = await requireAdmin();

  const [applications, therapists] = await Promise.all([
    listPendingApplications(),
    listTherapistsAdmin(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Therapists
        </h1>
        <p className="text-sm text-muted-foreground">
          Review incoming applications and manage the therapist directory.
        </p>
      </header>

      {/* --- Pending applications -------------------------------------- */}
      <section aria-labelledby="pending-applications-heading">
        <Card>
          <CardHeader>
            <CardTitle
              id="pending-applications-heading"
              className="flex items-center gap-2"
            >
              <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              Pending applications
              <Badge variant="secondary">{applications.length}</Badge>
            </CardTitle>
            <CardDescription>
              Applications waiting on a decision. Approving one creates a
              therapist profile in pending review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No applications are waiting for review right now.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2">
                        Applicant
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Languages
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Specializations
                      </th>
                      <th scope="col" className="px-3 py-2 whitespace-nowrap">
                        Submitted
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Decision
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-border last:border-0 align-top"
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">
                            {app.fullName}
                          </div>
                          <div className="text-muted-foreground">
                            {app.email}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <TagList items={app.languages} />
                        </td>
                        <td className="px-3 py-3">
                          <TagList items={app.specializations} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {DATE_FMT.format(app.submittedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end">
                            <ApplicationActions
                              applicationId={app.id}
                              applicantName={app.fullName}
                              reviewerId={admin.id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* --- All therapists ------------------------------------------- */}
      <section aria-labelledby="all-therapists-heading">
        <Card>
          <CardHeader>
            <CardTitle
              id="all-therapists-heading"
              className="flex items-center gap-2"
            >
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              All therapists
              <Badge variant="secondary">{therapists.length}</Badge>
            </CardTitle>
            <CardDescription>
              Every therapist profile, regardless of status. Use the status
              control to activate or pause a therapist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {therapists.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No therapist profiles yet. Approve an application to create the
                first one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2">
                        Therapist
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2 whitespace-nowrap">
                        Created
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Change status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {therapists.map((therapist) => {
                      const badge = statusBadge(therapist.status);
                      return (
                        <tr
                          key={therapist.id}
                          className="border-b border-border last:border-0 align-middle"
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">
                              {therapist.displayName}
                            </div>
                            <div className="text-muted-foreground">
                              {therapist.email}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {DATE_FMT.format(therapist.createdAt)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end">
                              <TherapistStatusActions
                                therapistId={therapist.id}
                                displayName={therapist.displayName}
                                currentStatus={therapist.status}
                                reviewerId={admin.id}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
