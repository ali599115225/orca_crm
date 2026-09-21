// lib/agents/sanad.ts
import { prisma } from "../prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { sendAdminEmailAlert } from "../email";

interface RecoveryResult<T> {
  success: boolean;
  attempts: number;
  data?: T;
  error?: string;
  healingType?: 'IMMEDIATE' | 'SELF_HEALED' | 'FAILED_ESCALATED';
}

/**
 * 🤖 الوكيل سند (وكيل التعافي) - فحص الأخطاء التقنية، إعادة المحاولة الذكية، والتعافي الذاتي (Self-Healing)
 */
export async function runSanadRecovery<T>(
  tenantId: string,
  userId: string | undefined,
  apiCallName: string,
  executeAction: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<RecoveryResult<T>> {
  return runWithTenantContext({ tenantId, userId }, async (): Promise<RecoveryResult<T>> => {
    let attempts = 0;
    let lastError = "";

    while (attempts < maxRetries) {
      attempts++;
      try {
        // تنفيذ العملية التقنية المغلفة
        const data = await executeAction();

        // في حال النجاح بعد الفشل الأولي، يتم تسجيل تعافي ذاتي
        if (attempts > 1) {
          const logMessageAr = `«[الوكيل سند] تعافي ذاتي بنجاح (Self-Healing) للاتصال بالخدمة (${apiCallName}) في المحاولة رقم ${attempts}»`;
          await prisma.agentTelemetryLog.create({
            data: {
              tenantId,
              agentId: "Sanad",
              actionType: "Link_Dispatched",
              logMessageAr,
              severity: "Info",
            },
          });
        }

        return {
          success: true,
          attempts,
          data,
          healingType: attempts === 1 ? "IMMEDIATE" : "SELF_HEALED",
        };
      } catch (err: any) {
        lastError = err.message || String(err);
        console.warn(`[الوكيل سند] فشل المحاولة رقم ${attempts} لـ ${apiCallName}: ${lastError}`);
        
        // التحقق مما إذا كان الخطأ مؤقتاً ومناسباً لإعادة المحاولة (مثل timeout أو 503)
        const isTransient = 
          lastError.includes("timeout") || 
          lastError.includes("503") || 
          lastError.includes("502") || 
          lastError.includes("rate limit") ||
          lastError.includes("network") ||
          lastError.includes("connection");

        if (!isTransient || attempts === maxRetries) {
          // إذا كان الخطأ ثابتاً (مثل خطأ تفويض أو معطيات خاطئة)، أو استنفدنا المحاولات، نخرج من الحلقة
          break;
        }

        // استراتيجية الانتظار الذكي (Intelligent Back-off)
        // نضاعف الانتظار في كل محاولة
        const backoffDelay = delayMs * Math.pow(2, attempts - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    // ─── في حال الفشل النهائي والتصعيد للمدير العام ──────────────────
    const failureMsg = `فشل حتمي مستمر في معالجة الربط التقني (${apiCallName}) بعد ${attempts} محاولات. الخطأ: ${lastError}`;
    
    // 1. تسجيل الحدث الحرج بقاعدة البيانات
    const logMessageAr = `«[الوكيل سند] 🚨 فشل استباقي في تعافي الخدمة (${apiCallName}). تم تصعيد تقرير التشخيص للمدير العام فوراً»`;
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId,
        agentId: "Sanad",
        actionType: "Security_Lock",
        logMessageAr,
        severity: "Critical",
      },
    });

    // 2. إرسال بريد تنبيهي فوري وحرج للمدير العام
    const emailSubject = `🚨 [تنبيه حرج - الوكيل سند] فشل تشغيل بوابة الربط: ${apiCallName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #fda4af; background-color: #fff1f2; border-radius: 8px;">
        <h2 style="color: #be123c; margin-top: 0;">🚨 تقرير فشل فني وتصعيد إداري حرج</h2>
        <p>مرحباً بك يا مدير المنصة،</p>
        <p>تلقى الوكيل <b>سند</b> إشارة خطأ غير قابل للإصلاح التلقائي أثناء تنفيذ العملية البرمجية التالية:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #fecdd3; font-weight: bold; width: 120px;">العملية المستهدفة:</td>
            <td style="padding: 8px; border: 1px solid #fecdd3;">${apiCallName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #fecdd3; font-weight: bold;">هوية المستأجر:</td>
            <td style="padding: 8px; border: 1px solid #fecdd3;">${tenantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #fecdd3; font-weight: bold;">عدد المحاولات:</td>
            <td style="padding: 8px; border: 1px solid #fecdd3;">${attempts} محاولات استباقية</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #fecdd3; font-weight: bold; color: #be123c;">تفاصيل الخطأ:</td>
            <td style="padding: 8px; border: 1px solid #fecdd3; font-family: monospace; background-color: #fff; color: #be123c;">${lastError}</td>
          </tr>
        </table>
        <p style="margin-bottom: 0;">يرجى مراجعة بوابات الربط وقاعدة بيانات الخادم فوراً لضمان استقرار العمليات.</p>
      </div>
    `;

    // نرسل البريد الإلكتروني بشكل غير متزامن
    sendAdminEmailAlert(emailSubject, emailHtml).catch((e) =>
      console.error("[Sanad Email Escalation Error] Failed to send email:", e)
    );

    return {
      success: false,
      attempts,
      error: lastError,
      healingType: "FAILED_ESCALATED",
    };
  });
}
