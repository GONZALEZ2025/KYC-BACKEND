// server.ts
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import sgMail from '@sendgrid/mail';

// -----------------------------
// Config & helpers
// -----------------------------
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB

// CORS: lee de env (coma separada) o usa una lista por defecto
const allowed = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (allowed.length === 0) {
  allowed.push(
    'https://agmanagement.co',
    'https://*.hostingersite.com',
    'http://localhost:3000',
    'http://localhost:5173'
  );
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok = allowed.some((p) =>
        p.includes('*')
          ? new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(origin)
          : origin === p
      );
      cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.options('*', cors());

app.use(express.json({ limit: '2mb' }));

// SendGrid (opcional)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// -----------------------------
// Utilidades de precio
// -----------------------------
type PriceResp = { usd: number };

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  TRX: 'tron',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  TON: 'the-open-network',
  SHIB: 'shiba-inu',
  // agrega más si quieres
};

async function fetchUsdPrice(asset: string): Promise<number> {
  const symbol = asset.toUpperCase();
  const id = COINGECKO_IDS[symbol] ?? COINGECKO_IDS['BTC'];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    id
  )}&vs_currencies=usd`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Price provider error');
  const j = (await r.json()) as Record<string, PriceResp>;
  const price = j[id]?.usd;
  if (!price || typeof price !== 'number') throw new Error('Invalid price');
  return price;
}

// -----------------------------
// Rutas
// -----------------------------

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'kyc-backend', ts: Date.now() });
});

// Subida + OCR simulado
// Front debe enviar campo "idImage" (input type="file" name="idImage")
app.post('/api/ocr', upload.single('idImage'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Missing file idImage' });
    }

    // Aquí integrarías tu OCR/IDV real. Por ahora, simulamos:
    const demo = {
      fullName: 'John Michael Doe',
      documentType: 'Driver License',
      documentNumber: 'D12345678',
      dob: '1990-05-10',
      address: '123 Main St, Las Vegas, NV 89101, USA',
      country: 'US',
    };

    // Si quieres guardar el binario en GDrive/S3, hazlo aquí usando req.file.buffer

    res.json({ ok: true, data: demo });
  } catch (err: any) {
    console.error('OCR error', err);
    res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
  }
});

// Cotización: { asset, amountUsd }
app.post('/api/quote', async (req: Request, res: Response) => {
  try {
    const { asset, amountUsd } = req.body || {};
    if (!asset || typeof amountUsd !== 'number' || amountUsd <= 0) {
      return res.status(400).json({ ok: false, error: 'asset and amountUsd required' });
    }

    const priceUsd = await fetchUsdPrice(asset);
    const feePct = 0.05; // 5%
    const feeUsd = +(amountUsd * feePct).toFixed(2);
    const netUsd = +(amountUsd - feeUsd).toFixed(2);
    const assetAmount = +(netUsd / priceUsd).toFixed(8);
    const ts = new Date().toISOString();

    res.json({
      ok: true,
      asset: asset.toUpperCase(),
      amountUsd,
      priceUsd,
      feePct,
      feeUsd,
      netUsd,
      assetAmount,
      timestamp: ts,
    });
  } catch (err: any) {
    console.error('Quote error', err);
    res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
  }
});

// Guarda firma (opcionalmente recibes la imagen dataURL para anexarla al PDF/registro)
// body: { fullName, consent, dataUrl }
app.post('/api/save-signature', async (req: Request, res: Response) => {
  try {
    const { fullName, consent, dataUrl } = req.body || {};
    if (!fullName || typeof consent !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'fullName and consent required' });
    }
    // Aquí podrías guardar en DB o GDrive la firma (dataUrl)
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Signature error', err);
    res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
  }
});

// Finaliza & envía recibo (email opcional con SendGrid)
// body: { email?, phone? }
app.post('/api/finalize', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body || {};
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: 'email or phone required' });
    }

    // Si configuraste SendGrid, envía un correo de confirmación
    if (email && process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
      const html = `
        <div style="font-family:Inter,Segoe UI,Arial,sans-serif">
          <h2>AG Management – Receipt</h2>
          <p>We received your submission. Our team will process your order (up to 24h).</p>
          <p>If you need help, reply to this email.</p>
        </div>
      `;
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_FROM!,
        subject: 'Your crypto purchase receipt',
        html,
      });
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Finalize error', err);
    res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
  }
});

// -----------------------------
// Errores
// -----------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ ok: false, error: 'Internal error' });
});

// -----------------------------
// Start
// -----------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`KYC backend listening on :${PORT}`);
  console.log('Allowed origins:', allowed);
});
