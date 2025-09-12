import { google } from "googleapis";
import { Readable } from "stream";

function getAuth(){
  const email = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "";
  let key = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  key = key.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google Drive credentials missing");
  return new google.auth.JWT({ email, key, scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata"
  ]});
}

export async function saveToDrive(name: string, buf: Buffer, mimeType: string, folderId?: string){
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata: any = { name };
  if (folderId) fileMetadata.parents = [folderId];
  const media: any = { mimeType, body: BufferToStream(buf) };
  const res = await drive.files.create({ requestBody: fileMetadata, media, fields: 'id' });
  return res.data.id as string;
}

function BufferToStream(b: Buffer){ const s = new Readable(); s.push(b); s.push(null); return s; }
