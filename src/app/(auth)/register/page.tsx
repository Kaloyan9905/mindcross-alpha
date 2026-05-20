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
import { RegisterForm } from "@/modules/identity/components/register-form";

export const metadata: Metadata = {
  title: "Create an account — MindCross",
};

/**
 * Sign-up page. Already-authenticated users are bounced to /account.
 */
export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/account");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Find therapy that speaks your language.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
