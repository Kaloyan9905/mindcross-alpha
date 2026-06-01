/**
 * Consent versioning for GDPR record-keeping.
 *
 * MindCross serves Article 9 "special category" (health) data, so we must keep
 * a defensible record of WHAT a user consented to and WHEN. At registration we
 * stamp the user row with the current policy version + a timestamp (see
 * `registerAction`). Bump {@link CONSENT_POLICY_VERSION} whenever the privacy
 * policy / therapy disclaimer / data-processing terms materially change — a
 * future re-consent flow can then detect users on an older version.
 *
 * The single signup checkbox covers the privacy policy + therapy disclaimer +
 * data-processing terms; the register form links to them (`/privacy`,
 * `/disclaimer`).
 */

/**
 * Current consent policy version. Date-based (ISO `YYYY-MM-DD`) so it is human
 * readable and monotonic. Update this whenever the consented documents change.
 */
export const CONSENT_POLICY_VERSION = "2026-05-30";
