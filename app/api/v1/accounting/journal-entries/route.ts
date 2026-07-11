import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ACCOUNTING_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from '@/lib/api-auth-guard';
import { postJournalEntry } from '@/lib/accounting';
import { ErrorCode } from '@/lib/errors';
import { httpErrorResponse } from '@/lib/http-error-response';

interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

function parseLine(value: unknown): JournalLineInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const accountId = typeof input.accountId === 'string' ? input.accountId.trim() : '';
  const debit = Number(input.debit || 0);
  const credit = Number(input.credit || 0);
  const description =
    typeof input.description === 'string' ? input.description.trim() : undefined;

  if (
    !accountId ||
    !Number.isFinite(debit) ||
    !Number.isFinite(credit) ||
    debit < 0 ||
    credit < 0 ||
    (debit === 0 && credit === 0) ||
    (debit > 0 && credit > 0)
  ) {
    return null;
  }

  return { accountId, debit, credit, description };
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const source = searchParams.get('source')?.trim() || undefined;
      const status = searchParams.get('status')?.trim() || undefined;

      const where: Record<string, unknown> = { tenantId: session.tenantId };
      if (source) where.source = source;
      if (status) where.status = status;

      const entries = await prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: { account: { select: { code: true, nameAr: true } } },
          },
        },
        orderBy: { entryNumber: 'desc' },
        take: 100,
      });

      return NextResponse.json({ success: true, entries });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        'GET /api/v1/accounting/journal-entries failed',
        error,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, ACCOUNTING_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const description =
        typeof body.description === 'string' ? body.description.trim() : '';
      const source = typeof body.source === 'string' ? body.source.trim() : 'MANUAL';
      const sourceId =
        typeof body.sourceId === 'string' ? body.sourceId.trim() : undefined;
      const lines: JournalLineInput[] = Array.isArray(body.lines)
        ? (body.lines as unknown[])
            .map(parseLine)
            .filter((line): line is JournalLineInput => line !== null)
        : [];

      if (!description || lines.length < 2 || lines.length !== body.lines?.length) {
        return NextResponse.json(
          { success: false, error: 'مطلوب وصف وسطران محاسبيان صالحان على الأقل.' },
          { status: 400 },
        );
      }

      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          { success: false, error: 'القيد غير متوازن: إجمالي المدين يجب أن يساوي إجمالي الدائن.' },
          { status: 400 },
        );
      }

      const entry = await postJournalEntry({
        tenantId: session.tenantId,
        description,
        source,
        sourceId,
        lines,
      });

      return NextResponse.json({ success: true, entry }, { status: 201 });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        'POST /api/v1/accounting/journal-entries failed',
        error,
      );
    }
  });
}
