/**
 * lib/crypto-gcm.ts
 * ORCA CRM — Government Credentials Encryption
 *
 * Uses AES-256-GCM (authenticated encryption) with HKDF key derivation.
 * Stored format: "v2:{keyVersion}:{base64(iv[12] || authTag[16] || ciphertext)}"
 *
 * Backward-compatible read of legacy AES-256-CBC values (format: "{ivHex}:{ctHex}").
 * Legacy format is READ-ONLY — all new encryptions use GCM.
 */
import crypto from 'crypto';

const GCM_ALG = 'aes-256-gcm' as const;
const IV_BYTES = 12;   // 96-bit IV — GCM standard
const TAG_BYTES = 16;  // 128-bit auth tag

// Salt scoped to government credential usage — never changes once deployed
const HKDF_SALT = 'orca-gov-credentials-v2';
const HKDF_INFO = '';

/**
 * Derives a 32-byte key via HKDF-SHA256.
 * Throws if ENCRYPTION_KEY is not set — fail-closed.
 */
function deriveGcmKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey || rawKey.trim().length === 0) {
    throw new Error('[crypto-gcm] ENCRYPTION_KEY env variable is required');
  }
  return Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(rawKey, 'utf8'),
      HKDF_SALT,
      HKDF_INFO,
      32
    )
  );
}

/** Current version tag written with every new encryption */
function currentKeyVersion(): string {
  return process.env.ENCRYPTION_KEY_VERSION ?? '1';
}

// ─── GCM Encrypt ─────────────────────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-GCM + HKDF.
 * Returns "v2:{keyVersion}:{base64(iv||authTag||ciphertext)}"
 */
export function encryptGcm(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveGcmKey();
  const cipher = crypto.createCipheriv(GCM_ALG, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // always 16 bytes
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return `v2:${currentKeyVersion()}:${combined.toString('base64')}`;
}

// ─── GCM Decrypt ─────────────────────────────────────────────────────────────

/**
 * Decrypts a GCM-encrypted value.
 * Returns null — never throws — on any failure (wrong key, tampered data, bad format).
 * null → GatReason.CREDENTIALS_INTEGRITY_FAILED
 */
export function decryptGcm(stored: string): string | null {
  try {
    // Expected prefix: "v2:{version}:{base64}"
    if (!stored.startsWith('v2:')) return null;
    const colonTwo = stored.indexOf(':', 3);
    if (colonTwo === -1) return null;
    const b64 = stored.slice(colonTwo + 1);
    const combined = Buffer.from(b64, 'base64');

    // Minimum: iv(12) + authTag(16) = 28 bytes + at least 0 bytes ciphertext
    if (combined.length < IV_BYTES + TAG_BYTES) return null;

    const iv = combined.subarray(0, IV_BYTES);
    const authTag = combined.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = combined.subarray(IV_BYTES + TAG_BYTES);

    const decipher = crypto.createDecipheriv(GCM_ALG, deriveGcmKey(), iv);
    decipher.setAuthTag(authTag);
    // decipher.final() throws AuthTagMismatch if authTag is wrong → caught below
    const plain =
      decipher.update(ciphertext).toString('utf8') +
      decipher.final('utf8');
    return plain;
  } catch {
    return null;
  }
}

// ─── Legacy CBC Decrypt (READ-ONLY backward compat) ──────────────────────────

/**
 * Decrypts a legacy AES-256-CBC value.
 * Format: "{ivHex}:{encryptedHex}" (from lib/crypto.ts encrypt())
 * READ-ONLY — used only during the migration window.
 */
function decryptCbc(stored: string): string | null {
  try {
    if (!stored.includes(':')) return null;
    const rawKey = process.env.ENCRYPTION_KEY;
    if (!rawKey || rawKey.trim().length === 0) return null;

    // Derive CBC key exactly as lib/crypto.ts does (SHA-256 of raw key)
    const key = crypto.createHash('sha256').update(rawKey).digest();
    const parts = stored.split(':');
    const ivHex = parts[0];
    const ctHex = parts.slice(1).join(':');

    if (!ivHex || !ctHex) return null;
    // CBC IV is 16 bytes = 32 hex chars
    if (ivHex.length !== 32 || !/^[0-9a-f]+$/i.test(ivHex)) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

// ─── Compat Layer ─────────────────────────────────────────────────────────────

/**
 * Decrypts a credential stored in either GCM (v2:...) or legacy CBC (hex:hex).
 *
 * - Returns the plaintext string on success.
 * - Returns null on any failure (wrong key, corrupt data, missing env).
 *   Callers translate null → CREDENTIALS_INTEGRITY_FAILED.
 *
 * This dual-read exists only during the CBC→GCM migration window.
 * Once all tenants are migrated, decryptCbc will be removed.
 */
export function decryptCompat(stored: string | null | undefined): string | null {
  if (!stored || stored.trim().length === 0) return null;
  if (stored.startsWith('v2:')) return decryptGcm(stored);
  return decryptCbc(stored);
}

// ─── Re-export encryptText alias for new code ─────────────────────────────────

/** Canonical alias — always GCM */
export const encryptText = encryptGcm;
