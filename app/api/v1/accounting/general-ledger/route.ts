import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { getGeneralLedgerReport } from '@/lib/accounting';
import {
  enforceProgressiveAuthorization,
  isEnforcementDomainEnabled,
} from '@/lib/authz/enforcement';

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
    const tenantId = typeof session.tenantId === 'string' ? session.tenantId : '';
    const userId = typeof session.userId === 'string' ? session.userId : '';
    if (!tenantId) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    if (!userId && isEnforcementDomainEnabled('finance')) {
      return NextResponse.json({ error: 'غير مصرح بالصلاحية' }, { status: 403 });
    }

    if (userId) {
      const access = await enforceProgressiveAuthorization(
        {
          tenantId,
          userId,
          role: typeof session.role === 'string' ? session.role : '',
        },
        true,
        {
          domain: 'finance',
          permissionKey: 'accounting.read',
          source: 'GET:/api/v1/accounting/general-ledger',
          requestId: request.headers.get('x-request-id'),
          resource: { tenantId },
        },
      );
      if (!access.effectiveAllowed) {
        return NextResponse.json({ error: 'غير مصرح بالصلاحية' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const accounts = await prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const rows = await getGeneralLedgerReport(tenantId, accountId, fromDate, toDate);

    return NextResponse.json({ success: true, accounts, rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
