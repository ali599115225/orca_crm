import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { reverseJournalEntry } from '@/lib/accounting';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });

  try {
    const { id } = await params;
    const tenantId = session.tenantId as string;

    const entry = await prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { account: { select: { code: true, nameAr: true, nameEn: true } } },
        },
        reversedBy: true,
        reversals: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: 'القيد غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });

  try {
    const { id } = await params;
    const tenantId = session.tenantId as string;
    const body = await request.json();

    const reversal = await reverseJournalEntry(id, tenantId, body.reason || 'عكس يدوي');
    return NextResponse.json({ success: true, reversal });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
