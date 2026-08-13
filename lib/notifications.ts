import "server-only";

import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/send-service";

const SMS_API_KEY = process.env.SMS_API_KEY;

export type SmsNotificationContext = {
  tenantId?: string;
  leadId?: string;
  ticketId?: string;
  userId?: string | null;
};

async function persistOutboundSmsAttempt(input: {
  tenantId?: string;
  leadId?: string;
  ticketId?: string;
  userId?: string | null;
  destinationPresent: boolean;
  result: string;
}) {
  if (!input.tenantId) return;

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        action: "SMS_OUTBOUND_ATTEMPT",
        tableName: input.leadId ? "leads" : input.ticketId ? "tickets" : "sms",
        recordId: input.leadId || input.ticketId || "sms",
        details: JSON.stringify({
          destinationPresent: input.destinationPresent,
          result: input.result,
        }),
      },
    });
  } catch (error) {
    console.error("[SMS_AUDIT_FAILED]", error);
  }
}

/**
 * إرسال رسالة SMS نصية عبر مزود الخدمة المهيأ.
 */
export async function sendSMSNotification(
  to: string,
  message: string,
  context: SmsNotificationContext = {},
) {
  const destinationPresent = Boolean(String(to || "").trim());

  try {
    if (!SMS_API_KEY) {
      console.info("[SMS_DISABLED]", {
        recipientConfigured: destinationPresent,
        messageLength: String(message ?? "").length,
      });

      await persistOutboundSmsAttempt({
        ...context,
        destinationPresent,
        result: "SMS_NOT_CONFIGURED",
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

    const result = response.ok ? "SENT" : "SMS_SEND_FAILED";
    await persistOutboundSmsAttempt({
      ...context,
      destinationPresent,
      result,
    });

    return {
      success: response.ok,
      error: response.ok ? undefined : "SMS_SEND_FAILED",
    };
  } catch (error) {
    console.error("SMS_SEND_FAILED", error);

    await persistOutboundSmsAttempt({
      ...context,
      destinationPresent,
      result: "SMS_SEND_FAILED",
    });

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