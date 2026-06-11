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
        from: 'ORCA <onboarding@resend.dev>', // نطاق الإرسال الافتراضي المجاني للتجربة
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

/**
 * إرسال بريد إلكتروني عام من ORCA CRM
 * يُستخدم لإرسال بريد يدوي من داخل CRM
 */
export interface SendEmailOptions {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    if (!RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY غير مُهيأ. أضفه في متغيرات البيئة.",
      };
    }

    if (!options.to || !options.subject) {
      return {
        success: false,
        error: "الحقول المطلوبة: to, subject",
      };
    }

    const emailData: any = {
      from: options.from,
      to: options.to.split(",").map(e => e.trim()),
      subject: options.subject,
    };

    if (options.cc) {
      emailData.cc = options.cc.split(",").map(e => e.trim());
    }
    if (options.bcc) {
      emailData.bcc = options.bcc.split(",").map(e => e.trim());
    }
    if (options.htmlBody) {
      emailData.html = options.htmlBody;
    }
    if (options.textBody) {
      emailData.text = options.textBody;
    }

    const result = await resend.emails.send(emailData);

    if (result.error) {
      return {
        success: false,
        error: result.error.message || "فشل إرسال البريد",
      };
    }

    return {
      success: true,
      providerMessageId: result.data?.id,
    };
  } catch (error: any) {
    console.error("[Email] Send error:", error.message);
    return {
      success: false,
      error: error.message || "خطأ غير متوقع في إرسال البريد",
    };
  }
}
