// app/actions/payment.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "sk_test_dummy_key_for_orca_crm_saudi";

export async function initiateSubscriptionPaymentAction(plan: "basic" | "silver" | "gold") {
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
      basic: 45000,
      silver: 90000,
      gold: 240000,
    };

    const amountInHalalas = planPrices[plan] || 45000;
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
        description: `ترقية باقة ${plan === "basic" ? "الأساسية" : plan === "silver" ? "الفضية" : "الذهبية"} - ${tenant.companyName}`,
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

/**
 * تهيئة عملية دفع فاتورة شراء وكلاء إضافيين بالربط مع ميسر
 */
export async function initiateAddonPaymentAction(agentCount: number) {
  try {
    const tenant = await getActiveTenant();

    if (!agentCount || agentCount <= 0) {
      throw new Error("يجب اختيار وكيل واحد على الأقل للشراء.");
    }

    // حساب سعر الوكلاء: 250 ر.س للوكيل الواحد (موحد لجميع الباقات)
    const pricePerAgent = 25000;
    const amountInHalalas = pricePerAgent * agentCount;
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/payment/callback`;

    // 1. وضع محاكاة الدفع المحلي (Mock Mode) للتجربة السلسة
    if (MOYASAR_SECRET_KEY.startsWith("sk_test_dummy")) {
      const mockCallbackUrl = `${appUrl}/api/payment/callback?id=mock_invoice_${Math.random().toString(36).substring(2, 9)}&status=paid&mock_tenant_id=${tenant.id}&mock_type=addon&mock_agent_count=${agentCount}`;
      return { success: true, paymentUrl: mockCallbackUrl };
    }

    // 2. الوضع الحقيقي (بوابة ميسر الفعلية)
    const response = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(MOYASAR_SECRET_KEY + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInHalalas,
        currency: "SAR",
        description: `شراء عدد ${agentCount} وكيل إضافي لمنصة أوركا - ${tenant.companyName}`,
        callback_url: callbackUrl,
        metadata: {
          type: "addon",
          tenantId: tenant.id,
          agentCount: agentCount,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "فشل الاتصال ببوابة ميسر لشراء الوكلاء.");
    }

    const invoice = await response.json();
    return { success: true, paymentUrl: invoice.url };

  } catch (error: any) {
    console.error("خطأ بوابة ميسر لشراء الوكلاء:", error);
    return { success: false, error: error.message };
  }
}
