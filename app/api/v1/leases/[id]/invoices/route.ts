import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { calculateVat } from '@/lib/vat/engine';
import { buildQrPayload, encodeQrCode, generateQrImage, formatInvoiceLabel } from '@/lib/zatca/qr';
import { ErrorCode } from "@/lib/errors";

async function authenticateRequest() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leaseId } = await params;
  const session = await authenticateRequest();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subtotal, vatType, dueDate } = body;

    if (!subtotal || !dueDate) {
      return NextResponse.json({ success: false, error: 'subtotal and dueDate are required' }, { status: 400 });
    }

    const lease = await prisma.rentalLease.findFirst({
      where: { id: leaseId, tenantId: session.tenantId as string },
      include: { tenant: true },
    });
    if (!lease) {
      return NextResponse.json({ success: false, error: 'Lease not found' }, { status: 404 });
    }

    const tenant = lease.tenant;
    const subtotalNum = parseFloat(subtotal);
    const vatBreakdown = calculateVat(subtotalNum, (vatType || 'STANDARD') as any);

    const qrPayload = buildQrPayload({
      sellerName: tenant.companyName,
      vatNumber: tenant.vatNumber || '',
      total: vatBreakdown.totalAmount,
      vatTotal: vatBreakdown.vatAmount,
    });
    const qrCode = encodeQrCode(qrPayload);
    const qrImage = await generateQrImage(qrCode);

    const result = await prisma.$transaction(async (tx) => {
      const counter = await tx.tenant.update({
        where: { id: tenant.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const invoiceNumber = counter.nextInvoiceNumber - 1;

      const invoice = await tx.invoice.create({
        data: {
          tenantId: session.tenantId as string,
          leaseId,
          invoiceNumber,
          invoicePrefix: tenant.invoicePrefix || 'INV',
          dueDate: new Date(dueDate),
          subtotal: vatBreakdown.subtotal,
          vatRate: vatBreakdown.vatRate,
          vatAmount: vatBreakdown.vatAmount,
          totalAmount: vatBreakdown.totalAmount,
          qrPayload: JSON.stringify(qrPayload),
          qrCode,
          qrImage,
          status: 'unpaid',
        },
        include: { lease: { select: { unitName: true, tenantName: true } } },
      });
      return { invoice, tenant };
    });

    const inv = result.invoice;
    return NextResponse.json({
      success: true,
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoicePrefix: inv.invoicePrefix,
        invoiceLabel: formatInvoiceLabel(inv.invoicePrefix, inv.issueDate.getFullYear(), inv.invoiceNumber),
        zatcaUuid: inv.zatcaUuid,
        issueDate: inv.issueDate.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        sellerName: result.tenant.companyName,
        sellerVat: result.tenant.vatNumber || '',
        subtotal: Number(inv.subtotal),
        vatRate: Number(inv.vatRate),
        vatAmount: Number(inv.vatAmount),
        totalAmount: Number(inv.totalAmount),
        qrCode: inv.qrCode,
        qrImage: inv.qrImage,
        zatcaStatus: inv.zatcaStatus,
        status: inv.status,
        leaseId: inv.leaseId,
        unitName: inv.lease?.unitName || null,
      },
    }, { status: 201 });

  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/leases/[id]/invoices failed", error, 500);
  }
}
