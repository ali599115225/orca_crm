// lib/server/internal.ts
// SERVER-ONLY — do not import from client components.
// These functions use Prisma, send SMS/email, and perform trusted operations.
// They are called from API routes, cron jobs, and webhooks — NOT from the client.

import "server-only";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendSMSNotification } from "@/lib/notifications";
import { sendAdminEmailAlert } from "@/lib/email";
import { revalidatePath } from "next/cache";

// ── Billing Agent (from app/actions/billingAgent.ts) ─────────────────────────

/** سند — تفعيل الحساب بعد نجاح الدفع */
export async function handleSuccessfulPaymentInternal(
  tenantId: string,
  plan: string,
  billingCycle: "MONTHLY" | "YEARLY"
) {
  try {
    const now = new Date();
    const expiresAt = new Date();
    if (billingCycle === "YEARLY") {
      expiresAt.setDate(now.getDate() + 365);
    } else {
      expiresAt.setDate(now.getDate() + 30);
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
        isActive: true,
        paymentStatus: "PAID",
        billingCycle: billingCycle,
        subscriptionExpiresAt: expiresAt,
      },
      include: { users: { where: { role: "ADMIN" } } },
    });

    const adminUser = tenant.users[0];
    if (!adminUser) throw new Error("لم يتم العثور على حساب المدير العام للمنشأة العقارية.");

    const plainPassword = generateSecureRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash: hashedPassword, isActive: true },
    });

    const welcomeMessage = `🔒 تنبيه أوركا: تم تفعيل باقتك العقارية بنجاح!\nرابط لوحتك الخاصة: https://${tenant.subdomain}.orca.az-ez.pro/login\nالبريد: ${adminUser.email}\nالباسورد: ${plainPassword}\n(يرجى حفظ البيانات وتغيير الباسورد فور الدخول)`;

    await sendSMSNotification("+966557516311", welcomeMessage);

    const emailSubject = `💰 تفعيل اشتراك ناجح: ${tenant.companyName}`;
    const emailHtml = `<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;"><h2 style="color: #10b981;">الوكيل سند: تم تفعيل منشأة عقارية بنجاح</h2><p>تم إتمام عملية الدفع وتنشيط الحساب آلياً:</p><ul><li><strong>الشركة:</strong> ${tenant.companyName}</li><li><strong>الباقة المفعلة:</strong> ${plan}</li><li><strong>تاريخ الانتهاء:</strong> ${expiresAt.toLocaleDateString('ar-SA')}</li></ul></div>`;
    await sendAdminEmailAlert(emailSubject, emailHtml);

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    console.error("خطأ تفعيل الوكيل سند:", error);
    return { success: false, error: error.message };
  }
}

/** سند — تعطيل الاشتراكات المنتهية */
export async function checkAndSuspendExpiredTenantsInternal() {
  try {
    const now = new Date();
    const expiredTenants = await prisma.tenant.findMany({
      where: { isActive: true, subscriptionExpiresAt: { lt: now } },
    });

    if (expiredTenants.length === 0) {
      return { success: true, message: "لا يوجد اشتراكات منتهية اليوم." };
    }

    const expiredIds = expiredTenants.map((t) => t.id);
    await prisma.tenant.updateMany({
      where: { id: { in: expiredIds } },
      data: { isActive: false, paymentStatus: "UNPAID" },
    });

    for (const tenant of expiredTenants) {
      const suspendSMS = `⚠️ تنبيه أوركا: شريكنا العزيز بـ (${tenant.companyName})، نود إعلامك بانتهاء اشتراكك الشهري وتعليق صلاحيات اللوحة مؤقتاً. يرجى الدخول وتجديد الاشتراك لتفعيل السحابة فوراً: https://orca.az-ez.pro/operations?tab=settings`;
      await sendSMSNotification("+966557516311", suspendSMS);
    }

    revalidatePath("/operations");
    return { success: true, updatedCount: expiredTenants.length };
  } catch (error: any) {
    console.error("خطأ تعطيل الاشتراكات للوكيل سند:", error);
    return { success: false, error: error.message };
  }
}

// ── Sadad Agent (from app/actions/sanadAgent.ts) ─────────────────────────────

/** سند — مراقبة وجدولة تحصيل الأقساط العقارية */
export async function runInstallmentAgentInternal() {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const upcomingInstallments = await prisma.installment.findMany({
      where: {
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
      const tenantId = inst.contract?.unit?.project?.tenantId;
      const companyName = "المنشأة العقارية";
      if (!tenantId) continue;

      const paymentUrl = `https://orca.az-ez.pro/contract/${inst.contractId}?payment=installment`;

      const message = `🔔 تنبيه أوركا: مرحباً بك في ${companyName}\nنود تذكيرك بأن هناك قسطاً يستحق بتاريخ ${inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('ar-SA') : "قريباً"}.\nللسداد: ${paymentUrl}`;
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

// ── Shared Helpers ──────────────────────────────────────────────────────────

function generateSecureRandomPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
