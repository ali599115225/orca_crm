// app/actions/payment.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "sk_test_dummy_key_for_orca_crm_saudi";

export async function initiateSubscriptionPaymentAction(plan: "basic" | "professional" | "enterprise") {
  try {
    const tenant = await getActiveTenant();

    // 1. وضع محاكاة الدفع المحلي (Mock Mode) للتجربة السلسة بدون حساب ميسر حقيقي
    if (MOYASAR_SECRET_KEY.startsWith("sk_test_dummy")) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      // نمرر البيانات مباشرة في الرابط في وضع التجربة لتخطي التحقق الخارجي
      const mockCallbackUrl = `${appUrl}/api/payment/callback?id=mock_invoice_${Math.random().toString(36).substring(2, 9)}&status=paid&mock_tenant_id=${tenant.id}&mock_plan=${plan}`;
      return { success: true, paymentUrl: mockCallbackUrl };
    }

    // 2. الوضع الحقيقي (بوابة ميسر الفعلية)
    const planPrices: Record<string, number> = {
      basic: 29900,
      professional: 59900,
      enterprise: 129900,
    };

    const amountInHalalas = planPrices[plan] || 29900;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const response = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(MOYASAR_SECRET_KEY + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInHalalas,
        currency: "SAR",
        description: `ترقية باقة ${plan === "basic" ? "الأساسية" : plan === "professional" ? "الاحترافية" : "الشركات"} - ${tenant.companyName}`,
        callback_url: callbackUrl,
        metadata: {
          tenantId: tenant.id,
          plan: plan,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "فشل الاتصال ببوابة ميسر.");
    }

    const invoice = await response.json();
    return { success: true, paymentUrl: invoice.url };

  } catch (error: any) {
    console.error("خطأ بوابة ميسر:", error);
    return { success: false, error: error.message };
  }
}