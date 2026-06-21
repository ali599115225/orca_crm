import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const source = process.env.ENCRYPTION_KEY?.trim() ?? '';

  if (source.length < 32) {
    throw new Error('ENCRYPTION_KEY must contain at least 32 characters');
  }

  return createHash('sha256').update(source, 'utf8').digest();
}

export function encryptSecret(value: string): string {
  if (!value) throw new Error('Secret value is required');

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, ciphertextPart, extra] = payload.split('.');

  if (
    extra !== undefined ||
    version !== VERSION ||
    !ivPart ||
    !tagPart ||
    !ciphertextPart
  ) {
    throw new Error('Encrypted secret payload is invalid');
  }

  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const ciphertext = Buffer.from(ciphertextPart, 'base64url');

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw new Error('Encrypted secret payload is invalid');
  }

  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
