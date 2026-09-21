import crypto from 'crypto';

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 32) {
    throw new Error('ENCRYPTION_KEY env var must be at least 32 hex characters (256 bits)');
  }
  // Unified SHA-256 derivation — matches lib/crypto.ts
  return crypto.createHash('sha256').update(String(keyHex)).digest();
}

function getLegacyEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 32) {
    throw new Error('ENCRYPTION_KEY env var must be at least 32 hex characters (256 bits)');
  }
  // Legacy raw hex derivation (pre-08-G0)
  return Buffer.from(keyHex.padEnd(64, '0').substring(0, 64), 'hex');
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptValue(encoded: string): string {
  const parts = encoded.split(':');

  // v1: SHA-256 derivation (4 parts: version:iv:authTag:ciphertext)
  if (parts[0] === 'v1' && parts.length === 4) {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  // Legacy: raw hex derivation (3 parts: iv:authTag:ciphertext)
  if (parts.length === 3) {
    try {
      const key = getLegacyEncryptionKey();
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return decrypted;
    } catch {
      // Legacy decrypt failed — fall through to error
    }
  }

  throw new Error('Invalid encrypted format');
}
