import { readFileSync } from "node:fs";
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
