import crypto from 'crypto';

function getEncryptionKey(): string {
  const key = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!key) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET environment variable is required for encryption.");
  }
  return key;
}

const IV_LENGTH = 16;

function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(String(getEncryptionKey())).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', deriveKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string | null {
  try {
    if (!text || !text.includes(':')) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', deriveKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export const encryptText = encrypt;
export const decryptText = decrypt;
