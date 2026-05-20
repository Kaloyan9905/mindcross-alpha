import type { Metadata } from "next";
import { ClipboardCheck, HeartHandshake, Mail, Users2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "Join as a Therapist — MindCross",
  description:
    "Apply to offer culturally-matched therapy on MindCross. We welcome multilingual clinicians who understand the migrant and refugee experience.",
};

const OFFERS = [
  {
    icon: Users2,
    title: "Clients who need you",
    body: "We connect you with people actively looking for a therapist who shares their language and culture.",
  },
  {
    icon: HeartHandshake,
    title: "Meaningful, focused work",
    body: "Support migrants, refugees, and international students through some of the most important moments of their lives.",
  },
  {
    icon: ClipboardCheck,
    title: "A simple platform",
    body: "Manage your availability and sessions in one calm place. You bring your own secure video link — no new tools to learn.",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Apply",
    body: "Tell us about your background, languages, and the support you offer. It takes a few minutes.",
  },
  {
    number: 2,
    title: "Review",
    body: "Our team reads every application carefully and verifies your details. We'll be in touch by email.",
  },
  {
    number: 3,
    title: "Onboard",
    body: "Once approved, we help you set up your profile and availability so clients can find and book you.",
  },
];

export default function JoinAsTherapistPage() {
  return (
    <>
      {/* Intro */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <h1 className="font-heading text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
            Offer therapy that truly speaks your clients’ language.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            MindCross is looking for warm, qualified therapists who can support
            migrants, refugees, and international students in their own
            language and with genuine cultural understanding.
          </p>
        </div>
      </section>

      {/* Who we look for */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Who we’re looking for
        </h2>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          We welcome licensed or accredited mental-health professionals —
          psychologists, psychotherapists, and counsellors — who speak more
          than one language and understand what it means to build a life in a
          new country. Lived migration experience is valued, though not
          required. Above all, we look for clinicians who listen with care and
          without judgement.
        </p>
      </section>

      {/* What we offer */}
      <section className="bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            What we offer
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {OFFERS.map((offer) => (
              <Card key={offer.title} className="h-full">
                <CardHeader>
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"
                  >
                    <offer.icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{offer.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {offer.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          How the process works
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground"
              >
                {step.number}
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Application form */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Apply to join MindCross
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tell us a little about yourself. There are no wrong answers — we
              read every application with care.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ApplicationForm />
            </CardContent>
          </Card>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Prefer email? Write to{" "}
            <a
              href="mailto:careers@mindcross.local"
              className="text-primary underline-offset-4 hover:underline"
            >
              careers@mindcross.local
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
