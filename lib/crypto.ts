import crypto from 'crypto';

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required for data encryption.");
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

export function isEncryptedValue(value: string): boolean {
  if (!value || !value.includes(":")) return false;
  const colonIndex = value.indexOf(":");
  const ivPart = value.substring(0, colonIndex);
  if (ivPart.length !== 32) return false;
  if (!/^[0-9a-f]{32}$/i.test(ivPart)) return false;
  const cipherPart = value.substring(colonIndex + 1);
  if (cipherPart.length === 0) return false;
  return /^[0-9a-f]+$/i.test(cipherPart);
}

export function decryptIfEncrypted(value: string): string {
  if (!value) return value;
  if (isEncryptedValue(value)) {
    const decrypted = decrypt(value);
    if (decrypted !== null) return decrypted;
  }
  return value;
}
