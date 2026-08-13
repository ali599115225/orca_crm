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


# 1) Paylink hub adapter: Paylink API amount/price are SAR major units.
path = "app/api/v1/installments/[id]/pay/route.ts"
replace_once(
    path,
    "          amount: payment.amountMinorUnits,",
    "          amount: payment.amountMinorUnits / 100,",
)
replace_once(
    path,
    "              price: payment.amountMinorUnits,",
    "              price: payment.amountMinorUnits / 100,",
)
replace_once(
    path,
    "        amountMinorUnits: Number(invoice.amount || 0),",
    "        amountMinorUnits: Math.round(Number(invoice.amount || 0) * 100),",
)
replace_once(
    path,
    '''      const invoice = (await response.json()) as Record<string, unknown>;
      return {
        providerReference: String(
          invoice.transactionNo || invoice.transaction_no || invoice.id || "",
        ),
        redirectUrl: String(
          invoice.url || invoice.payment_url || invoice.checkoutUrl || "",
        ),
        providerStatus: String(invoice.orderStatus || "initiated"),
        rawPayload: invoice,
      };''',
    '''      const invoice = (await response.json()) as Record<string, unknown>;
      const providerReference = String(
        invoice.transactionNo || invoice.transaction_no || invoice.id || "",
      ).trim();
      const redirectUrl = String(
        invoice.url || invoice.payment_url || invoice.checkoutUrl || "",
      ).trim();
      if (!providerReference || !redirectUrl) {
        throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
      }
      return {
        providerReference,
        redirectUrl,
        providerStatus: String(invoice.orderStatus || "initiated"),
        rawPayload: invoice,
      };''',
)

# 2) Legacy Paylink adapter is still registered; fix it too.
write(
    "lib/payments/providers/paylink.ts",
    '''// lib/payments/providers/paylink.ts — SERVER-ONLY
import "server-only";
import { randomUUID } from "node:crypto";
import type {
  PaymentCreateInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentVerificationResult,
} from "../types";

function getPaylinkSecret(): string {
  return process.env.PAYLINK_SECRET_KEY || "";
}

function getPaylinkBaseUrl(): string {
  return process.env.PAYLINK_BASE_URL || "https://restpilot.paylink.sa";
}

function generateIdempotencyKey(): string {
  return `orca-${randomUUID()}`;
}

export const paylinkProvider: PaymentProviderAdapter = {
  code: "PAYLINK",

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error("PAYLINK_SECRET_KEY not configured");

    const amountSar = input.amountMinorUnits / 100;
    const body = {
      amount: amountSar,
      currency: input.currency,
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: {
        planCode: input.planCode,
        tenantId: input.tenantId,
        ...input.metadata,
      },
    };

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paylink create invoice failed: ${text}`);
    }

    const invoice = await res.json();
    const providerReference = String(invoice.transactionNo || invoice.id || "").trim();
    const redirectUrl = String(invoice.url || invoice.payment_url || "").trim();
    if (!providerReference || !redirectUrl) {
      throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
    }

    return {
      providerReference,
      redirectUrl,
      providerStatus: "initiated",
      rawPayload: invoice,
    };
  },

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error("PAYLINK_SECRET_KEY not configured");

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice/${providerReference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      throw new Error(`Paylink verify failed: ${res.status}`);
    }

    const invoice = await res.json();
    const paid = invoice.orderStatus === "PAID" || invoice.status === "paid";
    return {
      paid,
      providerReference: invoice.transactionNo || invoice.id || providerReference,
      amountMinorUnits: Math.round(Number(invoice.amount || 0) * 100),
      currency: "SAR",
      providerStatus: invoice.orderStatus || invoice.status || "unknown",
      rawPayload: invoice,
    };
  },
};
''',
)

