import { getTherapistForCurrentUser } from "@/modules/therapists";
import { getFilterOptions } from "@/modules/matching";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ProfileForm, type ProfileDefaults } from "./profile-form";

/** Fallback suggestions when the DB has no vocabulary yet. */
const FALLBACK_LANGUAGES = ["English", "Ukrainian", "Russian", "Arabic", "Polish", "Spanish", "French", "German"];
const FALLBACK_SPECIALIZATIONS = ["anxiety", "depression", "trauma", "grief", "family therapy", "relationships", "stress"];

export default async function TherapistProfilePage() {
  const t = await getTherapistForCurrentUser();
  if (!t) return null; // layout guards.

  let options = { languages: [] as string[], specializations: [] as string[] };
  try {
    options = await getFilterOptions();
  } catch {
    // keep fallbacks below
  }
  const languageSuggestions = options.languages.length ? options.languages : FALLBACK_LANGUAGES;
  const specializationSuggestions = options.specializations.length
    ? options.specializations
    : FALLBACK_SPECIALIZATIONS;

  const defaults: ProfileDefaults = {
    displayName: t.displayName,
    bio: t.bio,
    yearsOfExperience: t.yearsOfExperience,
    languages: t.languages,
    specializations: t.specializations,
    culturalBackground: t.culturalBackground,
    gender: t.gender ?? "",
    migrationExperience: t.migrationExperience,
    phone: t.phone ?? "",
    sessionUrl: t.sessionUrl ?? "",
    photoUrl: t.photoUrl ?? "",
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          This is what clients see. Your join link is shared with clients after
          they book — keep it current.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Public profile
            {t.verified ? <Badge variant="accent">Verified</Badge> : null}
            <Badge variant="outline">{t.status}</Badge>
          </CardTitle>
          <CardDescription>
            Your status and verification are managed by MindCross staff;
            everything else here is yours to edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={defaults}
            languageSuggestions={languageSuggestions}
            specializationSuggestions={specializationSuggestions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
