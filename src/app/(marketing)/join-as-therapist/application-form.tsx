"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { submitApplicationAction } from "@/modules/therapists/actions/submit-application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Careers / "join as therapist" application form.
 *
 * The form collects languages and specializations as comma-separated text
 * (the calmest input for a plain-language audience) and splits them into
 * string arrays before calling the server action. The server action
 * re-validates everything with its own zod schema at the boundary.
 */

/** Split a comma-separated string into a trimmed, de-duplicated list. */
function splitList(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed.length > 0) seen.add(trimmed);
  }
  return [...seen];
}

/** Client-side form schema. Mirrors the server schema but with text inputs. */
const formSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(200),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .email("Please enter a valid email address.")
    .max(320),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  languages: z
    .string()
    .trim()
    .min(1, "Please list at least one language.")
    .refine((v) => splitList(v).length > 0, "Please list at least one language.")
    .refine(
      (v) => splitList(v).length <= 20,
      "Please list no more than 20 languages.",
    ),
  specializations: z
    .string()
    .trim()
    .min(1, "Please list at least one area of support.")
    .refine(
      (v) => splitList(v).length > 0,
      "Please list at least one area of support.",
    )
    .refine(
      (v) => splitList(v).length <= 20,
      "Please list no more than 20 areas.",
    ),
  yearsOfExperience: z
    .string()
    .trim()
    .min(1, "Please enter your years of experience.")
    .refine(
      (v) => /^\d+$/.test(v),
      "Please enter a whole number of years.",
    )
    .refine((v) => {
      const n = Number(v);
      return n >= 0 && n <= 70;
    }, "Please enter a realistic number of years (0–70)."),
  shortBio: z
    .string()
    .trim()
    .min(20, "Please write a short bio (at least 20 characters).")
    .max(2000, "Please keep your bio under 2000 characters."),
});

type FormValues = z.input<typeof formSchema>;

export function ApplicationForm() {
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      country: "",
      languages: "",
      specializations: "",
      yearsOfExperience: "",
      shortBio: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const parsed = formSchema.parse(values);
    const result = await submitApplicationAction({
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone && parsed.phone.length > 0 ? parsed.phone : undefined,
      country:
        parsed.country && parsed.country.length > 0
          ? parsed.country
          : undefined,
      languages: splitList(parsed.languages),
      specializations: splitList(parsed.specializations),
      yearsOfExperience: Number(parsed.yearsOfExperience),
      shortBio: parsed.shortBio,
    });

    if (result.ok) {
      setSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-12 text-center">
        <CheckCircle2
          className="h-8 w-8 text-foreground"
          aria-hidden="true"
        />
        <h3 className="text-xl font-semibold">Thank you for applying</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Thank you — we’ll review your application and be in touch. We read
          every application with care, so please allow us a little time.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    autoComplete="tel"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Where you're based"
                    autoComplete="country-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="languages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Languages you can offer therapy in</FormLabel>
              <FormControl>
                <Input placeholder="e.g. English, Ukrainian, Polish" {...field} />
              </FormControl>
              <FormDescription>Separate each language with a comma.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specializations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Areas of support</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Anxiety, Trauma, Grief"
                  {...field}
                />
              </FormControl>
              <FormDescription>Separate each area with a comma.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="yearsOfExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Years of experience</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={70}
                  placeholder="0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shortBio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>A short bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Tell us about your background, your approach, and who you'd like to support."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A few sentences is plenty — we’ll help you build a fuller
                profile once you’re onboarded.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Sending…" : "Submit application"}
        </Button>
      </form>
    </Form>
  );
}
