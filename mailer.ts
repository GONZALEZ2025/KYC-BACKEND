import sgMail from "@sendgrid/mail";

const key = process.env.SENDGRID_API_KEY || "";
const from = process.env.EMAIL_FROM || "no-reply@example.com";
if (key) sgMail.setApiKey(key);

export async function sendEmail(to: string, subject: string, text: string, attachmentBase64?: string, filename?: string) {
  if (!key) { console.warn("[EMAIL] SENDGRID_API_KEY not set. Skipping."); return; }
  const msg: any = { to, from, subject, text };
  if (attachmentBase64) {
    msg.attachments = [{ content: attachmentBase64, filename: filename || "document.pdf", type: "application/pdf", disposition: "attachment" }];
  }
  await sgMail.send(msg);
}
