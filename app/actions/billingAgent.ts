// app/actions/billingAgent.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendSMSNotification } from "@/lib/notifications";
import { sendAdminEmailAlert } from "@/lib/email";
import { revalidatePath } from "next/cache";

/**
 * دالة مساعدة لتوليد كلمة مرور عشوائية آمنة للمطور الجديد
 */
function generateSecureRandomPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 🤖 الوكيل الذكي (سند) - تفعيل الحساب وحساب المدة وتشفير وإرسال بيانات الدخول [1.1, 1.2.1, 1.2.2]
 */
export async function handleSuccessfulPaymentAction(tenantId: string, plan: string, billingCycle: "MONTHLY" | "YEARLY") {
  try {
    // 1. حساب تاريخ انتهاء الاشتراك بدقة (30 يوماً للشهري، 365 يوماً للسنوي) [1.1.2]
    const now = new Date();
    const expiresAt = new Date();
    if (billingCycle === "YEARLY") {
      expiresAt.setDate(now.getDate() + 365);
    } else {
      expiresAt.setDate(now.getDate() + 30);
    }

    // 2. تفعيل خطة المستأجر وتحديث حالة الفوترة سحابياً [1.1.2, 1.2.1]
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
        isActive: true,
        paymentStatus: "PAID",
        billingCycle: billingCycle,
        subscriptionExpiresAt: expiresAt,
      },
      include: {
        users: {
          where: { role: "ADMIN" }, // جلب حساب المدير العام للشركة [1.2.1]
        }
      }
    });

    const adminUser = tenant.users[0];
    if (!adminUser) {
      throw new Error("لم يتم العثور على حساب المدير العام للمنشأة العقارية.");
    }

    // 3. توليد وتشفيير وإرسال بيانات الدخول الآمنة للمطور [1.1.2, 1.2.1, 1.2.2]
    const plainPassword = generateSecureRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // تحديث كلمة مرور المدير في قاعدة البيانات لتطابق الهاش الجديد
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash: hashedPassword,
        isActive: true,
      }
    });

    // 4. إرسال الرسالة النصية التلقائية الفورية لجوال المطور العقاري الجديد [1.2.1, 1.2.2]
    const welcomeMessage = `🔒 تنبيه أوركا: تم تفعيل باقتك العقارية بنجاح!
رابط لوحتك الخاصة: https://${tenant.subdomain}.orca-az-ez.pro/login
البريد: ${adminUser.email}
الباسورد: ${plainPassword}
(يرجى حفظ البيانات وتغيير الباسورد فور الدخول)`;
    
    // إرسال التنبيه الفوري لجوال المشتري
    const clientMobile = "+966557516311"; // رقم تواصل المدير المدون أثناء التسجيل
    await sendSMSNotification(clientMobile, welcomeMessage);

    // إرسال إشعار بريدي لك كمالك للمنصة [1.1.2, 1.2.1, 1.2.2]
    const emailSubject = `💰 تفعيل اشتراك ناجح: ${tenant.companyName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
        <h2 style="color: #10b981;">🤖 الوكيل سند: تم تفعيل منشأة عقارية بنجاح</h2>
        <p>تم إتمام عملية الدفع المتكرر وتنشيط الحساب آلياً:</p>
        <ul>
          <li><strong>الشركة:</strong> ${tenant.companyName}</li>
          <li><strong>الباقة المفعلة:</strong> ${plan}</li>
          <li><strong>تاريخ الانتهاء:</strong> ${expiresAt.toLocaleDateString('ar-SA')}</li>
        </ul>
      </div>
    `;
    await sendAdminEmailAlert(emailSubject, emailHtml);

    revalidatePath("/admin");
    return { success: true };

  } catch (error: any) {
    console.error("خطأ تفعيل الوكيل سند:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🤖 الوكيل الذكي (سند) - الفحص والتعطيل التلقائي للاشتراكات المنتهية (SaaS Expiry Engine) [1.1, 1.1.2, 1.2.1]
 * (يمكن جدولة تشغيل هذه الدالة كـ Cron Job يومي أو تفعيلها عند كل عملية دخول لتتحقق آلياً)
 */
export async function checkAndSuspendExpiredTenantsAction() {
  try {
    const now = new Date();

    // البحث عن جميع الشركات النشطة التي تجاوزت تاريخ انتهاء الاشتراك
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionExpiresAt: {
          lt: now, // أقل من الوقت الحالي (منتهي)
        }
      }
    });

    if (expiredTenants.length === 0) {
      return { success: true, message: "لا يوجد اشتراكات منتهية اليوم." };
    }

    // تعطيل الشركات المنتهية وإرسال تذكيرات دفع آلياً
    for (const tenant of expiredTenants) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          isActive: false,
          paymentStatus: "UNPAID",
        }
      });

      // 🚀 إرسال رسالة جوال آلية تذكيرية بضرورة التجديد [1.2.1]
      const suspendSMS = `⚠️ تنبيه أوركا: شريكنا العزيز بـ (${tenant.companyName})، نود إعلامك بانتهاء اشتراكك الشهري وتعليق صلاحيات اللوحة مؤقتاً. يرجى الدخول وتجديد الاشتراك لتفعيل السحابة فوراً: https://orca.az-ez.pro/operations/settings`;
      const clientMobile = "+966557516311"; // هاتف المدير العقاري
      await sendSMSNotification(clientMobile, suspendSMS);
    }

    revalidatePath("/admin");
    return { success: true, updatedCount: expiredTenants.length };

  } catch (error: any) {
    console.error("خطأ تعطيل الاشتراكات للوكيل سند:", error);
    return { success: false, error: error.message };
  }
}