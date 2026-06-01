"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateTherapistProfileAction } from "@/modules/therapists/actions/update-profile";
import {
  THERAPIST_GENDERS,
  type TherapistGender,
} from "@/modules/therapists/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipInput } from "@/components/shared/chip-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProfileDefaults {
  displayName: string;
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  specializations: string[];
  culturalBackground: string[];
  gender: string; // "" = unset
  migrationExperience: boolean;
  phone: string;
  sessionUrl: string;
  photoUrl: string;
}

export interface ProfileFormProps {
  defaults: ProfileDefaults;
  languageSuggestions: string[];
  specializationSuggestions: string[];
}

const GENDER_LABELS: Record<TherapistGender, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

const NO_GENDER = "__none__";

/** Common cultural-background suggestions (people can still add their own). */
const CULTURE_SUGGESTIONS = [
  "Ukrainian",
  "Russian",
  "Eastern European",
  "Polish",
  "Middle Eastern",
  "Arab",
  "Syrian",
  "Latin American",
  "South Asian",
  "African",
];

export function ProfileForm({
  defaults,
  languageSuggestions,
  specializationSuggestions,
}: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [displayName, setDisplayName] = React.useState(defaults.displayName);
  const [bio, setBio] = React.useState(defaults.bio);
  const [years, setYears] = React.useState(String(defaults.yearsOfExperience));
  const [languages, setLanguages] = React.useState<string[]>(defaults.languages);
  const [specializations, setSpecializations] = React.useState<string[]>(
    defaults.specializations,
  );
  const [culture, setCulture] = React.useState<string[]>(
    defaults.culturalBackground,
  );
  const [gender, setGender] = React.useState(defaults.gender || NO_GENDER);
  const [migration, setMigration] = React.useState(defaults.migrationExperience);
  const [phone, setPhone] = React.useState(defaults.phone);
  const [sessionUrl, setSessionUrl] = React.useState(defaults.sessionUrl);
  const [photoUrl, setPhotoUrl] = React.useState(defaults.photoUrl);

  // Guard against losing unsaved edits (e.g. a long bio) on accidental nav.
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTherapistProfileAction({
        displayName: displayName.trim(),
        bio: bio.trim(),
        yearsOfExperience: Number.parseInt(years, 10) || 0,
        languages,
        specializations,
        culturalBackground: culture,
        gender: gender === NO_GENDER ? null : (gender as TherapistGender),
        migrationExperience: migration,
        phone: phone.trim(),
        sessionUrl: sessionUrl.trim(),
        photoUrl: photoUrl.trim(),
      });
      if (result.ok) {
        setDirty(false);
        toast.success("Profile saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className="space-y-8"
    >
      {/* About you */}
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Your name</Label>
            <Input
              id="p-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-years">Years of experience</Label>
            <Input
              id="p-years"
              type="number"
              inputMode="numeric"
              min={0}
              max={70}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-bio">A few words about you</Label>
          <Textarea
            id="p-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            maxLength={2000}
            required
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Warm and plain — this is the first thing clients read.
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {bio.length} / 2000
            </p>
          </div>
        </div>
      </div>

      {/* Tap-to-choose lists */}
      <div className="space-y-6 border-t border-border pt-6">
        <ChipInput
          label="Languages you speak"
          hint="Tap a language to add it, or type your own."
          value={languages}
          onChange={(v) => {
            setLanguages(v);
            setDirty(true);
          }}
          suggestions={languageSuggestions}
          placeholder="Add a language…"
        />
        <ChipInput
          label="What you help with"
          hint="Tap the areas you support."
          value={specializations}
          onChange={(v) => {
            setSpecializations(v);
            setDirty(true);
          }}
          suggestions={specializationSuggestions}
          placeholder="Add an area…"
        />
        <ChipInput
          label="Cultural background"
          hint="The cultures you understand and can connect with."
          value={culture}
          onChange={(v) => {
            setCulture(v);
            setDirty(true);
          }}
          suggestions={CULTURE_SUGGESTIONS}
          placeholder="Add a background…"
        />
      </div>

      {/* Details */}
      <div className="space-y-5 border-t border-border pt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-gender">Gender</Label>
            <Select
              value={gender}
              onValueChange={(v) => {
                setGender(v);
                setDirty(true);
              }}
            >
              <SelectTrigger id="p-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GENDER}>Prefer not to say</SelectItem>
                {THERAPIST_GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-phone">Phone (private)</Label>
            <Input
              id="p-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 …"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="p-migration"
            checked={migration}
            onCheckedChange={(c) => {
              setMigration(c === true);
              setDirty(true);
            }}
          />
          <Label htmlFor="p-migration" className="font-normal leading-tight">
            I have lived migration experience and am comfortable sharing that with
            clients.
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-session">Your video room link</Label>
          <Input
            id="p-session"
            type="url"
            inputMode="url"
            value={sessionUrl}
            onChange={(e) => setSessionUrl(e.target.value)}
            placeholder="https://meet.google.com/your-room"
          />
          <p className="text-xs text-muted-foreground">
            Paste your Zoom, Google Meet, or Whereby link. Clients only see it
            after they book.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-photo">Photo link (optional)</Label>
          <Input
            id="p-photo"
            type="url"
            inputMode="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
