import type { Metadata } from "next";
import Link from "next/link";
import { Globe2, HandHeart, HeartHandshake, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Our Mission — MindCross",
  description:
    "Why MindCross exists: closing the mental-health access gap for migrants, refugees, and international students through culturally-matched therapy.",
};

const PILLARS = [
  {
    icon: MessagesSquare,
    title: "Therapy in your language",
    body: "Healing is hard enough without translating your feelings. We match you with a therapist who speaks the language you think and feel in.",
  },
  {
    icon: Globe2,
    title: "Cultural understanding",
    body: "Your background shapes how you experience stress, family, and belonging. Our therapists understand that context, not just the textbook.",
  },
  {
    icon: HandHeart,
    title: "Lowering the barriers",
    body: "Cost, waiting lists, and unfamiliar systems keep people away from care. At MVP, sessions are free and the steps are kept simple.",
  },
  {
    icon: HeartHandshake,
    title: "Everyone is welcome",
    body: "Whatever your country, faith, language, or status — you belong here. MindCross is built to be a safe, inclusive place to be heard.",
  },
];

export default function OurMissionPage() {
  return (
    <>
      {/* Intro */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <h1 className="font-heading text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
            Care that understands where you come from.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            MindCross began with a simple belief: no one should have to explain
            their whole world before they can be helped.
          </p>
        </div>
      </section>

      {/* Narrative */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="space-y-6 text-base leading-relaxed text-foreground/90">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            The gap we’re closing
          </h2>
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

          <h2 className="font-heading text-2xl font-bold tracking-tight pt-4">
            What culturally-sensitive therapy means to us
          </h2>
          <p>
            Culture is not a detail — it shapes how we experience anxiety,
            express sadness, relate to family, and imagine getting better. A
            culturally-sensitive therapist listens without asking you to
            translate yourself. They recognise the strength it took to move,
            and they hold space for both the country you left and the one
            you’re building a life in.
          </p>
          <p>
            MindCross is, for now, a small and deliberately simple platform.
            We’re starting with the essentials: honest therapist profiles,
            straightforward filtering by language and need, and free sessions
            while we grow. We’d rather do a few things gently and well than
            promise everything at once.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              What guides us
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four principles behind every decision we make.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <Card key={pillar.title} className="h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
                  >
                    <pillar.icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-lg">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Find someone who understands.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Browse our therapists, or — if you’re a clinician who shares this
          mission — join us.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/find-a-therapist">Find a Therapist</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/join-as-therapist">Become a Therapist</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
