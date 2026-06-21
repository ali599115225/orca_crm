import { NextRequest, NextResponse } from 'next/server';
import { seedChartOfAccounts } from '@/lib/accounting';
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from '@/lib/api-auth-guard';
import {
  classifyError,
  publicError,
  statusForErrorCode,
} from '@/lib/errors';

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  if (!(await hasDatabaseRole(session, ['ADMIN']))) {
    return forbiddenResponse();
  }

  try {
    await seedChartOfAccounts(session.tenantId);

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء دليل الحسابات',
    });
  } catch (error: unknown) {
    const code = classifyError(error);
    return NextResponse.json(
      publicError(code, 'accounting seed failed', error),
      { status: statusForErrorCode(code) }
    );
  }
}
