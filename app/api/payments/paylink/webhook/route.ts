// app/api/payments/paylink/webhook/route.ts
// Paylink server-to-server webhook — receives payment confirmations
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { postJournalEntry, findAccountByCode } from "@/lib/accounting";
import { rateLimit } from "@/lib/rate-limit";
import { redactPiiFromPayload } from "@/lib/privacy-mask";

const PAYLINK_WEBHOOK_SECRET = process.env.PAYLINK_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit("paylink:webhook", 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!PAYLINK_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    if (!bearerToken || bearerToken !== PAYLINK_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const paymentRef = body.transaction_id || body.payment_id || body.reference || "";
    const paylinkInvoiceId = body.id || body.invoice_id || "";
    const paymentStatus = (body.status || "").toLowerCase();

    if (!paymentRef) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }

    // ── DB-backed idempotency: check providerTransactionId ──
    const existingTx = await prisma.paymentTransaction.findFirst({
      where: { providerTransactionId: paymentRef },
    });
    if (existingTx && existingTx.status === 'COMPLETED') {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // ── Extract tenant + invoice from metadata or body ──
    const metadata = body.metadata || {};
    let tenantId = metadata.tenant_id || metadata.tenantId || body.tenant_id || "";
    let invoiceId = metadata.invoiceId || metadata.invoice_id || body.invoice_id || "";

    // ── If invoiceId not in metadata, try to find by stored PaymentTransaction ──
    if (!invoiceId && paylinkInvoiceId) {
      const linkedTx = await prisma.paymentTransaction.findFirst({
        where: { providerInvoiceId: paylinkInvoiceId },
        select: { invoiceId: true, tenantId: true },
      });
      if (linkedTx) {
        invoiceId = linkedTx.invoiceId || "";
        if (!tenantId) tenantId = linkedTx.tenantId;
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Cannot determine tenant" }, { status: 400 });
    }

    // ── Verify tenant exists ──
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const amount = Number(body.amount || body.amount_total || 0);
    const amountSar = amount > 0 && amount < 10000 ? Math.round(amount / 100) : Math.round(amount);

    // ── Process payment status ──
    if (paymentStatus === "paid" || paymentStatus === "success" || paymentStatus === "completed") {
      // Only mark invoice paid if we have a valid invoiceId
      if (invoiceId) {
        const invoice = await prisma.rentalInvoice.findFirst({
          where: { id: invoiceId, tenantId },
        });
        if (invoice && invoice.status !== 'paid') {
          await prisma.rentalInvoice.update({
            where: { id: invoiceId },
            data: {
              status: 'paid',
              paidAt: new Date(),
              paymentMethod: 'paylink',
              gatewayStatus: 'completed',
            },
          });
        }
      }

      // Update or create PaymentTransaction
      const paymentTx = existingTx
        ? await prisma.paymentTransaction.update({
            where: { id: existingTx.id },
            data: {
              status: 'COMPLETED',
              gatewayStatus: 'completed',
              gatewayRef: paymentRef,
              paidAt: new Date(),
              webhookReceivedAt: new Date(),
          rawPayload: redactPiiFromPayload(body) as any,
        },
      })
    : await prisma.paymentTransaction.create({
            data: {
              tenantId,
              invoiceId: invoiceId || undefined,
              amount: amountSar,
              fee: 0,
              netAmount: amountSar,
              currency: 'SAR',
              method: 'paylink',
              status: 'COMPLETED',
              provider: 'paylink',
              providerTransactionId: paymentRef,
              providerInvoiceId: paylinkInvoiceId,
              gatewayRef: paymentRef,
              gatewayStatus: 'completed',
              paidAt: new Date(),
              webhookReceivedAt: new Date(),
          rawPayload: redactPiiFromPayload(body) as any,
        },
      });

  // Post accounting entries
      if (amountSar > 0) {
        try {
          const cashAcct = await findAccountByCode(tenantId, "1.1.1");
          const revenueAcct = await findAccountByCode(tenantId, "4.1.1");
          if (cashAcct && revenueAcct) {
            await postJournalEntry({
              tenantId,
              description: `دفع Paylink — ${paymentRef}`,
              source: "PAYLINK",
              sourceId: paymentTx.id,
              lines: [
                { accountId: cashAcct.id, debit: amountSar, credit: 0, description: "استلام دفعة" },
                { accountId: revenueAcct.id, debit: 0, credit: amountSar, description: "إيراد" },
              ],
            });
          }
        } catch (err: any) {
          console.error("[Paylink] Accounting entry failed:", err.message);
        }
      }

      await writeAuditLog({
        tenantId, userId: "system",
        action: "PAYMENT_RECEIVED", tableName: "payment_transactions",
        recordId: paymentTx.id,
        details: `Paylink payment confirmed: ${paymentRef}, Amount: ${amountSar} SAR`,
      });

      return NextResponse.json({ status: "processed", id: paymentTx.id });
    }

    // ── Failed / expired / cancelled ──
    if (existingTx) {
      await prisma.paymentTransaction.update({
        where: { id: existingTx.id },
        data: {
          status: paymentStatus === 'failed' ? 'FAILED' : paymentStatus === 'expired' ? 'EXPIRED' : 'CANCELLED',
          gatewayStatus: paymentStatus,
      rawPayload: redactPiiFromPayload(body) as any,
      webhookReceivedAt: new Date(),
          failureReason: body.failure_reason || body.error || null,
        },
      });

      if (invoiceId) {
        await prisma.rentalInvoice.update({
          where: { id: invoiceId },
          data: { gatewayStatus: paymentStatus },
        });
      }
    }

    // ── Log failed/expired/cancelled via direct prisma call ──
    try {
      await prisma.auditLog.create({
        data: {
          tenantId, userId: "system",
          action: "BILLING_RUN", tableName: "payment_transactions",
          recordId: existingTx?.id || '',
          details: `Paylink payment ${paymentStatus}: ${paymentRef}`,
        },
      });
    } catch (auditErr) { console.error('[audit] Paylink fail log:', auditErr); }

    return NextResponse.json({ status: "recorded", paymentStatus });
  } catch (error: any) {
    console.error("[Paylink Webhook] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
