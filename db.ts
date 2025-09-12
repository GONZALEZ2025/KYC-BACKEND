import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { TxRecord, CreateTxPayload } from "./types.js";
import fs from "fs";
import path from "path";

const dbPath = process.env.SQLITE_PATH || "./data/app.sqlite";

// 👇 Asegura que la carpeta exista (si no, better-sqlite3 truena al abrir)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db: Database.Database;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error("[DB] Failed to open database at", dbPath, e);
  // Como plan B: usar memoria para que la app arranque (no persistente)
  db = new Database(":memory:");
  console.warn("[DB] Using in-memory DB as fallback. Set SQLITE_PATH or ensure folder exists.");
}

// Ajustes y tabla
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS tx (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  status TEXT NOT NULL,
  json TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)`);
