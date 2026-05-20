import * as React from "react";
import Link from "next/link";
import { Heart, Mail } from "lucide-react";

import { Separator } from "@/components/ui/separator";

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
      { label: "Group Sessions", href: "/group-sessions" },
    ],
  },
  {
    title: "For Therapists",
    links: [{ label: "Join Us", href: "/therapists/join" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Disclaimer", href: "#" },
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
    <footer className="mt-auto bg-secondary/50 text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M3 17c3 0 3-4 6-4s3 4 6 4 3-4 6-4" />
                  <path d="M12 10c-1.5-2-4-1-4 1 0 2 2 3 4 5 2-2 4-3 4-5 0-2-2.5-3-4-1z" />
                </svg>
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">
                MindCross
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              A calm place to find a therapist who understands where you come
              from.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {link.label.startsWith("support@") && (
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
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

        <Separator className="my-8" />

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm italic text-foreground/80">
            <Heart
              className="h-4 w-4 text-primary"
              aria-hidden="true"
              fill="currentColor"
            />
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

export default Footer;
