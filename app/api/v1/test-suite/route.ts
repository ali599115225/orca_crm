import { NextRequest, NextResponse } from 'next/server';
import { runLeadsTestSuite } from '@/scripts/test-leads';
import {
  isProductionRuntime,
  requireAuth,
  requireSuperAdminInDev,
} from '@/lib/api-auth-guard';
import { ErrorCode, publicError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  if (isProductionRuntime()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const guardResponse = await requireSuperAdminInDev(request);
  if (guardResponse) return guardResponse;

  const session = await requireAuth(request);
  if (!session) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const testResults = await runLeadsTestSuite(
      session.tenantId,
      session.userId
    );
    const hasFailures = testResults.some((result) => !result.success);

    return NextResponse.json({
      success: !hasFailures,
      summary: hasFailures
        ? 'باقة الاختبارات تحتوي على إخفاقات'
        : 'جميع الاختبارات نجحت بنسبة ١٠٠٪',
      results: testResults,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(ErrorCode.INTERNAL_ERROR, 'test suite failed', error),
      { status: 500 }
    );
  }
}
