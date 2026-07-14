import { createHash } from "node:crypto";

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_DOCUMENT_NAME_LENGTH = 180;

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  webp: ["image/webp"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv", "text/plain"],
};

const SAFE_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

export class DocumentValidationError extends Error {
  constructor(
    public readonly code:
      | "EMPTY_FILE"
      | "FILE_TOO_LARGE"
      | "UNSAFE_FILE_NAME"
      | "INVALID_FILE_TYPE"
      | "FILE_SIGNATURE_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export function sanitizeDocumentName(value: string): string {
  const baseName =
    value.replace(/\\/g, "/").split("/").pop()?.trim() || "";

  return baseName
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^a-zA-Z0-9._\-ء-ي ()]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, MAX_DOCUMENT_NAME_LENGTH);
}

function extensionOf(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match?.[1].toLowerCase() || "";
}

function startsWith(bytes: Buffer, signature: readonly number[]): boolean {
  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function isUtf8Text(bytes: Buffer): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function zipContainsOfficeStructure(
  bytes: Buffer,
  extension: "docx" | "xlsx",
): boolean {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const binary = bytes.toString("latin1");
  return (
    binary.includes("[Content_Types].xml") &&
    binary.includes(extension === "docx" ? "word/" : "xl/")
  );
}

function signatureMatches(extension: string, bytes: Buffer): boolean {
  switch (extension) {
    case "pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWith(
        bytes,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      );
    case "webp":
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "docx":
    case "xlsx":
      return zipContainsOfficeStructure(bytes, extension);
    case "txt":
    case "csv":
      return isUtf8Text(bytes);
    default:
      return false;
  }
}

export async function inspectDocumentFile(file: File): Promise<{
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  content: Buffer;
  checksumSha256: string;
}> {
  if (file.size <= 0) {
    throw new DocumentValidationError("EMPTY_FILE", "The file is empty.");
  }
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    throw new DocumentValidationError(
      "FILE_TOO_LARGE",
      "The file exceeds the allowed size.",
    );
  }

  const name = sanitizeDocumentName(file.name);
  const extension = extensionOf(name);

  if (
    !name ||
    name.startsWith(".") ||
    name.includes("..") ||
    !(extension in MIME_BY_EXTENSION)
  ) {
    throw new DocumentValidationError(
      "UNSAFE_FILE_NAME",
      "The file name or extension is not allowed.",
    );
  }

  const incomingMime = String(file.type || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (
    incomingMime &&
    !MIME_BY_EXTENSION[extension].includes(incomingMime)
  ) {
    throw new DocumentValidationError(
      "INVALID_FILE_TYPE",
      "The MIME type does not match the file extension.",
    );
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(extension, content)) {
    throw new DocumentValidationError(
      "FILE_SIGNATURE_MISMATCH",
      "The file signature does not match its extension.",
    );
  }

  return {
    name,
    extension,
    mimeType: SAFE_MIME_BY_EXTENSION[extension],
    size: content.byteLength,
    content,
    checksumSha256: createHash("sha256").update(content).digest("hex"),
  };
}
