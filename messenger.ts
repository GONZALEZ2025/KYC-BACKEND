import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID || "";
const token = process.env.TWILIO_AUTH_TOKEN || "";
const smsFrom = process.env.TWILIO_SMS_FROM || "";
const waFrom = process.env.TWILIO_WA_FROM || "";

export async function sendSMS(to: string, body: string) {
  if (!sid || !token || !smsFrom) { console.warn("[SMS] Twilio ENV not set. Skipping."); return; }
  const client = twilio(sid, token);
  await client.messages.create({ to, from: smsFrom, body });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!sid || !token || !waFrom) { console.warn("[WA] Twilio ENV not set. Skipping."); return; }
  const client = twilio(sid, token);
  await client.messages.create({ to: `whatsapp:${to}`, from: waFrom, body })
}
