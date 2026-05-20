import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Mission — MindCross",
  description:
    "Why MindCross exists: closing the mental-health access gap for migrants, refugees, and international students through culturally-matched therapy.",
};

const PILLARS = [
  {
    title: "Therapy in your language",
    body: "Healing is hard enough without translating your feelings. We match you with a therapist who speaks the language you think and feel in.",
  },
  {
    title: "Cultural understanding",
    body: "Your background shapes how you experience stress, family, and belonging. Our therapists understand that context, not just the textbook.",
  },
  {
    title: "Lowering the barriers",
    body: "Cost, waiting lists, and unfamiliar systems keep people away from care. At MVP, sessions are free and the steps are kept simple.",
  },
  {
    title: "Everyone is welcome",
    body: "Whatever your country, faith, language, or status — you belong here. MindCross is built to be a safe, inclusive place to be heard.",
  },
];

export default function OurMissionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8">
      {/* Intro */}
      <section className="py-20 text-center sm:py-28">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Care that understands where you come from.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          MindCross began with a simple belief: no one should have to explain
          their whole world before they can be helped.
        </p>
      </section>

      <hr className="border-border" />

      {/* Narrative */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          The gap we&rsquo;re closing
        </h2>
        <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            Migrants, refugees, and international students carry a great deal —
            a new language, a new system, distance from family, and often the
            weight of why they left home in the first place. These are exactly
            the moments when mental-health support matters most. Yet it is
            often hardest to reach.
          </p>
          <p>
            Many people search for a therapist and find no one who speaks their
            language. Others find someone, but spend the session translating
            not just their words but their culture — explaining customs,
            family roles, and grief that a therapist from a different
            background may not recognise. Long waiting lists, unfamiliar
            healthcare systems, and cost turn many away before they ever begin.
          </p>
          <p>
            We think that is a gap worth closing. When a therapist already
            understands your language and your context, you can spend your
            energy on healing instead of on being understood.
          </p>
        </div>

        <h2 className="mt-12 text-2xl font-semibold tracking-tight">
          What culturally-sensitive therapy means to us
        </h2>
        <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            Culture is not a detail — it shapes how we experience anxiety,
            express sadness, relate to family, and imagine getting better. A
            culturally-sensitive therapist listens without asking you to
            translate yourself. They recognise the strength it took to move,
            and they hold space for both the country you left and the one
            you&rsquo;re building a life in.
          </p>
          <p>
            MindCross is, for now, a small and deliberately simple platform.
            We&rsquo;re starting with the essentials: honest therapist
            profiles, straightforward filtering by language and need, and free
            sessions while we grow. We&rsquo;d rather do a few things gently and
            well than promise everything at once.
          </p>
        </div>
      </section>

      <hr className="border-border" />

      {/* Pillars */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          What guides us
        </h2>
        <p className="mt-2 text-muted-foreground">
          Four principles behind every decision we make.
        </p>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <dt className="font-semibold">{pillar.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pillar.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <hr className="border-border" />

      {/* CTA */}
      <section className="py-20 text-center sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          Find someone who understands.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Browse our therapists, or — if you&rsquo;re a clinician who shares
          this mission — join us.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/find-a-therapist">Find a therapist</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/join-as-therapist">Become a therapist</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
