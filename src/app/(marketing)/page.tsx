import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { findTherapists, type TherapistSummary } from "@/modules/matching";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * MindCross homepage. Minimalist and content-first: a calm hero, three plain
 * steps, a small featured-therapists row, a one-line mission link, and a quiet
 * closing CTA. White throughout — space and type carry the design.
 */

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

const STEPS = [
  {
    title: "Filter by language and need",
    body: "Choose the language you feel most yourself in, and tell us what you'd like support with.",
  },
  {
    title: "Choose a therapist",
    body: "Read calm, honest profiles and pick someone who understands where you come from.",
  },
  {
    title: "Book a free session",
    body: "Pick a time that works for you. Your first session is free while we're in early access.",
  },
];

function FeaturedTherapist({ therapist }: { therapist: TherapistSummary }) {
  return (
    <Link
      href={`/therapists/${therapist.slug}`}
      className="group flex flex-col gap-4 rounded-lg border border-border p-6 transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-sm font-medium">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold">{therapist.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {therapist.bio}
      </p>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        View profile
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
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
    <div className="mx-auto max-w-5xl px-6 lg:px-8">
      {/* Hero */}
      <section className="py-24 text-center sm:py-32">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Therapy that speaks your language.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          MindCross connects migrants, refugees, and international students with
          therapists who share their language and cultural background — so you
          can be understood from the very first session.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/find-a-therapist">Find a therapist</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/join-as-therapist">Become a therapist</Link>
          </Button>
        </div>
      </section>

      <hr className="border-border" />

      {/* How it works */}
      <section className="py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <p className="mt-2 text-muted-foreground">
          Three calm steps. No pressure, and nothing to pay.
        </p>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
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

      {/* Featured therapists */}
      <section className="py-20 sm:py-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Meet a few of our therapists
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every therapist is verified and chosen for their cultural
              understanding.
            </p>
          </div>
          <Button
            asChild
            variant="link"
            className="self-start px-0 sm:self-auto"
          >
            <Link href="/find-a-therapist">
              Browse all
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {featured.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((therapist) => (
              <FeaturedTherapist key={therapist.id} therapist={therapist} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            Our therapist directory is being prepared. Please check back soon.
          </p>
        )}
      </section>

      <hr className="border-border" />

      {/* Mission link */}
      <section className="py-20 sm:py-24">
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Finding mental-health support that understands your language,
          culture, and story should not be one more barrier. That gap is why we
          built MindCross.
        </p>
        <Button asChild variant="link" className="mt-3 px-0">
          <Link href="/our-mission">
            Read our mission
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <hr className="border-border" />

      {/* Closing CTA */}
      <section className="py-24 text-center sm:py-28">
        <h2 className="text-2xl font-semibold tracking-tight">
          Take the first step, when you&rsquo;re ready.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          There is no rush. When you feel ready, we&rsquo;ll help you find
          someone who understands.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/find-a-therapist">Find a therapist</Link>
        </Button>
      </section>
    </div>
  );
}
