import { describe, expect, it } from "vitest";
import {
  DocumentValidationError,
  inspectDocumentFile,
  sanitizeDocumentName,
} from "@/lib/documents/file-policy";

describe("document file policy", () => {
  it("removes path traversal and control characters from names", () => {
    expect(sanitizeDocumentName("../../folder/\u0000contract.pdf")).toBe(
      "contract.pdf",
    );
  });

  it("accepts a valid PDF and produces a checksum", async () => {
    const file = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
      "contract.pdf",
      { type: "application/pdf" },
    );
    const result = await inspectDocumentFile(file);
    expect(result.extension).toBe("pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks executable extensions", async () => {
    const file = new File([new Uint8Array([0x4d, 0x5a])], "unsafe.exe", {
      type: "application/octet-stream",
    });
    await expect(inspectDocumentFile(file)).rejects.toMatchObject({
      code: "UNSAFE_FILE_NAME",
    } satisfies Partial<DocumentValidationError>);
  });

  it("blocks content that does not match its extension", async () => {
    const file = new File([new TextEncoder().encode("not a pdf")], "fake.pdf", {
      type: "application/pdf",
    });
    await expect(inspectDocumentFile(file)).rejects.toMatchObject({
      code: "FILE_SIGNATURE_MISMATCH",
    } satisfies Partial<DocumentValidationError>);
  });
});
