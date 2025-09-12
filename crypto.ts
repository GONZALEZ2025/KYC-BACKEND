import crypto from "crypto";

const keyHex = process.env.AES_KEY_HEX || "";
if (!keyHex || keyHex.length !== 64) {
  console.warn("[WARN] AES_KEY_HEX not set or invalid length (expect 64 hex chars). Using volatile key.");
}
const key = Buffer.from((keyHex && keyHex.length===64? keyHex : crypto.randomBytes(32).toString("hex")),"hex");

export function encrypt(content: Buffer): { iv: string, tag: string, data: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(content), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("hex"), tag: tag.toString("hex"), data: enc.toString("base64") };
}

export function decrypt(ivHex: string, tagHex: string, base64: string): Buffer {
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(base64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
