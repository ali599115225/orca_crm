import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { getAgingReport, getAgingDetail } from '@/lib/accounting';

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
    const detail = searchParams.get('detail') === 'true';

    if (detail) {
      const rows = await getAgingDetail(tenantId);
      return NextResponse.json({ success: true, rows });
    }

    const report = await getAgingReport(tenantId);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
