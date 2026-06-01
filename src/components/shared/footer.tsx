import * as React from "react";
import Link from "next/link";
import { LifeBuoy, Mail } from "lucide-react";

type FooterColumn = {
  title: string;
  links: {
    label: string;
    href: string;
    external?: boolean;
  }[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Discover",
    links: [
      { label: "Find a Therapist", href: "/find-a-therapist" },
      { label: "Our Mission", href: "/our-mission" },
    ],
  },
  {
    title: "For Therapists",
    links: [{ label: "Join Us", href: "/join-as-therapist" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Contact", href: "/contact" },
      {
        label: "support@mindcross.local",
        href: "mailto:support@mindcross.local",
        external: true,
      },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-primary"
              />
              <span className="text-base font-semibold tracking-tight text-foreground">
                MindCross
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A calm place to find a therapist who understands where you come
              from.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.label.startsWith("support@") && (
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Persistent crisis line — MindCross is not an emergency service. */}
        <div className="mt-12 flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <LifeBuoy
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>
            In a crisis or emergency, MindCross can&rsquo;t help in time — please
            call your local emergency number (<strong>112</strong> in the EU) or{" "}
            <Link
              href="/crisis-support"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              find a crisis line for your region
            </Link>
            .
          </span>
        </div>

        <div className="mt-8 h-px w-full bg-border" />

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Psychological support that speaks your language and understands your
            world.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {year} MindCross. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
