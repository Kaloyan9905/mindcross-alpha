import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/modules/identity/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { LoginForm } from "@/modules/identity/components/login-form";

export const metadata: Metadata = {
  title: "Sign in — MindCross",
};

/**
 * Sign-in page. Already-authenticated users are bounced to where they were
 * headed (the validated `callbackUrl`), or /account.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage your therapy bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
