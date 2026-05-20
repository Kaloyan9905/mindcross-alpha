import Link from "next/link";
import {
  ArrowRight,
  CalendarHeart,
  Languages,
  ShieldCheck,
  Sparkles,
  UserSearch,
} from "lucide-react";

import { findTherapists, type TherapistSummary } from "@/modules/matching";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * MindCross homepage. Calm, warm, mobile-first. Sections: hero, how it works,
 * featured therapists (live from the matching module), mission teaser, a trust
 * band, and a final CTA.
 */

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

const STEPS = [
  {
    icon: Languages,
    title: "Filter by language and need",
    body: "Choose the language you feel most yourself in, and tell us what you'd like support with.",
  },
  {
    icon: UserSearch,
    title: "Choose a therapist",
    body: "Read calm, honest profiles and pick someone who understands where you come from.",
  },
  {
    icon: CalendarHeart,
    title: "Book a free session",
    body: "Pick a time that works for you. Your first session is free while we're in early access.",
  },
];

function FeaturedTherapistCard({ therapist }: { therapist: TherapistSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Avatar className="h-14 w-14">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{therapist.displayName}</CardTitle>
          <CardDescription>
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {therapist.languages.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {therapist.languages.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="tertiary">
                {lang}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          {therapist.bio}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/therapists/${therapist.slug}`}>
            View profile
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  let featured: TherapistSummary[] = [];
  try {
    const result = await findTherapists({ page: 1, pageSize: 3 });
    featured = result.items;
  } catch {
    // The homepage stays useful even if the directory is briefly unreachable.
    featured = [];
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-secondary/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <Badge variant="accent" className="mb-6 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Free sessions during early access
          </Badge>
          <h1 className="font-heading text-3xl font-bold leading-snug tracking-tight sm:text-4xl md:text-5xl">
            Psychological support that speaks your language and understands
            your world.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            MindCross connects migrants, refugees, and international students
            with therapists who share their language and cultural background —
            so you can be understood from the very first session.
          </p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/find-a-therapist">Find a Therapist</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/join-as-therapist">Become a Therapist</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three calm steps. No pressure, and nothing to pay.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"
                    >
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Featured therapists */}
      <section className="bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Meet a few of our therapists
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every therapist is verified and chosen for their cultural
                understanding, not just their credentials.
              </p>
            </div>
            <Button asChild variant="ghost" className="self-start sm:self-auto">
              <Link href="/find-a-therapist">
                Browse all
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {featured.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((therapist) => (
                <FeaturedTherapistCard
                  key={therapist.id}
                  therapist={therapist}
                />
              ))}
            </div>
          ) : (
            <Card className="mt-10">
              <CardContent className="py-12 text-center text-muted-foreground">
                Our therapist directory is being prepared. Please check back
                soon.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Mission teaser */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-2xl bg-tertiary/50 p-8 sm:p-12">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Why we built MindCross
          </h2>
          <p className="mt-4 text-base leading-relaxed text-tertiary-foreground">
            Moving to a new country can be one of the hardest things a person
            does. Finding mental-health support that truly understands your
            language, your culture, and your story should not be one more
            barrier. MindCross exists to close that gap.
          </p>
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/our-mission">
              Read our mission
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-border bg-background">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-4 py-8 text-sm font-medium text-muted-foreground sm:flex-row sm:gap-8 sm:px-6">
          <span className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            Verified therapists
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            Culturally matched
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Free at MVP
          </span>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
            Take the first step, when you’re ready.
          </h2>
          <p className="mt-3 max-w-xl text-primary-foreground/90">
            There is no rush. When you feel ready, we’ll help you find someone
            who understands.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8"
          >
            <Link href="/find-a-therapist">Find a Therapist</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
