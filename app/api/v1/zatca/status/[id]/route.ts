import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId as string },
      select: {
        id: true,
        invoiceNumber: true,
        invoicePrefix: true,
        zatcaUuid: true,
        zatcaStatus: true,
        zatcaXml: true,
        zatcaResponse: true,
        zatcaError: true,
        zatcaClearedAt: true,
        previousInvoiceHash: true,
        invoiceTypeCode: true,
        status: true,
        createdAt: true,
      },
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/zatca/status/[id] failed", error).messageAr }, { status: 500 });
  }
}
