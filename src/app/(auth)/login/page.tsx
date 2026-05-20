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
import { LoginForm } from "@/modules/identity/components/login-form";

export const metadata: Metadata = {
  title: "Sign in — MindCross",
};

/**
 * Sign-in page. Already-authenticated users are bounced to /account so they
 * never see a login form while logged in.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/account");
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
        <LoginForm />
      </CardContent>
    </Card>
  );
}
