// app/api/payments/paylink/webhook/route.ts
// Paylink server-to-server webhook — receives payment confirmations
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { postJournalEntry, findAccountByCode } from "@/lib/accounting";

const PAYLINK_WEBHOOK_SECRET = process.env.PAYLINK_WEBHOOK_SECRET || "";
const IDEMPOTENCY_WINDOW_MS = 60_000;
const idempotencyCache = new Map<string, number>();

function isDuplicate(paymentReference: string): boolean {
  const now = Date.now();
  for (const [key, ts] of idempotencyCache) {
    if (now - ts > IDEMPOTENCY_WINDOW_MS) idempotencyCache.delete(key);
  }
  if (idempotencyCache.has(paymentReference)) return true;
  idempotencyCache.set(paymentReference, now);
  return false;
}

export async function POST(request: NextRequest) {
  try {
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

    if (!paymentRef) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }
    if (isDuplicate(paymentRef)) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    const paymentStatus = (body.status || "").toLowerCase();
    if (paymentStatus !== "paid") {
      return NextResponse.json({ status: "ignored", reason: body.status }, { status: 200 });
    }

    const existing = await prisma.paymentTransaction.findFirst({
      where: { gatewayRef: paymentRef },
    });
    if (existing) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    let tenantId = body.metadata?.tenant_id || body.metadata?.tenantId || "";
    const plan = body.metadata?.plan || "";
    const amount = Number(body.amount || body.amount_total || 0);
    const amountHalalas = amount > 0 && amount < 10000 ? Math.round(amount * 100) : Math.round(amount);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const paymentTx = await prisma.paymentTransaction.create({
      data: {
        tenantId,
        amount: amountHalalas,
        fee: 0,
        netAmount: amountHalalas,
        currency: "SAR",
        method: "paylink",
        status: "COMPLETED",
        gatewayRef: paymentRef,
        gatewayResponse: JSON.stringify(body),
        paidAt: new Date(),
      },
    });

    if (plan && amountHalalas > 0) {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + 30);

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: plan,
          isActive: true,
          paymentStatus: "PAID",
          billingCycle: "MONTHLY",
          subscriptionExpiresAt: expiresAt,
        },
      });
    }

    if (amountHalalas > 0) {
      try {
        const cashAcct = await findAccountByCode(tenantId, "1.1.1");
        const revenueAcct = await findAccountByCode(tenantId, "4.1.1");
        if (cashAcct && revenueAcct) {
          await postJournalEntry({
            tenantId,
            description: `دفع اشتراك Paylink — ${paymentRef}`,
            source: "PAYLINK",
            sourceId: paymentTx.id,
            lines: [
              { accountId: cashAcct.id, debit: amountHalalas, credit: 0, description: "استلام دفعة اشتراك" },
              { accountId: revenueAcct.id, debit: 0, credit: amountHalalas, description: "إيراد اشتراك" },
            ],
          });
        }
      } catch (err: any) {
        console.error("[Paylink] Accounting entry failed:", err.message);
      }
    }

    await writeAuditLog({
      tenantId,
      userId: "system",
      action: "PAYMENT_RECEIVED",
      tableName: "payment_transactions",
      recordId: paymentTx.id,
      details: `Paylink payment: ${paymentRef}, Amount: ${amountHalalas} halalas, Plan: ${plan || "N/A"}`,
    });

    return NextResponse.json({ status: "processed", id: paymentTx.id });
  } catch (error: any) {
    console.error("[Paylink Webhook] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
