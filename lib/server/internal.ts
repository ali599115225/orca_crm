// lib/server/internal.ts
// SERVER-ONLY — do not import from client components.
// These functions use Prisma, send SMS/email, and perform trusted operations.
// They are called from API routes, cron jobs, and webhooks — NOT from the client.

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
} from "@/lib/platform-operating-model";

// ── Billing Agent (from app/actions/billingAgent.ts) ─────────────────────────

/** سند — تفعيل الحساب بعد نجاح الدفع */
export async function handleSuccessfulPaymentInternal(
  _tenantId: string,
  _plan: string,
  _billingCycle: "MONTHLY" | "YEARLY"
): Promise<{
  success: boolean;
  error?: string;
  code?: typeof LEGACY_SAAS_OUT_OF_SCOPE;
  platformModel?: typeof ORCA_PLATFORM_MODEL.platformModel;
}> {
  return {
    success: false as const,
    code: LEGACY_SAAS_OUT_OF_SCOPE,
    platformModel: ORCA_PLATFORM_MODEL.platformModel,
    error: "تفعيل اشتراكات SaaS غير متاح في منصة الشركة الواحدة.",
  };
}

/** سند — تعطيل الاشتراكات المنتهية */
export async function checkAndSuspendExpiredTenantsInternal() {
  return {
    success: true as const,
    skipped: true as const,
    updatedCount: 0,
    code: LEGACY_SAAS_OUT_OF_SCOPE,
    platformModel: ORCA_PLATFORM_MODEL.platformModel,
    message: "فحص اشتراكات SaaS معطل في منصة الشركة الواحدة.",
  };
}

// ── Sadad Agent (from app/actions/sanadAgent.ts) ─────────────────────────────

/** سند — مراقبة وجدولة تحصيل الأقساط العقارية */
export async function runInstallmentAgentInternal(tenantId: string) {
  if (!tenantId) {
    return { success: false as const, error: "COMPANY_SCOPE_REQUIRED" };
  }

  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const upcomingInstallments = await prisma.installment.findMany({
      where: {
        tenantId,
        paymentStatus: "Pending",
        dueDate: { gte: today, lte: threeDaysFromNow },
      },
      include: {
        contract: {
          include: {
            unit: {
              select: {
                project: {
                  select: { tenantId: true },
                },
              },
            },
          },
        },
      },
    });

    if (upcomingInstallments.length === 0) {
      return { success: true, message: "لا توجد أقساط مستحقة خلال الأيام الثلاثة القادمة." };
    }

    for (const inst of upcomingInstallments) {
      console.log("[SANAD] Installment reminder checked");
    }

    return { success: true, processedCount: upcomingInstallments.length };
  } catch (error: any) {
    console.error("خطأ الوكيل سند - الأقساط:", error);
    return { success: false, error: error.message };
  }
}

// ── WhatsApp CRM (from app/actions/whatsapp-crm.ts) ──────────────────────────

/** تصنيف عميل واتساب بناءً على نص الرسالة */
export async function classifyWhatsAppLeadInternal(leadId: string, messageText: string) {
  try {
    const highValueKeywords = [
      "فيلا", "villa", "دوبلكس", "duplex", "بنتهاوس", "penthouse", "شقة فاخرة",
      "luxury apartment", "استثمار", "investment", "شراء", "buy", "purchase",
      "مستعجل", "urgent", "قرض عقاري", "mortgage", "جاهز", "ready",
    ];
    const mediumKeywords = [
      "استفسار", "inquiry", "سعر", "price", "كم", "how much",
      "متاح", "available", "موعد", "appointment", "زيارة", "visit",
    ];
    const lowKeywords = ["مرحبا", "hello", "hi", "سلام", "شكرا", "thanks"];

    const text = messageText.toLowerCase();
    const isHigh = highValueKeywords.some((kw) => text.includes(kw));
    const isMedium = mediumKeywords.some((kw) => text.includes(kw));
    const isLow = lowKeywords.some((kw) => text.includes(kw));

    let priority = "LOW";
    if (isHigh) priority = "HIGH";
    else if (isMedium) priority = "MEDIUM";
    else if (isLow) priority = "LOW";

    await prisma.lead.update({
      where: { id: leadId },
      data: { priority: priority },
    });

    return { success: true, priority };
  } catch (error: any) {
    return { success: false, error: "classification_failed" };
  }
}
