// app/actions/payment.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

const PAYLINK_SECRET = process.env.PAYLINK_SECRET_KEY || "";
const PAYLINK_BASE = process.env.PAYLINK_BASE_URL || "https://restpilot.paylink.sa";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orca.az-ez.pro";

function generateIdempotencyKey(): string {
  return `orca-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function createPaylinkInvoice(params: {
  amount: number;
  description: string;
  metadata: Record<string, string>;
}): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  const idempotencyKey = generateIdempotencyKey();

  try {
    const response = await fetch(`${PAYLINK_BASE}/api/v1/invoice`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYLINK_SECRET}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: params.amount, // in halalas
        currency: "SAR",
        description: params.description,
        callback_url: `${APP_URL}/api/payment/callback`,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || "فشل الاتصال ببوابة Paylink");
    }

    const invoice = await response.json();
    return { success: true, paymentUrl: invoice.url || invoice.payment_url };
  } catch (error: any) {
    console.error("[Paylink] create invoice error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function initiateSubscriptionPaymentAction(plan: "basic" | "silver" | "gold") {
  try {
    const tenant = await getActiveTenant();

    const planPrices: Record<string, number> = {
      basic: 45000,
      silver: 90000,
      gold: 240000,
    };

    const amountInHalalas = planPrices[plan] || 45000;

    if (!PAYLINK_SECRET || PAYLINK_SECRET === "test_secret_key_placeholder") {
      return {
        success: false,
        error: "بوابة الدفع Paylink غير مفعلة حالياً. يرجى التواصل مع الدعم الفني.",
      };
    }

    const result = await createPaylinkInvoice({
      amount: amountInHalalas,
      description: `ترقية باقة ${plan === "basic" ? "الأساسية" : plan === "silver" ? "الفضية" : "الذهبية"} - ${tenant.companyName}`,
      metadata: {
        tenantId: tenant.id,
        plan,
      },
    });

    return result;
  } catch (error: any) {
    console.error("خطأ بوابة Paylink:", error);
    return { success: false, error: error.message };
  }
}

export async function initiateAddonPaymentAction(agentCount: number) {
  try {
    const tenant = await getActiveTenant();

    if (!agentCount || agentCount <= 0) {
      throw new Error("يجب اختيار وكيل واحد على الأقل للشراء.");
    }

    const pricePerAgent = 25000;
    const amountInHalalas = pricePerAgent * agentCount;

    if (!PAYLINK_SECRET || PAYLINK_SECRET === "test_secret_key_placeholder") {
      return {
        success: false,
        error: "بوابة الدفع Paylink غير مفعلة حالياً. يرجى التواصل مع الدعم الفني.",
      };
    }

    const result = await createPaylinkInvoice({
      amount: amountInHalalas,
      description: `شراء عدد ${agentCount} وكيل إضافي لمنصة أوركا - ${tenant.companyName}`,
      metadata: {
        type: "addon",
        tenantId: tenant.id,
        agentCount: String(agentCount),
      },
    });

    return result;
  } catch (error: any) {
    console.error("خطأ بوابة Paylink لشراء الوكلاء:", error);
    return { success: false, error: error.message };
  }
}
