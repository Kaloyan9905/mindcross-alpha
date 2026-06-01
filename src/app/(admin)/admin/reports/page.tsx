import { listReports } from "@/modules/friends";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ReportsTable } from "./reports-table";

/**
 * Admin safety queue — `/admin/reports`. Lists user-to-user abuse reports for
 * triage. Gated by the `(admin)` layout's `requireAdmin()`; the status action
 * additionally self-authorizes.
 */
export default async function AdminReportsPage() {
  const reports = await listReports();
  const open = reports.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Abuse and safety reports from clients. Triage each one and update its
          status.
        </p>
      </header>

      <section aria-labelledby="reports-heading">
        <Card>
          <CardHeader>
            <CardTitle id="reports-heading" className="flex items-center gap-2">
              All reports
              {open > 0 ? <Badge variant="destructive">{open} open</Badge> : null}
            </CardTitle>
            <CardDescription>
              Newest first. &ldquo;Actioned&rdquo; means you took action;
              &ldquo;dismissed&rdquo; means no action needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsTable reports={reports} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
