// lib/email.ts
import { Resend } from 'resend';

// المفتاح السري لـ Resend (يُحفظ بأمان في متغيرات البيئة)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

// تهيئة العميل
const resend = new Resend(RESEND_API_KEY || 're_dummy_key_for_testing');

/**
 * إرسال بريد إلكتروني تنبيهي فوري لمدير المنصة الرئيسي (أنت) عند حدوث أي نشاط تجاري بالـ SaaS [1.1.2, 1.2.1]
 */
export async function sendAdminEmailAlert(subject: string, htmlContent: string) {
  try {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || "elite.orca@outlook.sa"; // بريدك الشخصي لتلقي التنبيهات
    const recipients = [adminEmail, "ali.orca@outlook.sa"];

    if (RESEND_API_KEY) {
      // إرسال حقيقي سحابي عبر خوادم Resend
      await resend.emails.send({
        from: 'ORCA CRM <onboarding@resend.dev>', // نطاق الإرسال الافتراضي المجاني للتجربة
        to: recipients,
        subject: subject,
        html: htmlContent,
      });
      console.log(`✉️ [سيرفر البريد السحابي] ➔ تم إرسال بريد تنبيهي بنجاح إلى: ${recipients.join(", ")}`);
    } else {
      // محاكاة الإرسال محلياً في السجلات للتجربة بدون مفتاح
      console.log(`✉️ [سجل البريد السحابي - تجريبي] ➔ الموضوع: "${subject}" | التنبيه: ${htmlContent}`);
    }
  } catch (error) {
    console.error("فشل إرسال بريد التنبيه الإداري:", error);
  }
}