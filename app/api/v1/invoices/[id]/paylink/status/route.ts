import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { ErrorCode } from "@/lib/errors";

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
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = session.tenantId as string;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      select: {
        status: true,
        gatewayProvider: true,
        gatewayStatus: true,
        paymentUrl: true,
        paymentMethod: true,
        paidAt: true,
      },
    });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoiceStatus: invoice.status,
      gatewayProvider: invoice.gatewayProvider,
      gatewayStatus: invoice.gatewayStatus,
      paymentUrl: invoice.paymentUrl,
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt?.toISOString() || null,
    });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/invoices/[id]/paylink/status failed", error, 500);
  }
}
