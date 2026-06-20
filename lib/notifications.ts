import "server-only";

import { sendWhatsAppTemplate } from "@/lib/whatsapp/send-service";

const SMS_API_KEY = process.env.SMS_API_KEY;

/**
 * إرسال رسالة SMS نصية عبر مزود الخدمة المهيأ.
 */
export async function sendSMSNotification(
  to: string,
  message: string,
) {
  try {
    if (!SMS_API_KEY) {
      console.info("[SMS_DISABLED]", {
        recipientConfigured: Boolean(to),
        messageLength: String(message ?? "").length,
      });

      return {
        success: false,
        error: "SMS_NOT_CONFIGURED",
      };
    }

    const response = await fetch(
      "https://api.msegat.com/gw/sendsms.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: process.env.MSEGAT_USERNAME,
          apiKey: SMS_API_KEY,
          userSender:
            process.env.MSEGAT_SENDER_NAME || "ORCA-CRM",
          numbers: to.replace("+", ""),
          msg: message,
        }),
      },
    );

    return {
      success: response.ok,
      error: response.ok ? undefined : "SMS_SEND_FAILED",
    };
  } catch (error) {
    console.error("SMS_SEND_FAILED", error);

    return {
      success: false,
      error: "SMS_SEND_FAILED",
    };
  }
}

/**
 * إرسال قالب واتساب حصريًا عبر الخدمة المركزية المعزولة حسب tenant.
 */
export async function sendWhatsAppNotification(
  tenantId: string,
  to: string,
  templateName: string,
  parameters: string[],
) {
  return sendWhatsAppTemplate({
    tenantId,
    to,
    templateName,
    parameters,
    languageCode: "ar",
  });
}