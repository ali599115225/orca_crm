import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { postJournalEntry, reverseJournalEntry } from '@/lib/accounting';

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload?.tenantId) return payload;
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload?.tenantId) return payload;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });

  try {
    const tenantId = session.tenantId as string;
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: any = { tenantId };
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });

  try {
    const tenantId = session.tenantId as string;
    const body = await request.json();
    const { description, source, sourceId, lines } = body;

    if (!description || !lines || lines.length < 2) {
      return NextResponse.json({ success: false, error: 'مطلوب: وصف وسطرين على الأقل' }, { status: 400 });
    }

    const entry = await postJournalEntry({
      tenantId,
      description,
      source: source || 'MANUAL',
      sourceId,
      lines: lines.map((l: any) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description,
      })),
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
