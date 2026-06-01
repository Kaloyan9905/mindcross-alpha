import type { Metadata } from "next";
import Link from "next/link";

import { CONSENT_POLICY_VERSION } from "@/modules/identity/lib/consent";

export const metadata: Metadata = {
  title: "Therapy Disclaimer — MindCross",
  description:
    "Important information about the scope of MindCross therapy and what to do in an emergency.",
};

/**
 * Static therapy disclaimer. The single most important content is the
 * emergency notice: MindCross is not a crisis service.
 */
export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Therapy Disclaimer
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Policy version {CONSENT_POLICY_VERSION}
      </p>

      <div
        role="note"
        className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm leading-relaxed text-foreground"
      >
        <p className="font-semibold">
          MindCross is not an emergency service.
        </p>
        <p className="mt-2 text-muted-foreground">
          If you are in crisis or think you may harm yourself or someone else,
          do not use this platform to seek help. Call your local emergency
          number or a crisis line immediately. In the EU you can call{" "}
          <strong>112</strong>.
        </p>
      </div>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            What MindCross is
          </h2>
          <p className="mt-3">
            MindCross connects you with independent, qualified therapists for
            online sessions. The therapy itself is provided by those therapists,
            not by MindCross. We facilitate discovery and booking; we do not
            supervise or direct clinical care.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Not a substitute for emergency or medical care
          </h2>
          <p className="mt-3">
            Online therapy is not appropriate for medical emergencies, acute
            crises, or conditions that require in-person or urgent care. It does
            not replace advice from your doctor or local health services. If a
            therapist believes you need a higher level of care, they may refer
            you elsewhere.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Video sessions
          </h2>
          <p className="mt-3">
            At this stage MindCross does not host video calls. Your therapist
            shares their own secure meeting link (for example Google Meet, Zoom,
            or Whereby) with you for each session. Please treat that link as
            confidential.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Your consent
          </h2>
          <p className="mt-3">
            By creating an account you confirm you have read and understood this
            disclaimer alongside our{" "}
            <Link
              href="/privacy"
              className="text-primary underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
