import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { TxRecord, CreateTxPayload } from "./types.js";

const dbPath = process.env.SQLITE_PATH || "./data/app.sqlite";
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS tx (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  status TEXT NOT NULL,
  json TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)`);

export function createTx(payload: CreateTxPayload): TxRecord {
  const now = new Date().toISOString();
  const id = nanoid();
  const token = nanoid(32);
  const rec: TxRecord = {
    id, token, status: "created", createdAt: now, updatedAt: now,
    sanctions: undefined, files: {}, ...payload
  };
  db.prepare("INSERT INTO tx (id, token, status, json, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, token, rec.status, JSON.stringify(rec), now, now);
  return rec;
}

export function updateTx(id: string, mut: Partial<TxRecord>): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE id = ?").get(id) as { json: string } | undefined;
  if (!row) return null;
  const current = JSON.parse(row.json) as TxRecord;
  const next: TxRecord = { ...current, ...mut, updatedAt: new Date().toISOString() } as TxRecord;
  db.prepare("UPDATE tx SET status = ?, json = ?, updatedAt = ? WHERE id = ?")
    .run(next.status, JSON.stringify(next), next.updatedAt, id);
  return next;
}

export function findByToken(token: string): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE token = ?").get(token) as { json: string } | undefined;
  return row ? JSON.parse(row.json) as TxRecord : null;
}

export function findById(id: string): TxRecord | null {
  const row = db.prepare("SELECT json FROM tx WHERE id = ?").get(id) as { json: string } | undefined;
  return row ? JSON.parse(row.json) as TxRecord : null;
}
