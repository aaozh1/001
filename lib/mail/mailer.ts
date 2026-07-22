import "server-only";

// Mail boundary — same shape as the payment gateway (3.1): the app talks to
// THIS interface only, the vendor decision (SES/Postmark/SMTP relay) plugs in
// later. Until MAIL_MODE=smtp is configured, messages are logged so dev flows
// stay testable without pretending an email went out.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export type MailResult = { sent: true } | { sent: false; reason: "unconfigured" | "failed" };

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (process.env.MAIL_MODE === "smtp" && process.env.SMTP_URL) {
    // Vendor wiring lands with the SMTP decision (see docs/DEPLOY.md).
    console.error("[mail] MAIL_MODE=smtp set but no transport is wired yet");
    return { sent: false, reason: "unconfigured" };
  }
  console.log(`[mail:log] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
  return { sent: false, reason: "unconfigured" };
}
