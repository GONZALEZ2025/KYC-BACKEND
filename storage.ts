import fs from "fs";
import path from "path";
import { encrypt } from "./crypto.js";
import mime from "mime-types";
import { saveToDrive } from "./storage_gdrive.js";

const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const baseDir = process.env.LOCAL_STORAGE_DIR || "./data";

export async function saveEncryptedFile(kind: string, buf: Buffer, ext = "bin"): Promise<string> {
  const { iv, tag, data } = encrypt(buf);
  const payload = JSON.stringify({ iv, tag, data, mime: mime.lookup(ext) || "application/octet-stream" });

  if (driver === "gdrive") {
    const folderId = process.env.GDRIVE_FOLDER_ID || "";
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}.enc.json`;
    const id = await saveToDrive(fileName, Buffer.from(payload), "application/json", folderId);
    return `gdrive:${id}`;
  }

  const dir = path.join(baseDir, kind);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}.enc`;
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, payload);
  return filePath;
}
