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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getSession, signIn } from "next-auth/react";
import {
  loginSchema,
  type LoginInput,
} from "@/modules/identity/lib/validators";

/**
 * Sign-in form. Calls Auth.js `signIn("credentials", ...)` with
 * `redirect: false` so errors surface inline (with `role="alert"`), then
 * navigates to `callbackUrl` (where the user was originally headed) on success.
 */
export function LoginForm({ callbackUrl = "/account" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const registerHref =
    callbackUrl && callbackUrl !== "/account"
      ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/register";

  async function onSubmit(values: LoginInput) {
    setIsPending(true);
    setFormError(null);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        setFormError("Incorrect email or password. Please try again.");
        return;
      }

      // Honor an explicit callbackUrl; otherwise land on the right home for
      // the signed-in role (therapist / staff / client).
      let dest = callbackUrl;
      if (dest === "/account") {
        const session = await getSession();
        const role = session?.user?.role;
        if (role && role.startsWith("admin_")) dest = "/admin";
        else if (role === "therapist") dest = "/therapist";
      }
      router.push(dest);
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
          Welcome back. Your details stay private — we never share them.
        </p>

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
                  autoComplete="current-password"
                  placeholder="Your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to MindCross?{" "}
        <Link
          href={registerHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </Form>
  );
}
