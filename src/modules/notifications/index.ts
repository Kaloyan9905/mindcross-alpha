/**
 * notifications — public API.
 *
 * Mock email at MVP: `sendEmail` logs to the console and writes a JSON file
 * to `dev-emails/`. Template builders return `{ subject, html, text }`.
 */
export { sendEmail } from "./lib/email";
export type { EmailMessage } from "./lib/email";

export {
  bookingConfirmation,
  bookingReminder,
  bookingRescheduled,
  bookingCancellation,
} from "./lib/templates";
export type { RenderedEmail } from "./lib/templates";
