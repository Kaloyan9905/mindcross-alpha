import { listUsersAdmin } from "@/modules/identity";
import { isAdminRole } from "@/modules/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { UserDeleteAction } from "./user-delete-action";

/** Shared date formatter — short, locale-aware. */
const DATE_FMT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Users admin page — `/admin/users`.
 *
 * Lists every account and provides a GDPR "right to erasure" Delete control for
 * client/therapist accounts. Staff (`admin_*`) accounts show no delete control
 * — they are managed directly in the database to prevent console lockout.
 *
 * Gated by the `(admin)` layout's `requireAdmin()`; `deleteUserAction`
 * additionally self-authorizes.
 */
export default async function AdminUsersPage() {
  const users = await listUsersAdmin();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Every account on the platform. Use Delete to process a GDPR erasure
          request.
        </p>
      </header>

      <section aria-labelledby="all-users-heading">
        <Card>
          <CardHeader>
            <CardTitle id="all-users-heading" className="flex items-center gap-2">
              All users
              <Badge variant="secondary">{users.length}</Badge>
            </CardTitle>
            <CardDescription>
              Newest first. Consent shows when the user accepted the privacy
              policy at sign-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No user accounts yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2">
                        User
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Role
                      </th>
                      <th scope="col" className="px-3 py-2 whitespace-nowrap">
                        Consent
                      </th>
                      <th scope="col" className="px-3 py-2 whitespace-nowrap">
                        Joined
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const staff = isAdminRole(user.role);
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-border last:border-0 align-middle"
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">
                              {user.name ?? "—"}
                            </div>
                            <div className="text-muted-foreground">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={staff ? "tertiary" : "outline"}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {user.consentAcceptedAt
                              ? DATE_FMT.format(user.consentAcceptedAt)
                              : "—"}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {DATE_FMT.format(user.createdAt)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end">
                              {staff ? (
                                <span className="text-xs text-muted-foreground">
                                  Managed in DB
                                </span>
                              ) : (
                                <UserDeleteAction
                                  userId={user.id}
                                  userLabel={user.name ?? user.email}
                                />
                              )}
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
