import "server-only";

import { sendEmail } from "@/lib/email";
import {
  sendSMSNotification,
  sendWhatsAppNotification,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const SUPPORT_NOTIFICATION_TIMEOUT_MS = 15_000;

type TicketDestination = {
  email?: string;
  phone?: string;
  channel?: string;
};

export type TicketNotificationResult =
  | { success: true }
  | { success: false; error: string };

async function withTimeout<T>(operation: Promise<T>, errorCode: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(errorCode)),
          SUPPORT_NOTIFICATION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function loadTicketDestination(
  tenantId: string,
  ticketId: string,
): Promise<TicketDestination> {
  const created = await prisma.auditLog.findFirst({
    where: {
      tenantId,
      tableName: "tickets",
      recordId: ticketId,
      action: "TICKET_CREATED",
    },
    orderBy: { createdAt: "asc" },
    select: { details: true },
  });

  try {
    return JSON.parse(created?.details || "{}") as TicketDestination;
  } catch {
    return {};
  }
}

export async function notifyTicketDestination(input: {
  tenantId: string;
  ticketId: string;
  subject: string;
  message: string;
}): Promise<TicketNotificationResult> {
  try {
    const destination = await loadTicketDestination(input.tenantId, input.ticketId);
    const channel = String(destination.channel || "").toUpperCase();
    const email = String(destination.email || "").trim();
    const phone = String(destination.phone || "").trim();

    if (channel === "EMAIL") {
      if (!email) return { success: false, error: "وجهة العميل غير موجودة." };
      const result = await withTimeout(
        sendEmail({
          tenantId: input.tenantId,
          to: email,
          subject: input.subject,
          htmlBody: input.message,
        }),
        "EMAIL_DELIVERY_TIMEOUT",
      );
      return result.success
        ? { success: true }
        : { success: false, error: result.code || result.error || "EMAIL_PROVIDER_NOT_CONFIGURED" };
    }

    if (channel === "SMS") {
      if (!phone) return { success: false, error: "وجهة العميل غير موجودة." };
      const result = await withTimeout(
        sendSMSNotification(phone, input.message, {
          tenantId: input.tenantId,
          ticketId: input.ticketId,
        }),
        "SMS_DELIVERY_TIMEOUT",
      );
      return result.success
        ? { success: true }
        : { success: false, error: result.error || "SMS_NOT_CONFIGURED" };
    }

    if (channel === "WHATSAPP") {
      if (!phone) return { success: false, error: "وجهة العميل غير موجودة." };
      const result = await withTimeout(
        sendWhatsAppNotification(
          input.tenantId,
          phone,
          "support_ticket_update",
          [input.message],
        ),
        "WHATSAPP_DELIVERY_TIMEOUT",
      );
      return result.success
        ? { success: true }
        : {
            success: false,
            error: result.errorCode || result.error || "WHATSAPP_NOT_CONFIGURED",
          };
    }

    return { success: false, error: "وجهة العميل غير موجودة." };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : error instanceof Error
          ? error.message
          : "HELPDESK_NOTIFICATION_FAILED";
    return { success: false, error: code || "HELPDESK_NOTIFICATION_FAILED" };
  }
}
