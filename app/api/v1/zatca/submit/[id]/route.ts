import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { generateUnsignedInvoiceXml } from '@/lib/zatca/xml/xml-generator';
import { computeInvoiceHash, computePreviousInvoiceHash } from '@/lib/zatca/pih';
import { validateXmlStructure } from '@/lib/zatca/xml/xml-validator';
import { validatePreSubmission } from '@/lib/zatca/validate';
import { submitReporting, submitClearance, ZatcaSubmissionResponse } from '@/lib/zatca/api';
import { signXmlSimple } from '@/lib/zatca/sign';
import { formatInvoiceLabel } from '@/lib/zatca/xml/xml-generator';
import { VatType } from '@/lib/vat/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId as string },
      include: { lease: true, contract: true, tenant: true },
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const tenant = invoice.tenant;
    const vatType: VatType = 'STANDARD';
    const taxCat = 'S';
    const customerLabel = invoice.lease?.tenantName || invoice.contract?.buyerName || 'عميل';
    const unitLabel = invoice.lease?.unitName || 'وحدة';

    const lineItems = [{
      id: 1,
      description: `${invoice.type === 'RENTAL' ? 'Rent' : 'Sale'} - ${unitLabel} (${customerLabel})`,
      quantity: 1,
      unitCode: 'DAY',
      unitPrice: Number(invoice.subtotal),
      netAmount: Number(invoice.subtotal),
      taxCategory: taxCat as any,
      taxPercent: Number(invoice.vatRate),
      taxAmount: Number(invoice.vatAmount),
    }];

    const issueDate = invoice.issueDate.toISOString().split('T')[0];
    const issueTime = invoice.issueDate.toISOString().split('T')[1]?.split('.')[0] || '00:00:00';
    const invoiceTypeCode = invoice.invoiceTypeCode || '388';
    const profileId = invoiceTypeCode === '381' ? 'clearance:1.0' : 'reporting:1.0';

    const previousInvoice = await prisma.invoice.findFirst({
      where: { tenantId: session.tenantId as string, createdAt: { lt: invoice.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { zatcaXml: true, zatcaSignedXml: true },
    });
    const pih = computePreviousInvoiceHash(previousInvoice?.zatcaSignedXml || previousInvoice?.zatcaXml);

    const invoiceData = {
      uuid: invoice.zatcaUuid,
      invoiceNumber: invoice.invoiceNumber,
      invoicePrefix: invoice.invoicePrefix,
      issueDate,
      issueTime,
      invoiceTypeCode,
      profileId,
      currency: 'SAR',
      seller: {
        name: tenant.companyName,
        vatNumber: tenant.vatNumber || '',
        commercialRegistration: tenant.commercialRegistry || '',
        address: tenant.nationalAddress ? parseAddress(tenant.nationalAddress) : undefined,
      },
      buyer: {
        name: customerLabel,
        vatNumber: '',
      },
      lineItems,
      subtotal: Number(invoice.subtotal),
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      previousInvoiceHash: pih,
      sellerVatNumber: tenant.vatNumber || '',
    };

    const validationErrors = validatePreSubmission({
      invoiceNumber: invoice.invoiceNumber,
      zatcaUuid: invoice.zatcaUuid,
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      issueDate: invoice.issueDate,
      lineItems,
    }, tenant.vatNumber);

    if (validationErrors.length > 0) {
      return NextResponse.json({ success: false, error: 'Pre-submission validation failed', errors: validationErrors }, { status: 400 });
    }

    const unsignedXml = generateUnsignedInvoiceXml(invoiceData);

    const xmlErrors = validateXmlStructure(unsignedXml);
    if (xmlErrors.length > 0) {
      return NextResponse.json({ success: false, error: 'XML validation failed', errors: xmlErrors }, { status: 500 });
    }

    const invoiceHash = computeInvoiceHash(unsignedXml);

    const device = await prisma.zatcaDevice.findFirst({
      where: { tenantId: session.tenantId as string, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    let signedXml = unsignedXml;
    if (device?.privateKey) {
      try {
        signedXml = signXmlSimple(unsignedXml, device.privateKey);
      } catch (signErr: any) {
        console.warn('[zatca] ECDSA signing failed, using unsigned XML:', signErr.message);
      }
    }

    let submissionResult: ZatcaSubmissionResponse;
    if (invoiceTypeCode === '381') {
      submissionResult = await submitClearance(signedXml, device);
    } else {
      submissionResult = await submitReporting(signedXml, device);
    }

    const newStatus = submissionResult.success
      ? (invoiceTypeCode === '381' ? 'CLEARED' : 'REPORTED')
      : 'REJECTED';

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        zatcaXml: unsignedXml,
        zatcaSignedXml: signedXml,
        zatcaStatus: newStatus,
        previousInvoiceHash: pih,
        zatcaResponse: JSON.stringify(submissionResult.rawResponse || {}),
        zatcaError: submissionResult.errors?.join('; ') || null,
        zatcaClearedAt: newStatus === 'CLEARED' ? new Date() : null,
      },
    });

    if (!submissionResult.success) {
      await prisma.zatcaQueue.create({
        data: {
          tenantId: session.tenantId as string,
          invoiceId: invoice.id,
          action: invoiceTypeCode === '381' ? 'CLEAR' : 'REPORT',
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 5,
          lastError: submissionResult.errors?.join('; ') || 'Unknown error',
          payload: unsignedXml,
          response: JSON.stringify(submissionResult.rawResponse || {}),
        },
      });
    }

    return NextResponse.json({
      success: submissionResult.success,
      zatcaStatus: newStatus,
      invoiceHash,
      previousInvoiceHash: pih,
      invoiceLabel: formatInvoiceLabel(invoice.invoicePrefix, issueDate, invoice.invoiceNumber),
      errors: submissionResult.errors,
      warnings: submissionResult.warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function parseAddress(address: string): { street?: string; district?: string; city?: string; province?: string } {
  const parts = address.split('–').map((s: string) => s.trim());
  if (parts.length >= 1) return { street: parts[0], district: parts[1], city: parts[2], province: parts[3] };
  return { street: address };
}