# 3) Manual payment: FAILED is retryable, with an atomic reclaim of the same unique row.
path = "app/api/v1/invoices/[id]/pay/route.ts"
replace_once(
    path,
    '''  if (
    transaction.status !== 'COMPLETED' ||
    !transaction.providerTransactionId
  ) {
    return { state: 'pending' as const };
  }''',
    '''  if (transaction.status === 'FAILED') {
    return { state: 'failed' as const, transactionId: transaction.id };
  }

  if (
    transaction.status !== 'COMPLETED' ||
    !transaction.providerTransactionId
  ) {
    return { state: 'pending' as const };
  }''',
)
replace_once(
    path,
    '''      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          tenantId,
          invoiceId: id,
          installmentId:
            unpaidInstallments.length === 1 ? unpaidInstallments[0].id : null,
          amount: invoiceAmount,
          netAmount: invoiceAmount,
          currency: 'SAR',
          method,
          status: 'PENDING',
          provider: MANUAL_PROVIDER,
          providerReference,
          idempotencyKey: providerReference,
          expectedAmountMinor: Math.round(invoiceAmount * 100),
          expectedCurrency: 'SAR',
        },
      });''',
    '''      const transactionData = {
        tenantId,
        invoiceId: id,
        installmentId:
          unpaidInstallments.length === 1 ? unpaidInstallments[0].id : null,
        amount: invoiceAmount,
        netAmount: invoiceAmount,
        currency: 'SAR',
        method,
        status: 'PENDING',
        provider: MANUAL_PROVIDER,
        providerReference,
        idempotencyKey: providerReference,
        expectedAmountMinor: Math.round(invoiceAmount * 100),
        expectedCurrency: 'SAR',
        failureReason: null,
        lastError: null,
      };

      let paymentTransaction;
      if (existing?.state === 'failed') {
        const claimed = await tx.paymentTransaction.updateMany({
          where: {
            id: existing.transactionId,
            tenantId,
            status: 'FAILED',
          },
          data: transactionData,
        });
        if (claimed.count !== 1) {
          throw new PaymentRouteError(
            ErrorCode.CONFLICT,
            409,
            'manual payment retry is already in progress'
          );
        }
        paymentTransaction = await tx.paymentTransaction.findUnique({
          where: { id: existing.transactionId },
        });
        if (!paymentTransaction) {
          throw new PaymentRouteError(
            ErrorCode.INTERNAL_ERROR,
            500,
            'manual payment retry transaction not found'
          );
        }
      } else {
        paymentTransaction = await tx.paymentTransaction.create({
          data: transactionData,
        });
      }''',
)
replace_once(
    path,
    '''    const completed = await completePaymentTransaction({
      transactionId: created.paymentTransaction.id,
      tenantId,
      amountMinorUnits: Math.round(created.invoiceAmount * 100),
      currency: 'SAR',
      providerStatus: 'MANUAL_CONFIRMED',
      actorId: session.userId,
      actorUserId: session.userId,
      correlationId,
    });''',
    '''    let completed;
    try {
      completed = await completePaymentTransaction({
        transactionId: created.paymentTransaction.id,
        tenantId,
        amountMinorUnits: Math.round(created.invoiceAmount * 100),
        currency: 'SAR',
        providerStatus: 'MANUAL_CONFIRMED',
        actorId: session.userId,
        actorUserId: session.userId,
        correlationId,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await prisma.paymentTransaction.updateMany({
        where: {
          id: created.paymentTransaction.id,
          tenantId,
          status: { not: 'COMPLETED' },
        },
        data: {
          status: 'FAILED',
          failureReason: reason.slice(0, 2000),
          lastError: reason.slice(0, 2000),
        },
      });
      throw error;
    }''',
)
replace_once(
    path,
    '''            where: {
              paymentPlanId,
              paymentStatus: { not: INSTALLMENT_STATUS.PAID },
            },''',
    '''            where: {
              paymentPlanId,
              tenantId,
              paymentStatus: {
                notIn: [INSTALLMENT_STATUS.PAID, INSTALLMENT_STATUS.CANCELLED],
              },
            },''',
)
replace_once(
    path,
    '''    const receipt =
      completed.receipt ||
      completed.payment.receipt || {
        id: created.paymentTransaction.id,
        receivedDate: new Date(),
      };''',
    '''    const receipt = completed.receipt || completed.payment.receipt;
    if (!receipt) {
      throw new PaymentRouteError(
        ErrorCode.INTERNAL_ERROR,
        500,
        'payment receipt was not created'
      );
    }''',
)

