import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hasDatabaseRole, isProductionRuntime } from '@/lib/api-auth-guard';
import { generateUnsignedInvoiceXml } from '@/lib/zatca/xml/xml-generator';
import { computeInvoiceHash, computePreviousInvoiceHash } from '@/lib/zatca/pih';
import { validateXmlStructure } from '@/lib/zatca/xml/xml-validator';
import { validatePreSubmission } from '@/lib/zatca/validate';
import { submitReporting, submitClearance, type ZatcaSubmissionResponse } from '@/lib/zatca/api';
import { signXmlSimple } from '@/lib/zatca/sign';
import { formatInvoiceLabel } from '@/lib/zatca/xml/xml-generator';
import { VatType } from '@/lib/vat/types';
import { writeAuditLog } from '@/lib/audit';
import {
  evaluateZatcaGate,
  reserveZatcaSlot,
  markProcessing,
  markDelivered,
  markRetrying,
  isSandboxRuntime,
} from '@/lib/zatca/gate-adapter';
import { ErrorCode } from "@/lib/errors";

// ─── ZATCA Invoice Submit Route (Hardened) ────────────────────────────────────
//
// Authorization → Tenant FK validation → Saudi Trust Gate →
//   Idempotency → XML build → Sign (FAIL-CLOSED) →
//   Provider call → TX_2 Persistence → Audit/Outbox
//
// RULES:
//   - Unsigned XML is NEVER submitted (signing failure = hard block)
//   - Sandbox result NEVER changes invoice.zatcaStatus to REPORTED/CLEARED
//   - Duplicate submission blocked via government_outbox idempotency key
//   - Invoice legal state only changes AFTER provider confirmation

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth: DB-backed (not claim-only) ──────────────────────────────────────
  const session = await requireAuth(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasRole = await hasDatabaseRole(session, ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE']);
  if (!hasRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: invoiceId } = await params;
  const tenantId = session.tenantId;
  const userId = session.userId;

  try {
    // ── FK: Invoice belongs to this tenant ────────────────────────────────────
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lease: true, contract: true, tenant: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // ── Sandbox production block ───────────────────────────────────────────────
    if (isProductionRuntime() && isSandboxRuntime()) {
      await writeAuditLog({
        tenantId, userId,
        action: 'SAUDI_TRUST_GATE_BLOCKED',
        tableName: 'invoices',
        recordId: invoiceId,
        details: JSON.stringify({ reason: 'SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS', operation: 'ZATCA_SUBMIT_INVOICE' }),
      });
      return NextResponse.json({ success: false, error: 'Sandbox mode is not permitted in production.' }, { status: 403 });
    }

    // ── Saudi Trust Gate ──────────────────────────────────────────────────────
    const gate = await evaluateZatcaGate({
      tenantId, userId,
      operation: 'ZATCA_SUBMIT_INVOICE',
      entityId: invoiceId,
    });
    if (!gate.allowed) {
      return NextResponse.json(gate.errorResponse, { status: 403 });
    }

    const tenant = invoice.tenant;
    const vatType: VatType = 'STANDARD';
    const taxCat = 'S';
    const customerLabel = invoice.lease?.tenantName || invoice.contract?.buyerName || 'عميل';
    const unitLabel = invoice.lease?.unitName || 'وحدة';
    const invoiceTypeCode = invoice.invoiceTypeCode || '388';

    // ── Build XML (before idempotency reserve) ────────────────────────────────
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
    const profileId = invoiceTypeCode === '381' ? 'clearance:1.0' : 'reporting:1.0';

    const previousInvoice = await prisma.invoice.findFirst({
      where: { tenantId, createdAt: { lt: invoice.createdAt } },
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
      buyer: { name: customerLabel, vatNumber: '' },
      lineItems,
      subtotal: Number(invoice.subtotal),
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      previousInvoiceHash: pih,
      sellerVatNumber: tenant.vatNumber || '',
    };

    // ── Pre-submission validation ──────────────────────────────────────────────
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
      return NextResponse.json({ success: false, error: 'XML validation failed', errors: xmlErrors }, { status: 422 });
    }

    // ── Sign XML — FAIL-CLOSED ────────────────────────────────────────────────
    // Unsigned XML must never be submitted to the provider.
    const device = await prisma.zatcaDevice.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!device?.privateKey) {
      await writeAuditLog({
        tenantId, userId,
        action: 'SAUDI_TRUST_GATE_BLOCKED',
        tableName: 'invoices',
        recordId: invoiceId,
        details: JSON.stringify({ reason: 'NO_ACTIVE_DEVICE', step: 'signing' }),
      });
      return NextResponse.json({ success: false, error: 'لا يوجد جهاز ZATCA نشط — لا يمكن توقيع الفاتورة.' }, { status: 422 });
    }

    let signedXml: string;
    try {
      signedXml = signXmlSimple(unsignedXml, device.privateKey);
    } catch (signErr: any) {
      // Signing failure is a hard block — NEVER submit unsigned XML
      await writeAuditLog({
        tenantId, userId,
        action: 'SAUDI_TRUST_GATE_BLOCKED',
        tableName: 'invoices',
        recordId: invoiceId,
        details: JSON.stringify({ reason: 'SIGNING_FAILED', error: signErr.message }),
      });
      return NextResponse.json({ success: false, error: `فشل توقيع الفاتورة: ${signErr.message}` }, { status: 422 });
    }

    // ── Idempotency: reserve outbox slot ──────────────────────────────────────
    const payloadSummary = JSON.stringify({ invoiceId, invoiceTypeCode, tenantId });
    const idem = await reserveZatcaSlot({
      tenantId,
      operation: 'ZATCA_SUBMIT_INVOICE',
      businessEntityType: 'invoice',
      businessEntityId: invoiceId,
      payload: payloadSummary,
    });

    if (idem.action === 'RETURN_CACHED') {
      // Already DELIVERED — return cached result (idempotent HTTP 200)
      const cached = JSON.parse(idem.cachedResponse!);
      await writeAuditLog({
        tenantId, userId,
        action: 'EJAR_CONTRACT_IDEMPOTENT_RETURN',  // reuse typed action for outbox
        tableName: 'government_outbox',
        recordId: idem.outboxId,
        details: JSON.stringify({ operation: 'ZATCA_SUBMIT_INVOICE', cached }),
      });
      return NextResponse.json({ ...cached, idempotent: true });
    }

    if (idem.action === 'IN_PROGRESS' || idem.action === 'FAILED_FINAL') {
      return NextResponse.json(idem.errorResponse, { status: idem.action === 'FAILED_FINAL' ? 422 : 202 });
    }

    const outboxId = idem.outboxId;
    await markProcessing(outboxId);

    await writeAuditLog({
      tenantId, userId,
      action: 'GOVERNMENT_OUTBOX_ENQUEUED',
      tableName: 'government_outbox',
      recordId: outboxId,
      details: JSON.stringify({ operation: 'ZATCA_SUBMIT_INVOICE', invoiceId }),
    });

    // ── Provider call (outside any DB transaction) ────────────────────────────
    let submissionResult: ZatcaSubmissionResponse;
    try {
      if (invoiceTypeCode === '381') {
        submissionResult = await submitClearance(signedXml, device);
      } else {
        submissionResult = await submitReporting(signedXml, device);
      }
    } catch (apiErr: any) {
      await markRetrying(outboxId, apiErr.message, 0);
      await writeAuditLog({
        tenantId, userId,
        action: 'GOVERNMENT_OUTBOX_RETRYING',
        tableName: 'government_outbox',
        recordId: outboxId,
        details: JSON.stringify({ error: apiErr.message }),
      });
      return NextResponse.json({ success: false, error: `فشل الاتصال بـ ZATCA: ${apiErr.message}` }, { status: 502 });
    }

    // ── TX_2: Persist ONLY after confirmed provider response ──────────────────
    const newStatus = submissionResult.success
      ? (invoiceTypeCode === '381' ? 'CLEARED' : 'REPORTED')
      : 'REJECTED';

    const invoiceHash = computeInvoiceHash(unsignedXml);
    const providerPayload = {
      success: submissionResult.success,
      zatcaStatus: newStatus,
      invoiceHash,
      previousInvoiceHash: pih,
      invoiceLabel: formatInvoiceLabel(invoice.invoicePrefix, issueDate, invoice.invoiceNumber),
      errors: submissionResult.errors,
      warnings: submissionResult.warnings,
    };

    // Only update legal state after provider confirms
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

    await markDelivered(outboxId, JSON.stringify(providerPayload));

    // ZatcaQueue retry entry only on provider failure
    if (!submissionResult.success) {
      await prisma.zatcaQueue.create({
        data: {
          tenantId,
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

    await writeAuditLog({
      tenantId, userId,
      action: 'ZATCA_SUBMIT',
      tableName: 'invoices',
      recordId: invoiceId,
      details: JSON.stringify({ newStatus, invoiceHash, outboxId }),
    });
    await writeAuditLog({
      tenantId, userId,
      action: 'GOVERNMENT_OUTBOX_DELIVERED',
      tableName: 'government_outbox',
      recordId: outboxId,
      details: JSON.stringify({ operation: 'ZATCA_SUBMIT_INVOICE' }),
    });

    return NextResponse.json(providerPayload);

  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/zatca/submit/[id] failed", error, 500);
  }
}

function parseAddress(address: string): { street?: string; district?: string; city?: string; province?: string } {
  const parts = address.split('–').map((s: string) => s.trim());
  if (parts.length >= 1) return { street: parts[0], district: parts[1], city: parts[2], province: parts[3] };
  return { street: address };
}
