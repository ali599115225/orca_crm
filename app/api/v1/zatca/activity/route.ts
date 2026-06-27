import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const activity = await prisma.invoice.findMany({
      where: { tenantId: session.tenantId as string, zatcaStatus: { not: 'DRAFT' } },
      select: {
        id: true,
        invoiceNumber: true,
        invoicePrefix: true,
        zatcaUuid: true,
        zatcaStatus: true,
        zatcaError: true,
        zatcaClearedAt: true,
        previousInvoiceHash: true,
        updatedAt: true,
        totalAmount: true,
        lease: { select: { tenantName: true, unitName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, activity });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/zatca/activity failed", error).messageAr }, { status: 500 });
  }
}
