import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.APP_SECRET || 'dev-only-insecure-secret-change-me';
  return createHash('sha256').update(secret).digest();
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptApiKey(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}