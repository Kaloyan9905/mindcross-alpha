"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signIn } from "next-auth/react";
import { registerAction } from "@/modules/identity/actions/register";
import {
  registerSchema,
  type RegisterInput,
} from "@/modules/identity/lib/validators";

/**
 * Sign-up form. Submits to the `registerAction` server action; on success it
 * immediately signs the new user in via Auth.js credentials and forwards to
 * /account.
 */
export function RegisterForm({ callbackUrl = "/account" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      // `consent` is a literal-true field; start unchecked so the user must
      // act. `false` is intentionally not the schema's accepted value.
      consent: false as unknown as true,
    },
  });

  const passwordValue = form.watch("password") ?? "";

  async function onSubmit(values: RegisterInput) {
    setIsPending(true);
    setFormError(null);
    try {
      const result = await registerAction(values);

      if (!result.ok) {
        // Anchor the most common error on its field; otherwise a banner.
        if (/already exists/i.test(result.error)) {
          form.setError("email", { message: result.error });
          form.setFocus("email");
        } else {
          setFormError(result.error);
        }
        return;
      }

      // Account created — log them straight in.
      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        // Rare: account exists but auto-login failed. Send them to sign in,
        // preserving where they were headed.
        const loginHref =
          callbackUrl && callbackUrl !== "/account"
            ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/login";
        router.push(loginHref);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {formError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        ) : null}

        <p className="flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          Your details stay private. We only use them to sign you in — never
          shared, no spam.
        </p>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  {...field}
                />
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
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  {...field}
                />
              </FormControl>
              <FormDescription
                className={passwordValue.length >= 12 ? "text-success" : undefined}
              >
                {passwordValue.length >= 12
                  ? "Looks good — 12 or more characters."
                  : `Use at least 12 characters${
                      passwordValue.length > 0 ? ` (${passwordValue.length}/12)` : ""
                    }.`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <div className="space-y-1 leading-tight">
                <FormLabel className="font-normal">
                  I accept the Privacy Policy and Therapy Disclaimer, and
                  consent to the processing of my health data to provide
                  therapy.
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Read our{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/disclaimer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Therapy Disclaimer
                  </Link>
                  .
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Form>
  );
}
