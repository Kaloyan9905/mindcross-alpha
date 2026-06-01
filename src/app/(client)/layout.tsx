import * as React from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/modules/identity";
import { getDictionary } from "@/lib/i18n/server";
import { getNavActivity } from "@/lib/nav-activity";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

/**
 * Chrome for the authenticated client area (e.g. /account).
 *
 * Auth-gated: a visitor with no session is redirected to /login. Middleware
 * (owned by Dev 5) may also guard these routes; this server-side check is the
 * reliable last line of defense.
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { locale, dict } = await getDictionary();
  const activity = await getNavActivity(user);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        user={{ id: user.id, name: user.name ?? null, role: user.role }}
        navLabels={dict.nav}
        locale={locale}
        activity={activity}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
