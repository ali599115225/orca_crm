import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { calculateVat, validateVatInput } from "@/lib/vat/engine";
import { buildQrPayload, encodeQrCode, generateQrImage, formatInvoiceLabel } from "@/lib/zatca/qr";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get("leaseId") || "";
    const status = searchParams.get("status") || "";

    const where: any = { tenantId: session.tenantId as string };
    if (leaseId) where.leaseId = leaseId;
    if (status) where.status = status;

    const invoices = await prisma.rentalInvoice.findMany({
      where,
      include: { lease: { select: { unitName: true, tenantName: true } } },
      orderBy: { invoiceNumber: "desc" },
    });

    const list = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoicePrefix: inv.invoicePrefix,
      invoiceLabel: formatInvoiceLabel(inv.invoicePrefix, inv.issueDate.getFullYear(), inv.invoiceNumber),
      zatcaUuid: inv.zatcaUuid,
      customerName: inv.lease.tenantName,
      unitName: inv.lease.unitName,
      subtotal: Number(inv.subtotal),
      vatRate: Number(inv.vatRate),
      vatAmount: Number(inv.vatAmount),
      totalAmount: Number(inv.totalAmount),
      status: inv.status,
      issueDate: inv.issueDate.toISOString().split("T")[0],
      dueDate: inv.dueDate.toISOString().split("T")[0],
      qrCode: inv.qrCode,
      qrImage: inv.qrImage,
    }));

    return NextResponse.json({ success: true, invoices: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leaseId, subtotal, vatType, dueDate } = body;

    if (!leaseId || !subtotal || !dueDate) {
      return NextResponse.json({ success: false, error: "الحقول leaseId, subtotal, dueDate إلزامية" }, { status: 400 });
    }

    const validationError = validateVatInput(parseFloat(subtotal), vatType || 'STANDARD');
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const lease = await prisma.rentalLease.findFirst({
      where: { id: leaseId, tenantId: session.tenantId as string },
      include: { tenant: true },
    });
    if (!lease) {
      return NextResponse.json({ success: false, error: "عقد الإيجار غير موجود" }, { status: 404 });
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

      const invoice = await tx.rentalInvoice.create({
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
          status: "unpaid",
        },
        include: { lease: { select: { unitName: true, tenantName: true } } },
      });

      return { invoice, tenant };
    });

    // ── Audit log for invoice creation ──
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId as string,
          userId: (session as any).userId || null,
          action: 'CREATE_INVOICE',
          tableName: 'rental_invoices',
          recordId: result.invoice.id,
          details: `Created invoice #${result.invoice.invoiceNumber} for lease ${leaseId}, total: ${vatBreakdown.totalAmount} SAR`,
        },
      });
    } catch (auditErr) {
      console.error('[audit] Failed to log invoice creation:', auditErr);
    }

    const inv = result.invoice;
    return NextResponse.json({
      success: true,
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoicePrefix: inv.invoicePrefix,
        invoiceLabel: formatInvoiceLabel(inv.invoicePrefix, inv.issueDate.getFullYear(), inv.invoiceNumber),
        zatcaUuid: inv.zatcaUuid,
        issueDate: inv.issueDate.toISOString().split("T")[0],
        dueDate: inv.dueDate.toISOString().split("T")[0],
        sellerName: result.tenant.companyName,
        sellerVat: result.tenant.vatNumber || '',
        sellerCr: result.tenant.commercialRegistry || '',
        sellerAddress: result.tenant.nationalAddress || '',
        customerName: inv.lease.tenantName,
        subtotal: Number(inv.subtotal),
        vatRate: Number(inv.vatRate),
        vatAmount: Number(inv.vatAmount),
        totalAmount: Number(inv.totalAmount),
        qrPayload: JSON.parse(inv.qrPayload || '{}'),
        qrCode: inv.qrCode,
        qrImage: inv.qrImage,
        zatcaStatus: inv.zatcaStatus,
        status: inv.status,
        leaseId: inv.leaseId,
        unitName: inv.lease.unitName,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("[POST /api/v1/invoices]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
