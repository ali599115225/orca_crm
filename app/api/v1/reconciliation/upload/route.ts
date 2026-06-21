import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  parseCsvStatement,
  reconcileBankStatement,
} from '@/lib/accounting/bank-reconciliation';
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from '@/lib/api-auth-guard';
import {
  ErrorCode,
  publicError,
  statusForErrorCode,
  type ErrorCodeType,
} from '@/lib/errors';

export const runtime = 'nodejs';

const MAX_CSV_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = 6 * 1024 * 1024;
const MAX_ROWS = 5_000;
const MAX_COLUMNS = 20;
const MAX_FIELD_LENGTH = 500;

const ALLOWED_CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);

function errorResponse(
  code: ErrorCodeType,
  context: string,
  error?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, error), { status });
}

function decodeUtf8Csv(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.includes(0)) return null;

  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, '');
  } catch {
    return null;
  }
}

function validateCsvStructure(content: string): string | null {
  let rows = 1;
  let columns = 1;
  let fieldLength = 0;
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          index += 1;
          fieldLength += 1;
        } else {
          inQuotes = false;
        }
      } else {
        fieldLength += 1;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      columns += 1;
      fieldLength = 0;

      if (columns > MAX_COLUMNS) {
        return 'too_many_columns';
      }
    } else if (character === '\n') {
      rows += 1;
      columns = 1;
      fieldLength = 0;

      if (rows > MAX_ROWS) {
        return 'too_many_rows';
      }
    } else if (character !== '\r') {
      fieldLength += 1;
    }

    if (fieldLength > MAX_FIELD_LENGTH) {
      return 'field_too_long';
    }
  }

  return inQuotes ? 'unterminated_quote' : null;
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  if (!(await hasDatabaseRole(session, ['ADMIN']))) {
    return forbiddenResponse();
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_SIZE
    ) {
      return errorResponse(
        ErrorCode.FILE_TOO_LARGE,
        'reconciliation request exceeds size limit'
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get('file');
    const file = fileValue instanceof File ? fileValue : null;
    const modeValue = formData.get('mode');
    const mode =
      typeof modeValue === 'string' && modeValue.trim()
        ? modeValue.trim()
        : 'invoice';

    if (!file) {
      return errorResponse(
        ErrorCode.BAD_REQUEST,
        'reconciliation file is missing'
      );
    }

    if (!['bank', 'invoice'].includes(mode)) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'reconciliation mode is invalid'
      );
    }

    if (file.size <= 0 || file.size > MAX_CSV_SIZE) {
      return errorResponse(
        file.size > MAX_CSV_SIZE
          ? ErrorCode.FILE_TOO_LARGE
          : ErrorCode.VALIDATION_ERROR,
        'reconciliation CSV size is invalid'
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return errorResponse(
        ErrorCode.INVALID_FILE_TYPE,
        'reconciliation accepts CSV files only'
      );
    }

    const normalizedMime = file.type
      .toLowerCase()
      .split(';')[0]
      .trim();

    if (
      normalizedMime &&
      !ALLOWED_CSV_MIME_TYPES.has(normalizedMime)
    ) {
      return errorResponse(
        ErrorCode.INVALID_FILE_TYPE,
        'reconciliation CSV MIME type is unsupported'
      );
    }

    const fileContent = decodeUtf8Csv(await file.arrayBuffer());
    if (fileContent === null) {
      return errorResponse(
        ErrorCode.INVALID_FILE_TYPE,
        'reconciliation file is not valid UTF-8 text'
      );
    }

    const structuralError = validateCsvStructure(fileContent);
    if (structuralError) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        `reconciliation CSV validation failed: ${structuralError}`
      );
    }

    const tenantId = session.tenantId;

    if (mode === 'bank') {
      const statementLines = parseCsvStatement(fileContent);
      if (statementLines.length === 0) {
        return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'bank statement CSV could not be parsed'
        );
      }

      const result = await reconcileBankStatement(
        tenantId,
        statementLines
      );

      return NextResponse.json({
        success: true,
        mode: 'bank',
        message: `تمت معالجة ${statementLines.length} حركة بنكية — ${result.matches.length} مطابقة`,
        ...result,
      });
    }

    const unpaidInvoices = await prisma.rentalInvoice.findMany({
      where: {
        tenantId,
        status: { not: 'paid' },
      },
      include: { lease: true },
      orderBy: { dueDate: 'asc' },
    });

    const payments = await prisma.paymentTransaction.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        invoiceId: { not: null },
      },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        invoiceId: true,
        amount: true,
        paidAt: true,
        status: true,
      },
      take: 500,
    });

    const matches: Array<Record<string, unknown>> = [];
    const exceptions: Array<Record<string, unknown>> = [];

    for (const invoice of unpaidInvoices) {
      const matchedPayment = payments.find(
        (payment) => payment.invoiceId === invoice.id
      );

      if (matchedPayment) {
        matches.push({
          transactionId: matchedPayment.id,
          amount: Number(matchedPayment.amount),
          invoiceId: invoice.id,
          confidence: 1,
          note: `تمت المطابقة مع ${invoice.lease.tenantName}`,
        });
      } else {
        exceptions.push({
          transactionId: `UNMATCHED-${invoice.id.slice(0, 8)}`,
          amount: Number(invoice.totalAmount),
          note: `فاتورة غير مدفوعة: ${invoice.lease.tenantName} - ${invoice.lease.unitName}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'invoice',
      message: `تمت معالجة ${file.name}`,
      matches,
      exceptions,
    });
  } catch (error: unknown) {
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'reconciliation upload failed',
      error
    );
  }
}
