import { getCurrentUser } from "@/modules/identity";
import { unreadTotal } from "@/modules/messaging";
import { listIncomingRequests } from "@/modules/friends";

import { AccountSubnav } from "./account-subnav";

/**
 * Account hub chrome: a secondary nav bar (Sessions · Messages · Friends) above
 * every account page. The `(client)/layout.tsx` already gates auth + renders the
 * navbar/footer; this adds the in-section navigation with live unread / request
 * badges. Each page below keeps its own content container.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  let unread = 0;
  let requests = 0;
  if (user) {
    try {
      [unread, requests] = await Promise.all([
        unreadTotal(user.id),
        listIncomingRequests(user.id).then((r) => r.length),
      ]);
    } catch {
      // Badges are best-effort — never break the hub over a count query.
    }
  }

  return (
    <>
      <div className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AccountSubnav unread={unread} requests={requests} />
        </div>
      </div>
      {children}
    </>
  );
}
