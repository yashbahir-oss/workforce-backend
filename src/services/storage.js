import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const useR2 = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
const privateDir = path.resolve(process.cwd(), process.env.PRIVATE_UPLOAD_DIR || 'private_uploads');
const r2 = useR2 ? new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }) : null;

export async function putPrivate(buffer, contentType, originalName = 'file') {
  const key = `private/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${String(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  if (useR2) { await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType })); return { key, provider: 'r2' }; }
  await fs.mkdir(path.dirname(path.join(privateDir, key)), { recursive: true });
  await fs.writeFile(path.join(privateDir, key), buffer);
  return { key, provider: 'local' };
}
export async function getPrivate(key) {
  if (useR2) return r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  return { Body: await fs.readFile(path.join(privateDir, key)) };
}
export async function deletePrivate(key) {
  if (!key) return;
  if (useR2) return r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  try { await fs.unlink(path.join(privateDir, key)); } catch {}
}
