import Link from "next/link";

import {
  listPendingApplications,
  listTherapistsAdmin,
  type TherapistStatus,
} from "@/modules/therapists";
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
import { TherapistAdminControls } from "./therapist-admin-controls";

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
 * Gated by the `(admin)` layout's `requireAdmin()`. The mutating actions
 * (approve/reject, status change) self-authorize server-side via
 * `getAdminUser()`, so this page does not need to thread the admin's id down.
 */
export default async function AdminTherapistsPage() {
  const [applications, therapists] = await Promise.all([
    listPendingApplications(),
    listTherapistsAdmin(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Therapists</h1>
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
                          <details className="mt-2 max-w-xs">
                            <summary className="cursor-pointer text-xs font-medium text-primary underline-offset-4 hover:underline">
                              View application
                            </summary>
                            <dl className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                              <div className="flex gap-1.5">
                                <dt className="font-medium text-foreground">
                                  Experience:
                                </dt>
                                <dd>
                                  {app.yearsOfExperience != null
                                    ? `${app.yearsOfExperience} year${app.yearsOfExperience === 1 ? "" : "s"}`
                                    : "—"}
                                </dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt className="font-medium text-foreground">
                                  Country:
                                </dt>
                                <dd>{app.country?.trim() || "—"}</dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt className="font-medium text-foreground">
                                  Phone:
                                </dt>
                                <dd>{app.phone?.trim() || "—"}</dd>
                              </div>
                              {app.shortBio?.trim() ? (
                                <p className="whitespace-pre-line pt-1 leading-relaxed">
                                  {app.shortBio.trim()}
                                </p>
                              ) : null}
                            </dl>
                          </details>
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
                            {therapist.status === "active" ? (
                              <Link
                                href={`/therapists/${therapist.slug}`}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                              >
                                {therapist.displayName}
                              </Link>
                            ) : (
                              <div className="font-medium text-foreground">
                                {therapist.displayName}
                              </div>
                            )}
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
                            <div className="flex flex-col items-end gap-2">
                              <TherapistStatusActions
                                therapistId={therapist.id}
                                displayName={therapist.displayName}
                                currentStatus={therapist.status}
                              />
                              <TherapistAdminControls
                                therapistId={therapist.id}
                                displayName={therapist.displayName}
                                verified={therapist.verified}
                                hasLogin={therapist.hasLogin}
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
