import type { Metadata } from "next";

import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "Join as a Therapist — MindCross",
  description:
    "Apply to offer culturally-matched therapy on MindCross. We welcome multilingual clinicians who understand the migrant and refugee experience.",
};

const OFFERS = [
  {
    title: "Clients who need you",
    body: "We connect you with people actively looking for a therapist who shares their language and culture.",
  },
  {
    title: "Meaningful, focused work",
    body: "Support migrants, refugees, and international students through some of the most important moments of their lives.",
  },
  {
    title: "A simple platform",
    body: "Manage your availability and sessions in one calm place. You bring your own secure video link — no new tools to learn.",
  },
];

const STEPS = [
  {
    title: "Apply",
    body: "Tell us about your background, languages, and the support you offer. It takes a few minutes.",
  },
  {
    title: "Review",
    body: "Our team reads every application carefully and verifies your details. We'll be in touch by email.",
  },
  {
    title: "Onboard",
    body: "Once approved, we help you set up your profile and availability so clients can find and book you.",
  },
];

export default function JoinAsTherapistPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8">
      {/* Intro */}
      <section className="py-20 text-center sm:py-28">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Offer therapy that speaks your clients&rsquo; language.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          MindCross is looking for warm, qualified therapists who can support
          migrants, refugees, and international students in their own language
          and with genuine cultural understanding.
        </p>
      </section>

      <hr className="border-border" />

      {/* Who we look for */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          Who we&rsquo;re looking for
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          We welcome licensed or accredited mental-health professionals —
          psychologists, psychotherapists, and counsellors — who speak more
          than one language and understand what it means to build a life in a
          new country. Lived migration experience is valued, though not
          required. Above all, we look for clinicians who listen with care and
          without judgement.
        </p>
      </section>

      <hr className="border-border" />

      {/* What we offer */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          What we offer
        </h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {OFFERS.map((offer) => (
            <div key={offer.title}>
              <dt className="font-semibold">{offer.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {offer.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <hr className="border-border" />

      {/* Process */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          How the process works
        </h2>
        <ol className="mt-10 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <p className="text-sm font-medium text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="mt-2 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <hr className="border-border" />

      {/* Application form */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Apply to join MindCross
          </h2>
          <p className="mt-2 text-muted-foreground">
            Tell us a little about yourself. There are no wrong answers — we
            read every application with care.
          </p>

          <div className="mt-10">
            <ApplicationForm />
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Prefer email? Write to{" "}
            <a
              href="mailto:careers@mindcross.local"
              className="font-medium text-foreground underline underline-offset-4"
            >
              careers@mindcross.local
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
