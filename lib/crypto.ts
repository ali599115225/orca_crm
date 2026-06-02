import crypto from 'crypto';

// تأكد من وجود المفتاح السري أو استخدام مفتاح افتراضي آمن للتطوير
const ENCRYPTION_KEY = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'orca_secure_architect_secret_key_32';
const IV_LENGTH = 16;

// مواءمة طول المفتاح ليكون 32 بايت دائماً لـ aes-256-cbc
const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
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
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // التقاط خطأ الـ bad decrypt بأمان ودون إسقاط الخادم أو تعليق الـ SSR
    console.warn("⚠️ Decryption failed (Expired or invalid token token). Returning null safely.");
    return null;
  }
}
