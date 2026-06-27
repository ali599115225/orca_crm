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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await authenticateRequest();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get('download') === '1';

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId as string },
      include: {
        lease: { select: { unitName: true, tenantName: true } },
        contract: { select: { buyerName: true, buyerPhone: true } },
        tenant: { select: { companyName: true, vatNumber: true, commercialRegistry: true, nationalAddress: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const label = formatInvoiceLabel(invoice.invoicePrefix, invoice.issueDate.getFullYear(), invoice.invoiceNumber);
    const qrImg = invoice.qrImage || '';
    const now = new Date().toISOString();

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>${label}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
  .invoice { max-width: 800px; margin: auto; background: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 8px; }
  h1 { font-size: 24px; color: #1a365d; margin: 0 0 5px; }
  .meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px 0; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
  .seller, .customer { width: 45%; }
  .seller h3, .customer h3 { font-size: 12px; color: #718096; margin: 0 0 5px; text-transform: uppercase; }
  .seller p, .customer p { font-size: 14px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f7fafc; padding: 10px; font-size: 12px; color: #718096; text-align: right; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .totals { margin: 20px 0; text-align: left; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .totals .grand-total { font-size: 18px; font-weight: bold; color: #1a365d; border-top: 2px solid #1a365d; padding-top: 10px; margin-top: 10px; }
  .qr-section { display: flex; justify-content: center; margin: 30px 0; }
  .qr-section img { width: 150px; height: 150px; }
  .footer { text-align: center; font-size: 11px; color: #a0aec0; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
  .info-bar { display: flex; justify-content: space-between; background: #f7fafc; padding: 10px 15px; border-radius: 6px; margin: 15px 0; font-size: 12px; color: #4a5568; }
  @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="invoice">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1>${label}</h1>
        <p style="color: #718096; font-size: 14px;">فاتورة ضريبية / Tax Invoice</p>
      </div>
      <div style="text-align: left;">
        <p style="font-size: 12px; color: #718096;">${invoice.tenant.companyName}</p>
      </div>
    </div>

    <div class="info-bar">
      <span>UUID: ${invoice.zatcaUuid}</span>
      <span>الحالة: ${invoice.status === 'unpaid' ? 'غير مدفوعة / Unpaid' : 'مدفوعة / Paid'}</span>
    </div>

    <div class="meta">
      <div class="seller">
        <h3>البائع / Seller</h3>
        <p><strong>${invoice.tenant.companyName}</strong></p>
        <p>الرقم الضريبي: ${invoice.tenant.vatNumber || '-'}</p>
        <p>السجل التجاري: ${invoice.tenant.commercialRegistry || '-'}</p>
        <p>${invoice.tenant.nationalAddress || ''}</p>
      </div>
      <div class="customer">
        <h3>المشتري / Customer</h3>
        <p><strong>${invoice.lease?.tenantName || invoice.contract?.buyerName || 'عميل'}</strong></p>
        <p>الوحدة: ${invoice.lease?.unitName || '-'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>البيان / Description</th>
          <th style="text-align: left;">المبلغ / Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.lease ? `إيجار الوحدة ${invoice.lease.unitName}` : `فاتورة عقد ${invoice.contractId?.slice(0, 8) || ''}`}</td>
          <td style="text-align: left;">${Number(invoice.subtotal).toLocaleString('en-US', {minimumFractionDigits:2})} SAR</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><span>المجموع قبل الضريبة / Subtotal</span><span>${Number(invoice.subtotal).toLocaleString('en-US', {minimumFractionDigits:2})} SAR</span></div>
      <div><span>نسبة الضريبة / VAT Rate</span><span>${invoice.vatRate}%</span></div>
      <div><span>قيمة الضريبة / VAT Amount</span><span>${Number(invoice.vatAmount).toLocaleString('en-US', {minimumFractionDigits:2})} SAR</span></div>
      <div class="grand-total"><span>الإجمالي شامل الضريبة / Total</span><span>${Number(invoice.totalAmount).toLocaleString('en-US', {minimumFractionDigits:2})} SAR</span></div>
    </div>

    ${qrImg ? `<div class="qr-section"><img src="${qrImg}" alt="QR Code" /></div>` : ''}

    <div style="font-size: 11px; color: #718096; text-align: center;">
      <p>تاريخ الإصدار: ${invoice.issueDate.toISOString().split('T')[0]} | تاريخ الاستحقاق: ${invoice.dueDate.toISOString().split('T')[0]}</p>
      <p>رقم الفاتورة: ${label} | UUID: ${invoice.zatcaUuid}</p>
    </div>

    <div class="footer">
<p>تم إنشاؤها بواسطة ORCA | هذه فاتورة ضريبية إلكترونية</p>
<p>Generated by ORCA | This is an electronic tax invoice</p>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 20px;">
      <button onclick="window.print()" style="padding: 10px 30px; background: #1a365d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">طباعة / Print</button>
    </div>
  </div>
  ${isDownload ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</body>
</html>`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
    };
    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="invoice-${label}.html"`;
    }
    return new NextResponse(html, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/invoices/[id]/pdf failed", error).messageAr }, { status: 500 });
  }
}
