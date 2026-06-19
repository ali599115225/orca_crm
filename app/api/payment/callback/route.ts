// app/api/payment/callback/route.ts
// Payment callback handler — verifies Moyasar invoice, validates amount/currency/tenant,
// prevents duplicate processing, and activates subscription via internal agent.
import { NextRequest, NextResponse } from "next/server";
import { handleSuccessfulPaymentInternal } from "@/lib/server/internal";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "";

const PLAN_PRICES: Record<string, number> = {
  basic: 99_00,
  silver: 199_00,
  professional: 299_00,
  pro: 299_00,
  gold: 499_00,
  diamond: 999_00,
};

export async function GET(request: NextRequest) {
  // ── 1. Session check ───────────────────────────────────────
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("id");
  const status = searchParams.get("status");

  const fallbackUrl = new URL("/operations", request.url);
  fallbackUrl.searchParams.set("tab", "settings");

  if (!invoiceId || status !== "paid") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    // ── 2. Verify provider secret is configured ──────────────
    if (!MOYASAR_SECRET_KEY) {
      console.error("Payment callback: MOYASAR_SECRET_KEY not configured");
      fallbackUrl.searchParams.set("error", "بوابة الدفع غير مهيأة. الرجاء التواصل مع الدعم.");
      return NextResponse.redirect(fallbackUrl);
    }

    // ── 3. Verify invoice with Moyasar API ───────────────────
    const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64")}`,
      },
    });

    if (!response.ok) {
      console.error("Payment callback: Moyasar verification failed", response.status);
      fallbackUrl.searchParams.set("error", "تعذر التحقق من الفاتورة.");
      return NextResponse.redirect(fallbackUrl);
    }

    const invoice = await response.json();

    if (invoice.status !== "paid") {
      fallbackUrl.searchParams.set("error", "الفاتورة لم يتم دفعها بعد.");
      return NextResponse.redirect(fallbackUrl);
    }

    // ── 4. Extract and validate metadata ─────────────────────
    const tenantId = invoice.metadata?.tenantId;
    const type = invoice.metadata?.type;
    const plan = invoice.metadata?.plan;

    if (!tenantId) {
      throw new Error("رقم المنشأة غير موجود في الفاتورة.");
    }
    if (tenantId !== session.tenantId) {
      throw new Error("الفاتورة لا تخص هذه المنشأة.");
    }

    const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenantExists) {
      throw new Error("المنشأة غير موجودة.");
    }

    // ── 5. Amount validation ──────────────────────────────────
    if (type !== "addon") {
      const expectedAmount = PLAN_PRICES[plan] || 0;
      const invoiceAmount = invoice.amount || invoice.total || 0;
      if (expectedAmount > 0 && invoiceAmount !== expectedAmount) {
        console.error(`Payment callback: amount mismatch — expected ${expectedAmount}, got ${invoiceAmount}`);
        fallbackUrl.searchParams.set("error", "مبلغ الفاتورة غير مطابق للخطة المطلوبة.");
        return NextResponse.redirect(fallbackUrl);
      }
    }

    // ── 6. Currency validation ────────────────────────────────
    const invoiceCurrency = (invoice.currency || "").toUpperCase();
    if (invoiceCurrency && invoiceCurrency !== "SAR") {
      fallbackUrl.searchParams.set("error", "عملة الفاتورة غير مدعومة.");
      return NextResponse.redirect(fallbackUrl);
    }

    // ── 7. Atomic idempotency check ───────────────────────────
    const receiptKey = `moyasar-${invoiceId}`;
    const existingReceipt = await prisma.receipt.findUnique({ where: { id: receiptKey } });
    if (existingReceipt) {
      const successUrl = new URL("/operations", request.url);
      successUrl.searchParams.set("tab", "settings");
      successUrl.searchParams.set("success", "تم تفعيل الاشتراك مسبقًا.");
      return NextResponse.redirect(successUrl);
    }

    // Create receipt atomically — failure on concurrent insert is caught below
    await prisma.$transaction(async (tx) => {
      const alreadyExists = await tx.receipt.findUnique({ where: { id: receiptKey } });
      if (alreadyExists) return;

      await tx.receipt.create({
        data: {
          id: receiptKey,
          tenantId,
          invoiceId,
          amount: invoice.amount || invoice.total || 0,
          paymentMethod: "moyasar",
          status: "COMPLETED",
        },
      });
    });

    // ── 8. Process payment ────────────────────────────────────
    if (type === "addon") {
      const agentCount = parseInt(invoice.metadata?.agentCount || "0", 10);
      if (agentCount <= 0 || agentCount > 100) {
        throw new Error("عدد الوكلاء غير صالح.");
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { extraAgents: { increment: agentCount } },
      });

      await writeAuditLog({
        tenantId,
        userId: session.userId,
        action: "SUBSCRIPTION_CHANGED",
        tableName: "tenants",
        recordId: tenantId,
        details: `Purchased ${agentCount} additional agents (Moyasar: ${invoiceId})`,
      });

      const successUrl = new URL("/operations", request.url);
      successUrl.searchParams.set("tab", "settings");
      successUrl.searchParams.set("success", `تم شراء عدد ${agentCount} وكلاء إضافيين بنجاح!`);
      return NextResponse.redirect(successUrl);
    }

    // Standard plan activation
    if (!plan) throw new Error("خطة الاشتراك غير موجودة.");
    await handleSuccessfulPaymentInternal(tenantId, plan, "MONTHLY");

    await writeAuditLog({
      tenantId,
      userId: session.userId,
      action: "SUBSCRIPTION_CHANGED",
      tableName: "tenants",
      recordId: tenantId,
      details: `Plan activated: ${plan} (Moyasar: ${invoiceId})`,
    });

    const successUrl = new URL("/operations", request.url);
    successUrl.searchParams.set("tab", "settings");
    successUrl.searchParams.set("success", "تم ترقية الخطة بنجاح!");
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error("Payment callback error:", error.message);
    fallbackUrl.searchParams.set("error", "حدث خطأ أثناء تفعيل الاشتراك.");
    return NextResponse.redirect(fallbackUrl);
  }
}