# 4) Admin alerts may not borrow tenant mail credentials.
path = "lib/email.ts"
regex_once(
    path,
    r'''export async function sendAdminEmailAlert\(\n  subject: string,\n  htmlContent: string,\n\) \{.*?\n\}\n\nexport interface SendEmailOptions''',
    '''export async function sendAdminEmailAlert(
  subject: string,
  htmlContent: string,
) {
  const recipients = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { success: false as const, code: EMAIL_PROVIDER_NOT_CONFIGURED };
  }

  console.warn("[Email] Platform admin alert blocked: platform email provider is not configured.", {
    recipientCount: recipients.length,
    subjectLength: subject.length,
    htmlLength: htmlContent.length,
  });
  return { success: false as const, code: EMAIL_PROVIDER_NOT_CONFIGURED };
}

export interface SendEmailOptions''',
)

# 5) Marketing stays fail-closed until real provider-specific remote adapters exist.
write(
    "lib/marketing/provider-adapter.ts",
    '''/**
 * Production marketing connectors are not implemented in this repository yet.
 * Registration stays intentionally empty so the orchestrator fails closed with
 * MARKETING_PROVIDER_NOT_REGISTERED and the channel becomes CONNECTOR_NOT_READY.
 */
export function registerProductionMarketingAdapters(): void {
  // Intentionally no-op until a real provider-specific remote adapter is implemented.
}
''',
)
path = "tests/marketing-campaign-actions.test.ts"
replace_once(
    path,
    '''  it("makes getMarketingProviderAdapter(META) resolve after production registration", () => {
    clearMarketingProviderRegistry();
    registerProductionMarketingAdapters();
    expect(getMarketingProviderAdapter("META").provider).toBe("META");
  });''',
    '''  it("keeps marketing commands fail-closed until a real production connector is registered", () => {
    clearMarketingProviderRegistry();
    registerProductionMarketingAdapters();
    expect(() => getMarketingProviderAdapter("META")).toThrow(
      "MARKETING_PROVIDER_NOT_REGISTERED",
    );
  });''',
)

# 6) Provider trust gates: static field presence must not set CONNECTED.
path = "lib/revenue-integrity/trust-gates.ts"
replace_once(
    path,
    '''    return { configured: true };
  }

  if (provider === "HYPERPAY") {''',
    '''    throw new Error("MOYASAR_LIVE_VERIFICATION_NOT_IMPLEMENTED");
  }

  if (provider === "HYPERPAY") {''',
)
replace_once(
    path,
    '''    return { configured: true };
  }

  if (provider === "PAYTABS") {''',
    '''    throw new Error("HYPERPAY_LIVE_VERIFICATION_NOT_IMPLEMENTED");
  }

  if (provider === "PAYTABS") {''',
)
replace_once(
    path,
    '''    return { configured: true };
  }

  if (provider === "ZATCA") {''',
    '''    throw new Error("PAYTABS_LIVE_VERIFICATION_NOT_IMPLEMENTED");
  }

  if (provider === "ZATCA") {''',
)
replace_once(
    path,
    '''    const healthUrl = baseUrl || providerValue(credentials, "healthUrl");
    const accessToken = providerValue(credentials, "accessToken");''',
    '''    const healthUrl = String(baseUrl || "").trim();
    const accessToken = providerValue(credentials, "accessToken");''',
)

# 7) EJAR authority remains connection.baseUrl only.
path = "lib/saudi-trust-gate/index.ts"
replace_once(
    path,
    "    let configuredUrl = String(connection.baseUrl ?? '').trim();",
    "    const configuredUrl = String(connection.baseUrl ?? '').trim();",
)
replace_once(
    path,
    '''      accessToken = String(credentials.accessToken ?? '').trim();
      if (!configuredUrl) {
        configuredUrl = String(credentials.healthUrl ?? credentials.baseUrl ?? '').trim();
      }''',
    '''      accessToken = String(credentials.accessToken ?? '').trim();''',
)
replace_once(
    path,
    "    if (!credentialValid(accessToken)) {",
    "    if (!configuredUrl || !credentialValid(accessToken)) {",
)
replace_once(
    path,
    "    if (production && /sandbox/i.test(configuredUrl)) {",
    "    if (production && /(sandbox|restpilot|uat|staging|test)/i.test(configuredUrl)) {",
)

