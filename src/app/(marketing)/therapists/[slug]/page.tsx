import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import { getTherapistBySlug } from "@/modules/therapists";
import { getCurrentUser } from "@/modules/identity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingSection } from "./booking-section";

/** Profiles change rarely; revalidate on a gentle cadence. */
export const revalidate = 60;

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const therapist = await getTherapistBySlug(slug);

  if (!therapist) {
    return { title: "Therapist not found — MindCross" };
  }

  const languages = therapist.languages.join(", ");
  const title = `${therapist.displayName} — Therapist on MindCross`;
  const description = languages
    ? `${therapist.displayName} is a culturally-matched therapist on MindCross, speaking ${languages}.`
    : `${therapist.displayName} is a culturally-matched therapist on MindCross.`;
  const canonical = `/therapists/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      images: therapist.photoUrl ? [therapist.photoUrl] : undefined,
    },
  };
}

export default async function TherapistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [therapist, user] = await Promise.all([
    getTherapistBySlug(slug),
    getCurrentUser(),
  ]);

  if (!therapist) {
    notFound();
  }

  const firstName = therapist.displayName.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-8 -ml-2">
        <Link href="/find-a-therapist">
          <ArrowLeft aria-hidden="true" />
          Back to all therapists
        </Link>
      </Button>

      {/* Profile header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24 shrink-0">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-xl font-medium">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            {therapist.displayName}
            {therapist.verified ? (
              <BadgeCheck
                className="h-6 w-6 text-primary"
                aria-label="Verified therapist"
              />
            ) : null}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
            {therapist.gender && GENDER_LABELS[therapist.gender] ? (
              <>
                {" · "}
                {GENDER_LABELS[therapist.gender]}
              </>
            ) : null}
          </p>
          <div className="mt-3 trust-badge-row">
            {therapist.verified ? (
              <Badge variant="accent" className="gap-1">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </Badge>
            ) : null}
            {therapist.migrationExperience ? (
              <Badge variant="secondary">Has lived migration experience</Badge>
            ) : null}
            <Badge variant="success">Free first session</Badge>
          </div>
        </div>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
        {/* Main column */}
        <div className="space-y-10">
          {/* Languages */}
          {therapist.languages.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground">
                Languages
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.languages.map((lang) => (
                  <Badge key={lang} variant="secondary">
                    {lang}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {/* Cultural background */}
          {therapist.culturalBackground.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground">
                Cultural background
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.culturalBackground.map((culture) => (
                  <Badge key={culture} variant="secondary">
                    {culture}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {/* Specializations */}
          {therapist.specializations.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground">
                Areas of support
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.specializations.map((spec) => (
                  <Badge key={spec} variant="outline">
                    {spec}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <hr className="border-border" />

          {/* Bio */}
          <section>
            <h2 className="text-lg font-semibold">About {firstName}</h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {therapist.bio}
            </p>
          </section>

          {/* Session format */}
          <section className="rounded-lg border border-border p-6">
            <h2 className="font-semibold">Session format</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sessions are held online. Once your booking is confirmed,{" "}
              {firstName} will share their own secure video link with you —
              there&rsquo;s nothing extra to install through MindCross.
            </p>
          </section>
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BookingSection
            therapistName={therapist.displayName}
            slots={therapist.slots}
            clientId={user?.id ?? null}
            slug={therapist.slug}
          />
        </aside>
      </div>
    </div>
  );
}
