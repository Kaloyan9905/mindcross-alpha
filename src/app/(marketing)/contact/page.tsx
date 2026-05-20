import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact — MindCross",
  description:
    "Get in touch with the MindCross team. We're a small team building an early version of culturally-matched therapy.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28 lg:px-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          We&rsquo;d love to hear from you
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Whether you have a question, need a hand with a booking, or just want
          to share feedback — please reach out. There&rsquo;s a real person on
          the other side, and we&rsquo;ll get back to you as soon as we can.
        </p>
      </header>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-semibold">Email us</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The quickest way to reach the MindCross team.
        </p>
        <Button asChild size="lg" className="mt-5">
          <a href="mailto:support@mindcross.local">support@mindcross.local</a>
        </Button>
      </div>

      <p className="mt-12 border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground">
        MindCross is an early-access product. Some features are still being
        built, and we&rsquo;re grateful for your patience and your feedback as
        we grow.
      </p>
    </div>
  );
}