# 8) Task completion is an atomic status transition before audit.
path = "app/api/v1/tasks/[id]/complete/route.ts"
replace_once(
    path,
    '''        const updatedTask = await prisma.task.update({
          where: { id: task.id, tenantId: session.tenantId },
          data: {
            status: "COMPLETED",
            updatedBy: session.userId,
            auditLog:
              `${task.auditLog || ""}\nTask completed at ${new Date().toISOString()}`.trim(),
          },
        });''',
    '''        const claimed = await prisma.task.updateMany({
          where: {
            id: task.id,
            tenantId: session.tenantId,
            status: { in: ["PENDING", "OVERDUE"] },
          },
          data: {
            status: "COMPLETED",
            updatedBy: session.userId,
            auditLog:
              `${task.auditLog || ""}\nTask completed at ${new Date().toISOString()}`.trim(),
          },
        });

        if (claimed.count !== 1) {
          return NextResponse.json(
            { success: false, error: "تم إكمال المهمة بواسطة طلب آخر." },
            { status: 409 },
          );
        }

        const updatedTask = await prisma.task.findFirst({
          where: { id: task.id, tenantId: session.tenantId },
        });
        if (!updatedTask) {
          return NextResponse.json(
            { success: false, error: "المهمة غير موجودة." },
            { status: 404 },
          );
        }''',
)
path = "tests/tasks-operational-closure.test.ts"
replace_once(
    path,
    '''    expect(completeApi).toContain(
      "where: { id: task.id, tenantId: session.tenantId }",
    );''',
    '''    expect(completeApi).toContain("prisma.task.updateMany");
    expect(completeApi).toContain('status: { in: ["PENDING", "OVERDUE"] }');''',
)

# 9) Cancel all competing offers that were themselves acceptance-eligible.
path = "lib/domain/transaction-spine/accept-offer.ts"
replace_once(
    path,
    "          status: OFFER_STATUS.PENDING,",
    '''          status: {
            in: [
              OFFER_STATUS.PENDING,
              OFFER_STATUS.SENT,
              OFFER_STATUS.NEGOTIATION,
            ],
          },''',
)

# 10) Listing/marketing readiness remains independent from transaction readiness.
path = "app/api/properties/route.ts"
replace_once(
    path,
    '''    readiness: {
      ...readiness,
      ready: transactionReady,
    },''',
    "    readiness,",
)
replace_once(
    path,
    "        marketingReady: rows.filter((row) => row.transactionReady).length,",
    "        marketingReady: rows.filter((row) => row.readiness.ready).length,",
)

