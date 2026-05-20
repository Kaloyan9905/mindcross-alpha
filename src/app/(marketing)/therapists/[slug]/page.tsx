import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe2,
  GraduationCap,
  Languages,
  Sparkles,
  Video,
} from "lucide-react";

import { getTherapistBySlug } from "@/modules/therapists";
import { getCurrentUser } from "@/modules/identity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  return {
    title: `${therapist.displayName} — Therapist on MindCross`,
    description: languages
      ? `${therapist.displayName} is a culturally-matched therapist on MindCross, speaking ${languages}.`
      : `${therapist.displayName} is a culturally-matched therapist on MindCross.`,
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/find-a-therapist">
          <ArrowLeft aria-hidden="true" />
          Back to all therapists
        </Link>
      </Button>

      {/* Profile header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-28 w-28 shrink-0">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {therapist.displayName}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
            {therapist.gender && GENDER_LABELS[therapist.gender] ? (
              <>
                <span aria-hidden="true">·</span>
                {GENDER_LABELS[therapist.gender]}
              </>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {therapist.migrationExperience ? (
              <Badge variant="accent" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Has lived migration experience
              </Badge>
            ) : null}
            <Badge variant="secondary">Free session at MVP</Badge>
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Languages */}
          {therapist.languages.length > 0 ? (
            <section>
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <Languages
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                Languages
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.languages.map((lang) => (
                  <Badge key={lang} variant="tertiary">
                    {lang}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {/* Cultural background */}
          {therapist.culturalBackground.length > 0 ? (
            <section>
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <Globe2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Cultural background
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.culturalBackground.map((culture) => (
                  <Badge key={culture} variant="tertiary">
                    {culture}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {/* Specializations */}
          {therapist.specializations.length > 0 ? (
            <section>
              <h2 className="font-heading text-lg font-semibold">
                Areas of support
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {therapist.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <Separator />

          {/* Bio */}
          <section>
            <h2 className="font-heading text-lg font-semibold">
              About {therapist.displayName.split(" ")[0]}
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/90">
              {therapist.bio}
            </p>
          </section>

          {/* Session format */}
          <Card className="bg-muted/60">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Video className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle className="text-base">Session format</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sessions are held online. Once your booking is confirmed,{" "}
                {therapist.displayName.split(" ")[0]} will share their own
                secure video link with you — there’s nothing extra to install
                through MindCross.
              </p>
            </CardContent>
          </Card>
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
