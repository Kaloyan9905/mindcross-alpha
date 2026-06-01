import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site";
import { LOCALE_META } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// Single clean, professional, highly-legible sans for headings + body
// (the skill's "Minimal Swiss" pairing). Accessible for low-literacy users.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MindCross — Therapy that speaks your language",
  description:
    "Culturally and linguistically matched therapy for migrants, refugees, and international students.",
  openGraph: {
    siteName: "MindCross",
    type: "website",
    title: "MindCross — Therapy that speaks your language",
    description:
      "Culturally and linguistically matched therapy for migrants, refugees, and international students.",
  },
};

/**
 * Resolve the theme before first paint to avoid a flash of the wrong theme.
 * Reads the saved preference ("light" | "dark" | "system") and falls back to
 * the system setting, then toggles `.dark` + `color-scheme` on <html>.
 */
const THEME_SCRIPT = `(function(){try{var e=document.documentElement;e.classList.add('js');var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((!t||t==='system')&&m);e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = LOCALE_META[locale].dir;
  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-soft-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
