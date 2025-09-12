import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import { createTx, findByToken, updateTx, findById } from "./db.js";
import { saveEncryptedFile } from "./storage.js";
import { sendEmail } from "./mailer.js";
import { sendSMS, sendWhatsApp } from "./messenger.js";
import { runScreening } from "./screening.js";
import { CreateTxPayload } from "./types.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// CORS
const allowed = (process.env.CORS_ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
app.use(cors({ origin: (origin, cb) => {
  if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
  return cb(new Error("CORS blocked"));
}, credentials: true }));

app.use(bodyParser.json({ limit: "10mb" }));
app.get("/health", (_, res) => res.json({ ok: true }));

// Create transaction
app.post("/api/tx/create", async (req, res) => {
  try {
    const p = req.body as CreateTxPayload;
    if (!p.fullName || !p.asset || !p.usdAmount || !p.pricing?.priceUsd) return res.status(400).json({ error: "missing fields" });
    const sanctions = await runScreening(p.fullName, p.dob);
    const rec = createTx({ ...p });
    const rec2 = updateTx(rec.id, { sanctions })!;
    return res.json({ id: rec2.id, token: rec2.token, status: rec2.status });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// Upload encrypted evidence
app.post("/api/tx/:id/upload", upload.single("file"), async (req, res) => {
  try {
    const id = req.params.id; const kind = (req.query.kind as string) || "bin";
    const rec = findById(id);
    if (!rec) return res.status(404).json({ error: "not found" });
    if (!req.file) return res.status(400).json({ error: "file required" });
    const ext = kind === "pdf" ? "pdf" : "jpg";
    const stored = await saveEncryptedFile(kind, req.file.buffer, ext);
    const files = { ...rec.files, [kind]: stored } as any;
    const next = updateTx(id, { files });
    return res.json({ ok: true, path: stored, id: next?.id });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// Remote signing portal – fetch by token
app.get("/api/sign/:token", (req, res) => {
  const rec = findByToken(req.params.token);
  if (!rec) return res.status(404).json({ error: "not found" });
  return res.json({ id: rec.id, fullName: rec.fullName, asset: rec.asset, pricing: rec.pricing, statementPreview: true });
});

// Submit client signature
app.post("/api/sign/:token", upload.none(), async (req, res) => {
  try {
    const rec = findByToken(req.params.token);
    if (!rec) return res.status(404).json({ error: "not found" });
    const sigDataUrl = req.body.signatureDataUrl as string;
    if (!sigDataUrl?.startsWith("data:image/png;base64,")) return res.status(400).json({ error: "invalid signature" });
    const base64 = sigDataUrl.split(",")[1];
    const buf = Buffer.from(base64, "base64");
    const stored = await saveEncryptedFile("signature", buf, "png");
    const files = { ...rec.files, signature: stored } as any;
    const next = updateTx(rec.id, { files, status: "signed" });
    return res.json({ ok: true, id: next?.id });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// Send receipts
app.post("/api/tx/:id/send", async (req, res) => {
  try {
    const id = req.params.id; const rec = findById(id);
    if (!rec) return res.status(404).json({ error: "not found" });
    const toEmail = req.body.toEmail as string | undefined;
    const toSMS = req.body.toSMS as string | undefined;
    const toWA = req.body.toWA as string | undefined;
    const pdfBase64 = req.body.pdfBase64 as string | undefined;

    const subject = `Your ${rec.asset} Receipt – ${new Date().toISOString().slice(0,10)}`;
    const body = `Hello ${rec.fullName},\n\nReceipt attached. Pricing at ${rec.pricing.pricedAtISO}, amount ${rec.pricing.amountCrypto} ${rec.asset}.\n`;

    if (toEmail && pdfBase64) await sendEmail(toEmail, subject, body, pdfBase64, `receipt-${rec.id}.pdf`);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 8080, () => console.log(`API on :${process.env.PORT || 8080}`));
