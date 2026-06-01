import type { Metadata } from "next";
import Link from "next/link";

import { CONSENT_POLICY_VERSION } from "@/modules/identity/lib/consent";

export const metadata: Metadata = {
  title: "Privacy Policy — MindCross",
  description:
    "How MindCross collects, uses, and protects your personal and health data, and the rights you have under the GDPR.",
};

/**
 * Static privacy policy. Plain-language and intentionally scoped to the MVP:
 * email/password accounts, free bookings, mock notifications, no payments and
 * no in-platform video. The `CONSENT_POLICY_VERSION` shown here is the same
 * version recorded against a user's account at signup.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Policy version {CONSENT_POLICY_VERSION}
      </p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Who we are</h2>
          <p className="mt-3">
            MindCross is a platform that helps migrants, refugees, and
            international students find culturally- and linguistically-matched
            therapists. This policy explains what data we hold and why. It is
            written in plain language on purpose — if anything is unclear,
            please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            What we collect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Account data</strong> — your name, email address, and a
              securely hashed password. We never store your password in plain
              text.
            </li>
            <li>
              <strong>Booking data</strong> — the sessions you book, with whom,
              and when, plus any optional note you choose to share with your
              therapist.
            </li>
            <li>
              <strong>Consent record</strong> — the date and policy version of
              the consent you give at sign-up, kept as proof that you agreed.
            </li>
          </ul>
          <p className="mt-3">
            Some of this — for example that you are seeking therapy — is
            &ldquo;special category&rdquo; health data under Article 9 of the
            GDPR. We only process it with your explicit consent, to provide the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            How we use your data
          </h2>
          <p className="mt-3">
            We use your data only to run the service: to create your account,
            show you therapists, let you book sessions, and send you booking
            confirmations and reminders by email. We do not sell your data, and
            we do not use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Your rights
          </h2>
          <p className="mt-3">
            Under the GDPR you can access, correct, or delete your data, and
            withdraw consent at any time. You can request deletion of your
            account from your{" "}
            <Link
              href="/account"
              className="text-primary underline-offset-4 hover:underline"
            >
              account page
            </Link>
            ; we will erase your personal data and free any upcoming session
            slots you held.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            For any privacy question or data request, email{" "}
            <a
              href="mailto:privacy@mindcross.local"
              className="text-primary underline-offset-4 hover:underline"
            >
              privacy@mindcross.local
            </a>
            .
          </p>
        </section>

        <p className="border-t border-border pt-6 text-sm">
          See also our{" "}
          <Link
            href="/disclaimer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Therapy Disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
