import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { formatInvoiceLabel } from '@/lib/zatca/qr';
import { ErrorCode, publicError } from "@/lib/errors";

async function authenticateRequest() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await authenticateRequest();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId as string },
      include: {
        lease: { select: { unitName: true, tenantName: true } },
        contract: { select: { buyerName: true } },
        tenant: { select: { companyName: true, vatNumber: true, commercialRegistry: true, nationalAddress: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoicePrefix: invoice.invoicePrefix,
        invoiceLabel: formatInvoiceLabel(invoice.invoicePrefix, invoice.issueDate.getFullYear(), invoice.invoiceNumber),
        zatcaUuid: invoice.zatcaUuid,
        issueDate: invoice.issueDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        sellerName: invoice.tenant.companyName,
        sellerVat: invoice.tenant.vatNumber || '',
        sellerCr: invoice.tenant.commercialRegistry || '',
        sellerAddress: invoice.tenant.nationalAddress || '',
        customerName: invoice.lease?.tenantName || invoice.contract?.buyerName || '',
        customerVat: null,
        subtotal: Number(invoice.subtotal),
        vatRate: Number(invoice.vatRate),
        vatAmount: Number(invoice.vatAmount),
        totalAmount: Number(invoice.totalAmount),
        qrPayload: invoice.qrPayload ? JSON.parse(invoice.qrPayload) : null,
        qrCode: invoice.qrCode,
        qrImage: invoice.qrImage,
        zatcaStatus: invoice.zatcaStatus,
        status: invoice.status,
        paidAt: invoice.paidAt?.toISOString() || null,
        paymentMethod: invoice.paymentMethod,
        leaseId: invoice.leaseId,
        contractId: invoice.contractId,
        unitName: invoice.lease?.unitName || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/invoices/[id] failed", error).messageAr }, { status: 500 });
  }
}
