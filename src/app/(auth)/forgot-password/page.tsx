import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reset your password — MindCross",
};

/**
 * Password-reset entry point. Self-service reset is not built yet, so this is
 * an honest, helpful page rather than a dead "Forgot password?" link.
 */
export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          We&rsquo;ll help you get back into your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Self-service password reset is coming soon. For now, email us from the
          address on your account at{" "}
          <a
            href="mailto:support@mindcross.local"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            support@mindcross.local
          </a>{" "}
          and we&rsquo;ll help you reset it.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