# 11) Helpdesk: validate a supplied channel; notification after durable close is best-effort.
path = "app/actions/helpdesk.ts"
replace_once(
    path,
    '''    if (title.length < 3 || description.length < 5) {
      throw new Error("عنوان التذكرة وتفاصيلها مطلوبة.");
    }

    return await runWithTenantContext(''',
    '''    if (title.length < 3 || description.length < 5) {
      throw new Error("عنوان التذكرة وتفاصيلها مطلوبة.");
    }
    if (channel && !["EMAIL", "SMS", "WHATSAPP"].includes(channel)) {
      throw new Error("قناة التواصل غير صالحة.");
    }
    if (channel === "EMAIL" && !email) {
      throw new Error("البريد الإلكتروني مطلوب لقناة البريد.");
    }
    if ((channel === "SMS" || channel === "WHATSAPP") && !phone) {
      throw new Error("رقم الجوال مطلوب لقناة التواصل المحددة.");
    }

    return await runWithTenantContext(''',
)
replace_once(
    path,
    '''        if (status === "CLOSED") {
          await notifyTicketDestination({
            tenantId: session.tenantId,
            ticketId: ticket.id,
            subject: `Ticket closed: ${ticket.title}`,
            message: ticket.title,
          });
        }

        revalidatePath("/operations/helpdesk");
        return {
          success: true as const,
          ticket: serializeTicket(ticket),
        };''',
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
        }

        revalidatePath("/operations/helpdesk");
        return {
          success: true as const,
          ticket: serializeTicket(ticket),
          notificationError,
        };''',
)

# 12) SMS fails fast for no destination and bounds the provider request.
path = "lib/notifications.ts"
replace_once(
    path,
    '''  try {
    if (!SMS_API_KEY) {''',
    '''  try {
    if (!destinationPresent) {
      await persistOutboundSmsAttempt({
        ...context,
        destinationPresent,
        result: "SMS_DESTINATION_MISSING",
      });
      return { success: false, error: "SMS_DESTINATION_MISSING" };
    }

    if (!SMS_API_KEY) {''',
)
replace_once(
    path,
    '''        body: JSON.stringify({
          userName: process.env.MSEGAT_USERNAME,
          apiKey: SMS_API_KEY,
          userSender:
            process.env.MSEGAT_SENDER_NAME || "ORCA-CRM",
          numbers: to.replace("+", ""),
          msg: message,
        }),
      },''',
    '''        body: JSON.stringify({
          userName: process.env.MSEGAT_USERNAME,
          apiKey: SMS_API_KEY,
          userSender:
            process.env.MSEGAT_SENDER_NAME || "ORCA-CRM",
          numbers: to.replace("+", ""),
          msg: message,
        }),
        signal: AbortSignal.timeout(15_000),
      },''',
)

# Existing tests: update only expectations invalidated by the corrected contracts.
path = "tests/payment-providers.test.ts"
replace_once(
    path,
    "      amount: 299_00,\n      currency: 'SAR',\n      description: 'ORCA pro plan',",
    "      amount: 299,\n      currency: 'SAR',\n      description: 'ORCA pro plan',",
)
replace_once(
    path,
    "json: async () => ({ transactionNo: 'paylink-ref-1', orderStatus: 'PAID', amount: 299_00 }),",
    "json: async () => ({ transactionNo: 'paylink-ref-1', orderStatus: 'PAID', amount: 299 }),",
)

path = "tests/email-admin-alert.test.ts"
replace_once(
    path,
    '''  it("calls sendEmail when SUPER_ADMIN_EMAILS and a CONNECTED provider exist", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");
    prismaMocks.findFirst.mockResolvedValue({ tenantId: "tenant-1" });
    prismaMocks.findMany.mockResolvedValue([
      {
        tenantId: "tenant-1",
        provider: "RESEND",
        status: "CONNECTED",
        encryptedCredentials: "v1.iv.tag.body",
        isDefault: true,
      },
    ]);

    const result = await sendAdminEmailAlert("Subject", "<p>Alert</p>");

    expect(result.success).toBe(true);
    expect(prismaMocks.send).toHaveBeenCalled();
  });''',
    '''  it("fails closed instead of borrowing a tenant provider for platform admin alerts", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");

    const result = await sendAdminEmailAlert("Subject", "<p>Alert</p>");

    expect(result.success).toBe(false);
    expect(prismaMocks.findFirst).not.toHaveBeenCalled();
    expect(prismaMocks.send).not.toHaveBeenCalled();
  });''',
)

path = "tests/dedicated-helpdesk.test.ts"
replace_once(
    path,
    '''  it("close fails closed when destination is missing", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue({ details: "{}" });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(false);
    expect(String((result as { error?: string }).error)).toContain("وجهة العميل");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });''',
    '''  it("keeps a durable close successful when a legacy ticket has no destination", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue({ details: "{}" });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(true);
    expect(String((result as { notificationError?: string }).notificationError)).toContain("وجهة العميل");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });''',
)
replace_once(
    path,
    '''  it("returns channel config error instead of silent success", async () => {
    mockSendEmail.mockResolvedValue({
      success: false,
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(false);
    expect(String((result as { error?: string }).error)).toContain(
      "EMAIL_PROVIDER_NOT_CONFIGURED",
    );
  });''',
    '''  it("returns notification warning without rolling back a durable close", async () => {
    mockSendEmail.mockResolvedValue({
      success: false,
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(true);
    expect(String((result as { notificationError?: string }).notificationError)).toContain(
      "EMAIL_PROVIDER_NOT_CONFIGURED",
    );
  });''',
)

# Focused guard suite for cross-cutting R1 contracts.
write(
    "tests/postclosure-r1-remediation.test.ts",
    '''import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("post-closure R1 remediation contracts", () => {
  it("uses SAR major units for Paylink and converts verified amounts back to minor units", () => {
    const hub = source("app/api/v1/installments/[id]/pay/route.ts");
    const legacy = source("lib/payments/providers/paylink.ts");
    for (const text of [hub, legacy]) {
      expect(text).toContain("amountMinorUnits / 100");
      expect(text).toContain("Math.round(Number(invoice.amount || 0) * 100)");
    }
    expect(hub).toContain("PAYLINK_CREATE_RESPONSE_INVALID");
    expect(legacy).toContain("PAYLINK_CREATE_RESPONSE_INVALID");
  });

  it("recovers failed manual-payment idempotency records instead of pinning them pending", () => {
    const route = source("app/api/v1/invoices/[id]/pay/route.ts");
    expect(route).toContain("state: 'failed' as const");
    expect(route).toContain("manual payment retry is already in progress");
    expect(route).toContain("payment receipt was not created");
  });

  it("keeps platform admin email fail-closed without tenant credential borrowing", () => {
    const email = source("lib/email.ts");
    const fn = email.slice(
      email.indexOf("export async function sendAdminEmailAlert"),
      email.indexOf("export interface SendEmailOptions"),
    );
    expect(fn).not.toContain("revenueProviderConnection.findFirst");
    expect(fn).not.toContain("sendEmail({");
    expect(fn).toContain("Platform admin alert blocked");
  });

  it("keeps marketing commands fail-closed until real remote adapters exist", () => {
    const adapter = source("lib/marketing/provider-adapter.ts");
    expect(adapter).not.toContain("snapshot(");
    expect(adapter).not.toContain('"ACTIVE"');
    expect(adapter).toContain("Intentionally no-op");
  });

  it("does not mark unverified payment-provider credentials connected", () => {
    const trust = source("lib/revenue-integrity/trust-gates.ts");
    expect(trust).toContain("MOYASAR_LIVE_VERIFICATION_NOT_IMPLEMENTED");
    expect(trust).toContain("HYPERPAY_LIVE_VERIFICATION_NOT_IMPLEMENTED");
    expect(trust).toContain("PAYTABS_LIVE_VERIFICATION_NOT_IMPLEMENTED");
  });

  it("keeps EJAR on connection.baseUrl authority only", () => {
    const gate = source("lib/saudi-trust-gate/index.ts");
    const ejar = gate.slice(
      gate.indexOf("Ejar credentials from CONNECTED hub"),
      gate.indexOf("FK: contractId belongs"),
    );
    expect(ejar).toContain("connection.baseUrl");
    expect(ejar).not.toContain("credentials.healthUrl");
    expect(ejar).not.toContain("credentials.baseUrl");
  });

  it("uses an atomic task completion transition", () => {
    const task = source("app/api/v1/tasks/[id]/complete/route.ts");
    expect(task).toContain("prisma.task.updateMany");
    expect(task).toContain('status: { in: ["PENDING", "OVERDUE"] }');
    expect(task).toContain("claimed.count !== 1");
  });

  it("cancels every competing offer that was acceptance-eligible", () => {
    const offer = source("lib/domain/transaction-spine/accept-offer.ts");
    expect(offer).toContain("OFFER_STATUS.SENT");
    expect(offer).toContain("OFFER_STATUS.NEGOTIATION");
  });

  it("keeps marketing readiness independent from transaction readiness", () => {
    const properties = source("app/api/properties/route.ts");
    expect(properties).toContain("readiness,");
    expect(properties).toContain("row.readiness.ready");
    expect(properties).toContain("row.transactionReady");
  });

  it("keeps helpdesk close durable when outbound notification fails", () => {
    const helpdesk = source("app/actions/helpdesk.ts");
    expect(helpdesk).toContain("TICKET_NOTIFICATION_FAILED");
    expect(helpdesk).toContain("notificationError");
    expect(helpdesk).toContain("قناة التواصل غير صالحة");
  });
});
''',
)
