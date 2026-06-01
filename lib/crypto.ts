// lib/crypto.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// We use the system's JWT_SECRET or a default 32-byte string for key derivation
const ENCRYPTION_KEY = process.env.JWT_SECRET || "orca_crm_super_secure_key_32_bytes_long_123456"; 

/**
 * Encrypt a text string securely
 */
export function encryptText(text: string): string {
  if (!text) return "";
  try {
    // Generate a 32-byte key from our secret key
    const key = Buffer.alloc(32);
    Buffer.from(ENCRYPTION_KEY).copy(key);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption helper failed:", error);
    return "";
  }
}

/**
 * Decrypt a secured text string
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const key = Buffer.alloc(32);
    Buffer.from(ENCRYPTION_KEY).copy(key);

    const parts = encryptedText.split(":");
    if (parts.length !== 2) return "";
    
    const iv = Buffer.from(parts.shift() || "", "hex");
    const encrypted = parts.join(":");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption helper failed:", error);
    return "";
  }
}
