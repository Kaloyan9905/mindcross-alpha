"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveSafetyPlanAction } from "@/modules/safety/actions/save-safety-plan";
import type { SafetyPlan } from "@/modules/safety/db/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FieldKey =
  | "warningSigns"
  | "copingStrategies"
  | "supportPeople"
  | "professionalContacts"
  | "safeEnvironment"
  | "reasonsToLive";

const FIELDS: { key: FieldKey; label: string; help: string; placeholder: string }[] = [
  {
    key: "warningSigns",
    label: "1. My warning signs",
    help: "Thoughts, feelings, or situations that tell me a hard moment may be building.",
    placeholder: "e.g. I stop sleeping, I withdraw from friends…",
  },
  {
    key: "copingStrategies",
    label: "2. Things that help me cope",
    help: "What I can do on my own to feel steadier.",
    placeholder: "e.g. a walk, breathing slowly, music, prayer…",
  },
  {
    key: "supportPeople",
    label: "3. People I can reach out to",
    help: "Names and how to contact them.",
    placeholder: "e.g. my friend Olena — 0123…",
  },
  {
    key: "professionalContacts",
    label: "4. Professionals & services",
    help: "My therapist, a helpline, a doctor.",
    placeholder: "e.g. my therapist, local crisis line…",
  },
  {
    key: "safeEnvironment",
    label: "5. Keeping my space safe",
    help: "Steps to make my environment safer in a crisis.",
    placeholder: "e.g. ask someone to stay with me…",
  },
  {
    key: "reasonsToLive",
    label: "6. What keeps me going",
    help: "Reasons, people, and hopes that matter to me.",
    placeholder: "e.g. my family, finishing my studies…",
  },
];

export function SafetyPlanForm({ plan }: { plan: SafetyPlan | null }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [values, setValues] = React.useState<Record<FieldKey, string>>({
    warningSigns: plan?.warningSigns ?? "",
    copingStrategies: plan?.copingStrategies ?? "",
    supportPeople: plan?.supportPeople ?? "",
    professionalContacts: plan?.professionalContacts ?? "",
    safeEnvironment: plan?.safeEnvironment ?? "",
    reasonsToLive: plan?.reasonsToLive ?? "",
  });

  function set(key: FieldKey, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function save() {
    startTransition(async () => {
      const r = await saveSafetyPlanAction(values);
      if (r.ok) {
        toast.success("Safety plan saved.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          <p className="text-xs text-muted-foreground">{f.help}</p>
          <Textarea
            id={f.key}
            value={values[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={f.placeholder}
          />
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? "Saving…" : "Save my plan"}
        </Button>
      </div>
    </div>
  );
}
