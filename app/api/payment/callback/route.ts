// app/api/payment/callback/route.ts
// Provider-neutral payment callback — verifies payment via adapter, processes atomically.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getPaymentProvider, isProviderEnabled } from "@/lib/payments/registry";
import { claimPaymentTransaction, markPaymentCompleted, markPaymentFailed } from "@/lib/payments/service";
import { handleSuccessfulPaymentInternal } from "@/lib/server/internal";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerRef = searchParams.get("ref") || searchParams.get("id") || "";
  const status = searchParams.get("status");

  const fallbackUrl = new URL("/operations", request.url);
  fallbackUrl.searchParams.set("tab", "settings");

  if (status && status !== "paid" && status !== "success") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    // ── 1. Find internal payment transaction by provider reference ──
    const tx = await prisma.paymentTransaction.findFirst({
      where: { providerReference: providerRef },
      orderBy: { createdAt: 'desc' },
    });

    if (!tx) {
      // Try fallback: gatewayRef
      const byGateway = await prisma.paymentTransaction.findFirst({
        where: { gatewayRef: providerRef },
        orderBy: { createdAt: 'desc' },
      });
      if (!byGateway) {
        fallbackUrl.searchParams.set("error", "لم يتم العثور على سجل الدفع.");
        return NextResponse.redirect(fallbackUrl);
      }
      return processPayment(byGateway, request, fallbackUrl);
    }

    return processPayment(tx, request, fallbackUrl);

  } catch (error: any) {
    console.error("[Payment Callback] Error:", error.message);
    fallbackUrl.searchParams.set("error", "حدث خطأ أثناء معالجة الدفع.");
    return NextResponse.redirect(fallbackUrl);
  }
}

async function processPayment(
  tx: any,
  request: NextRequest,
  fallbackUrl: URL,
): Promise<NextResponse> {
  const provider = tx.provider?.toUpperCase() || 'MOYASAR';

  // ── 2. Check provider is enabled ──
  if (!isProviderEnabled(provider)) {
    fallbackUrl.searchParams.set("error", "مزود الدفع غير مفعل.");
    return NextResponse.redirect(fallbackUrl);
  }

  // ── 3. Get provider adapter ──
  const adapter = getPaymentProvider(provider);
  if (!adapter) {
    fallbackUrl.searchParams.set("error", "مزود الدفع غير مدعوم.");
    return NextResponse.redirect(fallbackUrl);
  }

  // ── 4. Verify payment with provider ──
  let verification;
  try {
    verification = await adapter.verifyPayment(tx.providerReference || tx.gatewayRef || '');
  } catch (err: any) {
    console.error(`[Payment Callback] ${provider} verification failed:`, err.message);
    fallbackUrl.searchParams.set("error", "تعذر التحقق من الفاتورة.");
    return NextResponse.redirect(fallbackUrl);
  }

  if (!verification.paid) {
    fallbackUrl.searchParams.set("error", "الفاتورة لم يتم دفعها بعد.");
    return NextResponse.redirect(fallbackUrl);
  }

  // ── 5. Validate amount and currency ──
  const expectedAmount = tx.amount?.toNumber ? tx.amount.toNumber() : Number(tx.amount);
  if (verification.amountMinorUnits > 0 && Math.abs(verification.amountMinorUnits / 100 - expectedAmount) > 1) {
    fallbackUrl.searchParams.set("error", "مبلغ الفاتورة غير مطابق.");
    return NextResponse.redirect(fallbackUrl);
  }

  const expectedCurrency = (tx.currency || 'SAR').toUpperCase();
  if (verification.currency.toUpperCase() !== expectedCurrency) {
    fallbackUrl.searchParams.set("error", "عملة الفاتورة غير مدعومة.");
    return NextResponse.redirect(fallbackUrl);
  }

  // ── 6. Atomic claim ──
  const claimed = await claimPaymentTransaction(provider, tx.providerReference || tx.gatewayRef || '');
  if (!claimed) {
    fallbackUrl.searchParams.set("error", "لم يتم العثور على سجل الدفع.");
    return NextResponse.redirect(fallbackUrl);
  }

  if (claimed.status === 'COMPLETED') {
    const successUrl = new URL("/operations", request.url);
    successUrl.searchParams.set("tab", "settings");
    successUrl.searchParams.set("success", "تم تفعيل الاشتراك مسبقًا.");
    return NextResponse.redirect(successUrl);
  }

  if (claimed.status === 'PROCESSING' && claimed.id !== tx.id) {
    // Another callback is processing this transaction
    fallbackUrl.searchParams.set("error", "يتم معالجة الدفع حالياً.");
    return NextResponse.redirect(fallbackUrl);
  }

  // ── 7. Process internally ──
  const planCode = tx.planCode || 'basic';
  const tenantId = tx.tenantId;

  try {
    if (planCode === 'addon') {
      const metadata = (tx.rawPayload as any) || {};
      const agentCount = parseInt(metadata?.agentCount || '0', 10);
      if (agentCount > 0 && agentCount <= 100) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { extraAgents: { increment: agentCount } },
        });
      }
    } else {
      await handleSuccessfulPaymentInternal(tenantId, planCode, 'MONTHLY');
    }

    await markPaymentCompleted(claimed.id);

    await writeAuditLog({
      tenantId,
      userId: 'system',
      action: 'SUBSCRIPTION_CHANGED',
      tableName: 'tenants',
      recordId: tenantId,
      details: `Plan activated: ${planCode} via ${provider} (${tx.providerReference})`,
    });

    const successUrl = new URL("/operations", request.url);
    successUrl.searchParams.set("tab", "settings");
    successUrl.searchParams.set("success", "تم ترقية الخطة بنجاح!");
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    await markPaymentFailed(claimed.id, error.message.slice(0, 2000));
    fallbackUrl.searchParams.set("error", "حدث خطأ أثناء تفعيل الاشتراك.");
    return NextResponse.redirect(fallbackUrl);
  }
}
