/**
 * Email template builders. Each returns the three parts a sender needs:
 * `subject`, `html` (inline-styled — email clients strip <style> blocks), and
 * a plain-text `text` fallback that is ALWAYS present.
 *
 * Tone: warm and reassuring. MindCross serves migrants, refugees, and
 * international students, so the copy avoids clinical jargon.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Format a Date for display inside an email. Uses a fixed, human-readable
 * UTC rendering so the output is deterministic regardless of server locale.
 */
function formatWhen(startsAt: Date): string {
  return startsAt.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

/**
 * Wrap body content in a minimal, inline-styled HTML shell.
 */
function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#27272a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#4f46e5;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">MindCross</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
                <p style="margin:0;font-size:12px;color:#71717a;">
                  You are receiving this email because you have a booking on MindCross.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Confirmation email sent to a client right after a booking is created.
 */
export function bookingConfirmation(params: {
  clientName: string;
  therapistName: string;
  startsAt: Date;
  joinUrl: string | null;
}): RenderedEmail {
  const { clientName, therapistName, startsAt, joinUrl } = params;
  const when = formatWhen(startsAt);
  const greetingName = clientName.trim() || "there";

  const subject = `Your session with ${therapistName} is confirmed`;

  const joinHtml = joinUrl
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         When it is time, join your session here:<br />
         <a href="${joinUrl}" style="color:#4f46e5;font-weight:bold;">${joinUrl}</a>
       </p>`
    : `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         Your therapist will share the meeting link with you before the session.
       </p>`;

  const html = shell(
    "Your session is confirmed",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hi ${greetingName},</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       Great news — your session with <strong>${therapistName}</strong> is confirmed.
       We are glad you have taken this step.
     </p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       <strong>When:</strong> ${when}
     </p>
     ${joinHtml}
     <p style="margin:0;font-size:14px;line-height:1.6;">
       Take care,<br />The MindCross team
     </p>`,
  );

  const joinText = joinUrl
    ? `Join your session here when it is time:\n${joinUrl}`
    : "Your therapist will share the meeting link with you before the session.";

  const text = `Hi ${greetingName},

Great news - your session with ${therapistName} is confirmed. We are glad you have taken this step.

When: ${when}

${joinText}

Take care,
The MindCross team`;

  return { subject, html, text };
}

/**
 * Pre-session reminder email. `kind` selects the framing: "24h" (the main
 * reminder, the default) or "1h" (a short "starting soon" nudge).
 */
export function bookingReminder(params: {
  clientName: string;
  therapistName: string;
  startsAt: Date;
  joinUrl: string | null;
  kind?: "24h" | "1h";
}): RenderedEmail {
  const { clientName, therapistName, startsAt, joinUrl, kind = "24h" } = params;
  const when = formatWhen(startsAt);
  const greetingName = clientName.trim() || "there";

  const soon = kind === "1h";
  const subject = soon
    ? `Starting soon: your session with ${therapistName}`
    : `Reminder: your session with ${therapistName} is coming up`;
  const heading = soon ? "Your session is starting soon" : "Your session is coming up";
  const intro = soon
    ? `Your session with <strong>${therapistName}</strong> starts in about an hour. We are looking forward to supporting you.`
    : `This is a friendly reminder that your session with <strong>${therapistName}</strong> is coming up. We are looking forward to supporting you.`;
  const introText = soon
    ? `Your session with ${therapistName} starts in about an hour. We are looking forward to supporting you.`
    : `This is a friendly reminder that your session with ${therapistName} is coming up. We are looking forward to supporting you.`;

  const joinHtml = joinUrl
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         When it is time, join your session here:<br />
         <a href="${joinUrl}" style="color:#4f46e5;font-weight:bold;">${joinUrl}</a>
       </p>`
    : `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         Your therapist will share the meeting link with you before the session.
       </p>`;

  const html = shell(
    heading,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hi ${greetingName},</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${intro}</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       <strong>When:</strong> ${when}
     </p>
     ${joinHtml}
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       If you can no longer attend, you can cancel any time from your account so
       the slot opens up for someone else.
     </p>
     <p style="margin:0;font-size:14px;line-height:1.6;">
       Take care,<br />The MindCross team
     </p>`,
  );

  const joinText = joinUrl
    ? `Join your session here when it is time:\n${joinUrl}`
    : "Your therapist will share the meeting link with you before the session.";

  const text = `Hi ${greetingName},

${introText}

When: ${when}

${joinText}

If you can no longer attend, you can cancel any time from your account so the slot opens up for someone else.

Take care,
The MindCross team`;

  return { subject, html, text };
}

/**
 * Sent to a client when they move a booking to a new time.
 */
export function bookingRescheduled(params: {
  clientName: string;
  therapistName: string;
  startsAt: Date;
  joinUrl: string | null;
}): RenderedEmail {
  const { clientName, therapistName, startsAt, joinUrl } = params;
  const when = formatWhen(startsAt);
  const greetingName = clientName.trim() || "there";

  const subject = `Your session with ${therapistName} has been moved`;

  const joinHtml = joinUrl
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         When it is time, join your session here:<br />
         <a href="${joinUrl}" style="color:#4f46e5;font-weight:bold;">${joinUrl}</a>
       </p>`
    : `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
         Your therapist will share the meeting link with you before the session.
       </p>`;

  const html = shell(
    "Your session has been rescheduled",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hi ${greetingName},</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       Your session with <strong>${therapistName}</strong> has been moved to a
       new time. Here are the updated details.
     </p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       <strong>New time:</strong> ${when}
     </p>
     ${joinHtml}
     <p style="margin:0;font-size:14px;line-height:1.6;">
       Take care,<br />The MindCross team
     </p>`,
  );

  const joinText = joinUrl
    ? `Join your session here when it is time:\n${joinUrl}`
    : "Your therapist will share the meeting link with you before the session.";

  const text = `Hi ${greetingName},

Your session with ${therapistName} has been moved to a new time. Here are the updated details.

New time: ${when}

${joinText}

Take care,
The MindCross team`;

  return { subject, html, text };
}

/**
 * Notification sent to a client when their booking is cancelled.
 */
export function bookingCancellation(params: {
  clientName: string;
  therapistName: string;
  startsAt: Date;
}): RenderedEmail {
  const { clientName, therapistName, startsAt } = params;
  const when = formatWhen(startsAt);
  const greetingName = clientName.trim() || "there";

  const subject = `Your session with ${therapistName} has been cancelled`;

  const html = shell(
    "Your session has been cancelled",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hi ${greetingName},</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       This is a note to confirm that your session with
       <strong>${therapistName}</strong>, scheduled for <strong>${when}</strong>,
       has been cancelled.
     </p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       Whenever you feel ready, you are welcome to book another session — we are
       here when you need us.
     </p>
     <p style="margin:0;font-size:14px;line-height:1.6;">
       Take care,<br />The MindCross team
     </p>`,
  );

  const text = `Hi ${greetingName},

This is a note to confirm that your session with ${therapistName}, scheduled for ${when}, has been cancelled.

Whenever you feel ready, you are welcome to book another session - we are here when you need us.

Take care,
The MindCross team`;

  return { subject, html, text };
}
