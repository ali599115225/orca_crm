import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import {
  ErrorCode,
  publicError,
  statusForErrorCode,
  type ErrorCodeType,
} from '@/lib/errors';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE = 11 * 1024 * 1024;
const MAX_NAME_LENGTH = 180;

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'csv',
]);

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ],
  xls: [
    'application/vnd.ms-excel',
    'application/octet-stream',
  ],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/octet-stream',
  ],
  txt: ['text/plain'],
  csv: [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain',
  ],
};

function errorResponse(
  code: ErrorCodeType,
  context: string,
  error?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, error), { status });
}

function sanitizeFileName(value: string): string {
  const baseName = value
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.trim() ?? '';

  return baseName
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^a-zA-Z0-9._\-ء-ي ()]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, MAX_NAME_LENGTH);
}

function extensionOf(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match?.[1].toLowerCase() ?? '';
}

function startsWithBytes(
  bytes: Uint8Array,
  signature: readonly number[]
): boolean {
  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function looksLikeUtf8Text(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function magicMatches(extension: string, bytes: Uint8Array): boolean {
  switch (extension) {
    case 'pdf':
      return startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case 'jpg':
    case 'jpeg':
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case 'png':
      return startsWithBytes(
        bytes,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      );
    case 'webp':
      return (
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
      );
    case 'doc':
    case 'xls':
      return startsWithBytes(
        bytes,
        [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
      );
    case 'docx':
    case 'xlsx':
      return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]);
    case 'txt':
    case 'csv':
      return looksLikeUtf8Text(bytes);
    default:
      return false;
  }
}

function validateExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeOptionalString(
  value: FormDataEntryValue | null,
  maximumLength: number
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'documents GET authentication failed'
      );
    }

    const linkedTo = request.nextUrl.searchParams.get('linkedTo')?.trim();
    const linkedType = request.nextUrl.searchParams.get('linkedType')?.trim();

    if (
      (linkedTo && linkedTo.length > 100) ||
      (linkedType && linkedType.length > 50)
    ) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'documents GET filters are invalid'
      );
    }

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
    };

    if (linkedTo) where.linkedTo = linkedTo;
    if (linkedType) where.linkedType = linkedType;

    const prismaAny = prisma as any;
    const documents = await prismaAny.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: unknown) {
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'documents GET failed',
      error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'documents POST authentication failed'
      );
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return errorResponse(
        ErrorCode.FILE_TOO_LARGE,
        'documents request exceeds size limit'
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get('file');
    const file = fileValue instanceof File ? fileValue : null;
    const rawUrl = safeOptionalString(formData.get('url'), 2_048);

    if ((!file && !rawUrl) || (file && rawUrl)) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'documents request must contain either one file or one URL'
      );
    }

    const linkedTo = safeOptionalString(formData.get('linkedTo'), 100);
    const linkedType = safeOptionalString(formData.get('linkedType'), 50);
    const rawType = safeOptionalString(formData.get('type'), 50) ?? 'OTHER';

    if (!/^[A-Za-z0-9_-]+$/.test(rawType)) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'document type is invalid'
      );
    }

    let storedName: string;
    let storedUrl: string;
    let storedSize = 0;

    if (file) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return errorResponse(
          file.size > MAX_FILE_SIZE
            ? ErrorCode.FILE_TOO_LARGE
            : ErrorCode.VALIDATION_ERROR,
          'document file size is invalid'
        );
      }

      const safeFileName = sanitizeFileName(file.name);
      const extension = extensionOf(safeFileName);

      if (
        !safeFileName ||
        !ALLOWED_EXTENSIONS.has(extension) ||
        safeFileName.startsWith('.')
      ) {
        return errorResponse(
          ErrorCode.INVALID_FILE_TYPE,
          'document file extension is not allowed'
        );
      }

      const normalizedMime = file.type
        .toLowerCase()
        .split(';')[0]
        .trim();

      if (
        normalizedMime &&
        !MIME_BY_EXTENSION[extension].includes(normalizedMime)
      ) {
        return errorResponse(
          ErrorCode.INVALID_FILE_TYPE,
          'document MIME type does not match its extension'
        );
      }

      const sample = new Uint8Array(
        await file.slice(0, 4_096).arrayBuffer()
      );

      if (!magicMatches(extension, sample)) {
        return errorResponse(
          ErrorCode.INVALID_FILE_TYPE,
          'document magic bytes do not match its extension'
        );
      }

      const requestedName =
        safeOptionalString(formData.get('name'), MAX_NAME_LENGTH) ??
        safeFileName;
      storedName = sanitizeFileName(requestedName);

      if (!storedName) {
        return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'document name is invalid'
        );
      }

      storedUrl = `/mock-documents/doc-${Date.now()}-${encodeURIComponent(
        safeFileName
      )}`;
      storedSize = file.size;
    } else {
      const validatedUrl = validateExternalUrl(rawUrl as string);
      if (!validatedUrl) {
        return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'document URL must be a valid HTTPS URL'
        );
      }

      const requestedName =
        safeOptionalString(formData.get('name'), MAX_NAME_LENGTH) ??
        'external-document';
      storedName = sanitizeFileName(requestedName);

      if (!storedName) {
        return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'document name is invalid'
        );
      }

      storedUrl = validatedUrl;
    }

    const prismaAny = prisma as any;
    const document = await prismaAny.document.create({
      data: {
        tenantId: session.tenantId,
        name: storedName,
        url: storedUrl,
        type: rawType,
        linkedTo,
        linkedType,
        size: storedSize,
      },
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error: unknown) {
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'documents POST failed',
      error
    );
  }
}
