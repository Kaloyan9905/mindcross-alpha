import * as React from "react";

import { getCurrentUser } from "@/modules/identity";
import { getDictionary } from "@/lib/i18n/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

/**
 * Chrome for every public + marketing page. Server Component: it reads the
 * current session so the navbar can show the signed-in user (or the Log in /
 * Sign up CTAs when there is none), then frames the page with Navbar + Footer.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, { locale, dict }] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        user={
          user
            ? { id: user.id, name: user.name ?? null, role: user.role }
            : null
        }
        navLabels={dict.nav}
        locale={locale}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
