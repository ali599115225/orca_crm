import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  getTokenFingerprint,
} from "@/lib/whatsapp/credential-service";

describe("WhatsApp credential service", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY =
      "orca-whatsapp-test-encryption-key-material";
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("encrypts and decrypts a token with AES-256-GCM", () => {
    const encrypted = encryptToken("meta-access-token");

    expect(encrypted.algorithm).toBe("AES-256-GCM");
    expect(encrypted.keyVersion).toBe(1);
    expect(encrypted.iv).toHaveLength(24);
    expect(encrypted.authTag).toHaveLength(32);
    expect(encrypted.encryptedValue).not.toContain(
      "meta-access-token",
    );
    expect(decryptToken(encrypted)).toBe("meta-access-token");
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptToken("meta-access-token");

    expect(() =>
      decryptToken({
        ...encrypted,
        authTag: "00".repeat(16),
      }),
    ).toThrow("WHATSAPP_CREDENTIAL_DECRYPT_FAILED");
  });

  it("fails closed when the encryption key is unavailable", () => {
    delete process.env.ENCRYPTION_KEY;

    expect(() => encryptToken("meta-access-token")).toThrow(
      "WHATSAPP_CREDENTIAL_KEY_UNAVAILABLE",
    );
  });

  it("produces a stable non-secret token fingerprint", () => {
    expect(getTokenFingerprint("same-token")).toBe(
      getTokenFingerprint("same-token"),
    );
    expect(getTokenFingerprint("same-token")).not.toBe(
      getTokenFingerprint("different-token"),
    );
  });
});