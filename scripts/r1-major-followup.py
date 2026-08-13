from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one literal match, found {count}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}")
    write(path, updated)


# A) Manual invoice payment must charge only the remaining balance.
path = "app/api/v1/invoices/[id]/pay/route.ts"
replace_once(
    path,
    '''      const invoiceAmount = Number(invoice.totalAmount);
      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        throw new PaymentRouteError(
          ErrorCode.VALIDATION_ERROR,
          400,
          'invoice amount is invalid'
        );
      }

      const unpaidInstallments = await tx.installment.findMany({''',
    '''      const invoiceTotal = Number(invoice.totalAmount);
      if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
        throw new PaymentRouteError(
          ErrorCode.VALIDATION_ERROR,
          400,
          'invoice amount is invalid'
        );
      }

      const completedPayments = await tx.paymentTransaction.aggregate({
        where: {
          tenantId,
          invoiceId: id,
          status: 'COMPLETED',
        },
        _sum: { netAmount: true },
      });
      const paidBefore = Number(completedPayments._sum.netAmount || 0);
      const invoiceAmount =
        Math.round((invoiceTotal - paidBefore) * 100) / 100;
      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        throw new PaymentRouteError(
          ErrorCode.CONFLICT,
          409,
          'invoice has no remaining balance'
        );
      }

      const unpaidInstallments = await tx.installment.findMany({''',
)

# B) Keep EJAR non-production detection within the previously locked sandbox rule.
path = "lib/saudi-trust-gate/index.ts"
replace_once(
    path,
    "    if (production && /(sandbox|restpilot|uat|staging|test)/i.test(configuredUrl)) {",
    "    if (production && /sandbox/i.test(configuredUrl)) {",
)

# C) Shared helpdesk destination dispatcher with a bounded request lifetime.
write(
    "lib/support/ticket-destination.ts",
    '''import "server-only";

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

async function withTimeout<T>(
  operation: Promise<T>,
  errorCode: string,
): Promise<T> {
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
    const destination = await loadTicketDestination(
      input.tenantId,
      input.ticketId,
    );
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
        : {
            success: false,
            error:
              result.code || result.error || "EMAIL_PROVIDER_NOT_CONFIGURED",
          };
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
            error:
              result.errorCode || result.error || "WHATSAPP_NOT_CONFIGURED",
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
''',
)

# D) Helpdesk action consumes the shared dispatcher instead of duplicating it.
path = "app/actions/helpdesk.ts"
replace_once(
    path,
    '''import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";''',
    '''import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notifyTicketDestination } from "@/lib/support/ticket-destination";''',
)
regex_once(
    path,
    r'''async function loadTicketDestination\(.*?\n\}\n\nasync function notifyTicketDestination\(.*?\n\}\n\nexport async function getTicketsAction''',
    '''export async function getTicketsAction''',
)
replace_once(
    path,
    '''        let notificationError: string | null = null;
        if (status === "CLOSED") {
          try {
            await notifyTicketDestination({
              tenantId: session.tenantId,
              ticketId: ticket.id,
              subject: `Ticket closed: ${ticket.title}`,
              message: ticket.title,
            });
          } catch (error) {
            notificationError =
              error instanceof Error ? error.message : "HELPDESK_NOTIFICATION_FAILED";
            await writeAuditLog({
              tenantId: session.tenantId,
              userId: session.userId,
              action: "TICKET_NOTIFICATION_FAILED",
              tableName: "tickets",
              recordId: ticket.id,
              details: JSON.stringify({ code: notificationError.slice(0, 200) }),
            });
          }
        }''',
    '''        let notificationError: string | null = null;
        if (status === "CLOSED") {
          const notification = await notifyTicketDestination({
            tenantId: session.tenantId,
            ticketId: ticket.id,
            subject: `Ticket closed: ${ticket.title}`,
            message: ticket.title,
          });
          if (!notification.success) {
            notificationError = notification.error;
            await writeAuditLog({
              tenantId: session.tenantId,
              userId: session.userId,
              action: "TICKET_NOTIFICATION_FAILED",
              tableName: "tickets",
              recordId: ticket.id,
              details: JSON.stringify({ code: notificationError.slice(0, 200) }),
            });
          }
        }''',
)

