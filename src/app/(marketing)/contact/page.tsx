import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact — MindCross",
  description:
    "Get in touch with the MindCross team. We're a small team building an early version of culturally-matched therapy.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <header className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          We’d love to hear from you
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Whether you have a question, need a hand with a booking, or just want
          to share feedback — please reach out. There’s a real person on the
          other side, and we’ll get back to you as soon as we can.
        </p>
      </header>

      <Card className="mt-10">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"
          >
            <Mail className="h-7 w-7" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">Email us</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The quickest way to reach the MindCross team.
            </p>
          </div>
          <Button asChild size="lg">
            <a href="mailto:support@mindcross.local">
              support@mindcross.local
            </a>
          </Button>
        </CardContent>
      </Card>

      <p className="mt-8 rounded-lg bg-muted/60 p-4 text-center text-sm text-muted-foreground">
        MindCross is an early-access product. Some features are still being
        built, and we’re grateful for your patience and your feedback as we
        grow.
      </p>
    </div>
  );
}
