import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { TxRecord, CreateTxPayload } from "./types.js";
import fs from "fs";
import path from "path";

const dbPath = process.env.SQLITE_PATH || "./data/app.sqlite";
// Asegura la carpeta del archivo
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Abre BD (fallback a memoria si falla)
let db: Database.Database;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error("[DB] Failed to open database at", dbPath, e);
  db = new Database(":memory:");
  console.warn("[DB] Using in-memory DB as fallback. Set SQLITE_PATH or ensure folder exists.");
}

// Esquema
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS tx (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  status TEXT NOT NULL,
  json TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)`);

/** Crea un registro de transacción */
export function createTx(payload: CreateTxPayload): TxRecord {
  const now = new Date().toISOString();
  const id = nanoid();
  const token = nanoid(32);

  const rec: TxRecord = {
    id,
    token,
    status: "created",
    createdAt: now,
    updatedAt: now,
    sanctions: undefined,
    files: {},
    ...payload,
  };

  db.prepare(
    "INSERT INTO tx (id, token, status, json, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, token, rec.status, JSON.stringify(rec), now, now);

  return rec;
}

/** Actualiza campos de un registro por id */
export function updateTx(id: string, mut: Partial<TxRecord>): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE id = ?").get(id) as { json: string } | undefined;
  if (!row) return null;
  const current = JSON.parse(row.json) as TxRecord;
  const next: TxRecord = { ...current, ...mut, updatedAt: new Date().toISOString() } as TxRecord;

  db.prepare("UPDATE tx SET status = ?, json = ?, updatedAt = ? WHERE id = ?")
    .run(next.status, JSON.stringify(next), next.updatedAt, id);

  return next;
}

/** Busca por token (para portal de firma) */
export function findByToken(token: string): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE token = ?").get(token) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as TxRecord) : null;
}

/** Busca por id */
export function findById(id: string): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE id = ?").get(id) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as TxRecord) : null;
}
