import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, HeartHandshake, Languages } from "lucide-react";

import { findTherapists, type TherapistSummary } from "@/modules/matching";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

/**
 * MindCross homepage. Calm and premium: a soft gradient hero, three plain
 * steps, a featured-therapists row, a quiet mission line, and a closing CTA.
 * Copy is localized via the interface-language dictionary.
 */

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

function FeaturedTherapist({ therapist }: { therapist: TherapistSummary }) {
  return (
    <Link
      href={`/therapists/${therapist.slug}`}
      className="card-lift group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-soft-lg ring-1 ring-primary/10 hover:border-primary/40 hover:shadow-soft-xl"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-secondary text-sm font-medium text-secondary-foreground">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            {therapist.displayName}
            {therapist.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-primary"
                aria-label="Verified therapist"
              />
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {therapist.bio}
      </p>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        View profile
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const { dict } = await getDictionary();

  let featured: TherapistSummary[] = [];
  try {
    const result = await findTherapists({ sort: "name", page: 1, pageSize: 3 });
    featured = result.items;
  } catch {
    featured = [];
  }

  return (
    <>
      {/* Hero — full-bleed calming wash with soft drifting aura */}
      <section className="hero-wash relative overflow-hidden">
        <div
          aria-hidden="true"
          className="hero-blob -left-24 top-0 h-72 w-72 bg-primary/20"
          style={{ animationDelay: "0s" }}
        />
        <div
          aria-hidden="true"
          className="hero-blob -top-12 right-0 h-80 w-80 bg-accent/50"
          style={{ animationDelay: "-6s" }}
        />
        <div
          aria-hidden="true"
          className="hero-blob left-1/3 top-24 h-64 w-64 bg-success/15"
          style={{ animationDelay: "-12s" }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            {dict.hero.eyebrow}
          </span>

          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {dict.hero.titleLead}{" "}
            <span className="text-gradient">{dict.hero.titleAccent}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {dict.hero.subtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/find-a-therapist">{dict.hero.ctaFind}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/join-as-therapist">{dict.hero.ctaJoin}</Link>
            </Button>
          </div>

          <ul className="mx-auto mt-9 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {dict.hero.trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* How it works */}
        <ScrollReveal as="section" className="py-20 sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight">
            {dict.steps.heading}
          </h2>
          <p className="mt-2 text-muted-foreground">{dict.steps.sub}</p>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {dict.steps.items.map((step, index) => (
              <li key={step.title}>
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </ScrollReveal>

        <hr className="border-border" />

        {/* Featured therapists */}
        <ScrollReveal as="section" className="py-20 sm:py-24">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {dict.featured.heading}
              </h2>
              <p className="mt-2 text-muted-foreground">{dict.featured.sub}</p>
            </div>
            <Button asChild variant="link" className="self-start px-0 sm:self-auto">
              <Link href="/find-a-therapist">
                {dict.featured.browse}
                <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
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
            <p className="mt-10 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
              Our therapist directory is being prepared. Please check back soon.
            </p>
          )}
        </ScrollReveal>

        <hr className="border-border" />

        {/* Mission */}
        <ScrollReveal as="section" className="py-20 sm:py-24">
          <div className="rounded-xl border border-border bg-card p-8 shadow-soft-lg ring-1 ring-primary/10 sm:p-10">
            <HeartHandshake className="h-7 w-7 text-primary" aria-hidden="true" />
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground">
              {dict.mission.text}
            </p>
            <Button asChild variant="link" className="mt-3 px-0">
              <Link href="/our-mission">
                {dict.mission.read}
                <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        {/* Closing CTA */}
        <ScrollReveal as="section" className="pb-24 pt-4 text-center sm:pb-28">
          <h2 className="text-2xl font-semibold tracking-tight">
            {dict.closing.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            {dict.closing.sub}
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/find-a-therapist">{dict.closing.cta}</Link>
          </Button>
        </ScrollReveal>
      </div>
    </>
  );
}