# E) Support reply route consumes the same dispatcher.
path = "app/api/v1/support/tickets/[id]/reply/route.ts"
replace_once(
    path,
    '''import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";''',
    '''import { prisma } from "@/lib/prisma";
import { notifyTicketDestination } from "@/lib/support/ticket-destination";''',
)
regex_once(
    path,
    r'''        const created = await prisma\.auditLog\.findFirst\(\{.*?\n        \}\n\n        const record = await prisma\.auditLog\.create''',
    '''        const delivery = await notifyTicketDestination({
          tenantId: session.tenantId,
          ticketId: id,
          subject: `Ticket reply: ${ticket.title}`,
          message,
        });
        if (!delivery.success) {
          return NextResponse.json(
            { success: false, error: delivery.error },
            { status: 409 },
          );
        }

        const record = await prisma.auditLog.create''',
)

# F) Strengthen focused R1 source contracts.
path = "tests/postclosure-r1-remediation.test.ts"
replace_once(
    path,
    '''    expect(route).toContain("state: 'failed' as const");
    expect(route).toContain("manual payment retry is already in progress");
    expect(route).toContain("payment receipt was not created");''',
    '''    expect(route).toContain("state: 'failed' as const");
    expect(route).toContain("manual payment retry is already in progress");
    expect(route).toContain("payment receipt was not created");
    expect(route).toContain("tx.paymentTransaction.aggregate");
    expect(route).toContain("invoiceTotal - paidBefore");
    expect(route).toContain("invoice has no remaining balance");''',
)
replace_once(
    path,
    '''    expect(helpdesk).toContain("TICKET_NOTIFICATION_FAILED");
    expect(helpdesk).toContain("notificationError");
    expect(helpdesk).toContain("قناة التواصل غير صالحة");''',
    '''    const destination = source("lib/support/ticket-destination.ts");
    expect(helpdesk).toContain("TICKET_NOTIFICATION_FAILED");
    expect(helpdesk).toContain("notificationError");
    expect(helpdesk).toContain("قناة التواصل غير صالحة");
    expect(helpdesk).toContain("notifyTicketDestination");
    expect(destination).toContain("SUPPORT_NOTIFICATION_TIMEOUT_MS");
    expect(destination).toContain("sendEmail");
    expect(destination).toContain("sendSMSNotification");
    expect(destination).toContain("sendWhatsAppNotification");''',
)

# G) Update the support closure source assertions to the shared module.
path = "tests/support-operational-closure.test.ts"
replace_once(
    path,
    '''  const audit = source("lib/audit.ts");
  const properties = source(''',
    '''  const audit = source("lib/audit.ts");
  const destination = source("lib/support/ticket-destination.ts");
  const properties = source(''',
)
replace_once(
    path,
    '''  it("sends close and reply through existing channels and fails closed", () => {
    expect(actions).toContain("notifyTicketDestination");
    expect(actions).toContain("sendEmail");
    expect(actions).toContain("sendSMSNotification");
    expect(replyApi).toContain("sendEmail");
    expect(replyApi).toContain("EMAIL_PROVIDER_NOT_CONFIGURED");
    expect(replyApi).toContain("SMS_NOT_CONFIGURED");
    expect(replyApi).toContain("وجهة العميل غير موجودة.");
  });''',
    '''  it("sends close and reply through one bounded shared destination dispatcher", () => {
    expect(actions).toContain("notifyTicketDestination");
    expect(replyApi).toContain("notifyTicketDestination");
    expect(destination).toContain("sendEmail");
    expect(destination).toContain("sendSMSNotification");
    expect(destination).toContain("sendWhatsAppNotification");
    expect(destination).toContain("SUPPORT_NOTIFICATION_TIMEOUT_MS");
    expect(destination).toContain("EMAIL_PROVIDER_NOT_CONFIGURED");
    expect(destination).toContain("SMS_NOT_CONFIGURED");
    expect(destination).toContain("وجهة العميل غير موجودة.");
  });''',
)
