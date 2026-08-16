import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRentFlexDirectInvoiceDrafts,
  RentFlexP4Error,
} from "@/lib/domain/rental/rent-flex-12-accounting-contract";
import { buildDirectMonthlyEjarPlan } from "@/lib/domain/rental/rent-flex-12";
import { digestRentFlexSchedule } from "@/lib/domain/rental/rent-flex-12-persistence-contract";

const ROOT = process.cwd();
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");
const G4_ROUTE_EVIDENCE = "/api/v1/rent-flex/selections/[id]/activate-direct-invoices";

const SERVICE = read("lib", "domain", "rental", "rent-flex-12-accounting-service.ts");
const FACADE = read("lib", "domain", "rental", "rent-flex-12-accounting-facade.ts");
const CONTRACT = read("lib", "domain", "rental", "rent-flex-12-accounting-contract.ts");
const BOUNDARY = read("lib", "domain", "rental", "rent-flex-12-api-boundary.ts");
const ROUTE = read(
  "app",
  "api",
  "v1",
  "rent-flex",
  "selections",
  "[id]",
  "activate-direct-invoices",
  "route.ts",
);
const LEGACY_SETTLE = read("app", "api", "accounting", "settle-lease", "route.ts");
const P4_SCHEMA = read("prisma", "rent-flex-12-accounting.prisma");
const P1_SCHEMA = read("prisma", "rent-flex-12.prisma");
const GATE = read("docs", "product-extension", "RENT_FLEX_12_P4_ACCOUNTING_GATE.md");

function directFixture() {
  const annualRentSar = 100_000.01;
  const firstDueDate = "2027-01-31";
  const plan = buildDirectMonthlyEjarPlan({ annualRentSar, firstDueDate });
  const scheduleDigest = digestRentFlexSchedule(
    "DIRECT_MONTHLY_EJAR",
    annualRentSar,
    firstDueDate,
    plan.schedule,
  );
  return { annualRentSar, firstDueDate, plan, scheduleDigest };
}

describe("RF12-P4 accounting guard and direct schedule activation", () => {
  it("builds exactly 12 invoice drafts from the locked deterministic company schedule", () => {
    const fixture = directFixture();
    const drafts = buildRentFlexDirectInvoiceDrafts({
      mode: "DIRECT_MONTHLY_EJAR",
      status: "LOCKED",
      annualRentAmount: fixture.annualRentSar,
      firstDueDate: fixture.firstDueDate,
      companyScheduleJson: fixture.plan.schedule,
      scheduleDigest: fixture.scheduleDigest,
      vatType: "STANDARD",
      storedVatRate: 15,
    });

    expect(drafts).toHaveLength(12);
    expect(drafts.map((draft) => draft.installmentNumber)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(drafts.map((draft) => draft.dueDate)).toEqual(
      fixture.plan.schedule.map((item) => item.dueDate),
    );
    expect(
      drafts.reduce((sum, draft) => sum + Math.round(draft.subtotal * 100), 0),
    ).toBe(Math.round(fixture.annualRentSar * 100));
    for (const draft of drafts) {
      expect(draft.vatAmount).toBe(Math.round(draft.subtotal * 15) / 100);
      expect(draft.totalAmount).toBe(
        Math.round((draft.subtotal + draft.vatAmount) * 100) / 100,
      );
    }
  });

  it("uses the existing rental VAT engine and fails closed on VAT contract mismatch", () => {
    const fixture = directFixture();
    const zeroRated = buildRentFlexDirectInvoiceDrafts({
      mode: "DIRECT_MONTHLY_EJAR",
      status: "LOCKED",
      annualRentAmount: fixture.annualRentSar,
      firstDueDate: fixture.firstDueDate,
      companyScheduleJson: fixture.plan.schedule,
      scheduleDigest: fixture.scheduleDigest,
      vatType: "ZERO_RATED",
      storedVatRate: 0,
    });
    expect(zeroRated.every((draft) => draft.vatRate === 0 && draft.vatAmount === 0)).toBe(true);
    expect(CONTRACT).toContain('import { calculateVat } from "@/lib/vat/engine"');

    expect(() =>
      buildRentFlexDirectInvoiceDrafts({
        mode: "DIRECT_MONTHLY_EJAR",
        status: "LOCKED",
        annualRentAmount: fixture.annualRentSar,
        firstDueDate: fixture.firstDueDate,
        companyScheduleJson: fixture.plan.schedule,
        scheduleDigest: fixture.scheduleDigest,
        vatType: "STANDARD",
        storedVatRate: 0,
      }),
    ).toThrowError(
      new RentFlexP4Error("RENT_FLEX_P4_LEASE_VAT_CONTRACT_MISMATCH"),
    );
  });

  it("fails closed on tampering, external mode, or an unlocked selection", () => {
    const fixture = directFixture();
    const tampered = fixture.plan.schedule.map((item, index) =>
      index === 0 ? { ...item, amountSar: item.amountSar + 1 } : item,
    );

    expect(() =>
      buildRentFlexDirectInvoiceDrafts({
        mode: "DIRECT_MONTHLY_EJAR",
        status: "LOCKED",
        annualRentAmount: fixture.annualRentSar,
        firstDueDate: fixture.firstDueDate,
        companyScheduleJson: tampered,
        scheduleDigest: fixture.scheduleDigest,
        vatType: "STANDARD",
        storedVatRate: 15,
      }),
    ).toThrowError(new RentFlexP4Error("RENT_FLEX_P4_SCHEDULE_DIGEST_MISMATCH"));

    expect(() =>
      buildRentFlexDirectInvoiceDrafts({
        mode: "EXTERNAL_RNPL_12",
        status: "LOCKED",
        annualRentAmount: fixture.annualRentSar,
        firstDueDate: fixture.firstDueDate,
        companyScheduleJson: fixture.plan.schedule,
        scheduleDigest: fixture.scheduleDigest,
        vatType: "STANDARD",
        storedVatRate: 15,
      }),
    ).toThrowError(new RentFlexP4Error("RENT_FLEX_P4_DIRECT_MODE_REQUIRED"));

    expect(() =>
      buildRentFlexDirectInvoiceDrafts({
        mode: "DIRECT_MONTHLY_EJAR",
        status: "SELECTED",
        annualRentAmount: fixture.annualRentSar,
        firstDueDate: fixture.firstDueDate,
        companyScheduleJson: fixture.plan.schedule,
        scheduleDigest: fixture.scheduleDigest,
        vatType: "STANDARD",
        storedVatRate: 15,
      }),
    ).toThrowError(new RentFlexP4Error("RENT_FLEX_P4_LOCKED_SELECTION_REQUIRED"));
  });

  it("adds an isolated tenant-bound idempotency mapping without rewriting P1 persistence", () => {
    expect(P4_SCHEMA).toContain("model RentFlexDirectInvoiceLink {");
    expect(P4_SCHEMA).toContain(
      '@@unique([tenantId, rentFlexSelectionId, installmentNumber], map: "uq_rf12_direct_invoice_link_selection_period")',
    );
    expect(P4_SCHEMA).toContain(
      '@@unique([tenantId, invoiceId], map: "uq_rf12_direct_invoice_link_invoice")',
    );
    expect(P4_SCHEMA).toContain(
      '@@index([tenantId, rentalLeaseId], map: "idx_rf12_direct_invoice_link_lease")',
    );
    expect(P1_SCHEMA).not.toContain("RentFlexDirectInvoiceLink");
    expect(P1_SCHEMA).not.toContain("Invoice");
  });

  it("guards legacy settle-lease before any legacy accounting side effect", () => {
    const guardIndex = LEGACY_SETTLE.indexOf("findRentFlexLeaseAccountingGuard(");
    const subtotalIndex = LEGACY_SETTLE.indexOf("const subtotal = finiteMoney");
    const seedIndex = LEGACY_SETTLE.indexOf("await seedChartOfAccounts");
    const invoiceIndex = LEGACY_SETTLE.indexOf("tx.invoice.create(");

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(LEGACY_SETTLE).toContain("RENT_FLEX_LEGACY_SETTLEMENT_BLOCKED");
    expect(LEGACY_SETTLE).toContain("ErrorCode.CONFLICT");
    expect(guardIndex).toBeLessThan(subtotalIndex);
    expect(guardIndex).toBeLessThan(seedIndex);
    expect(guardIndex).toBeLessThan(invoiceIndex);
    expect(SERVICE).toContain('process.env.ORCA_RENT_FLEX_12_SCHEMA_READY !== "true"');
  });

  it("activates only direct locked schedules inside a serializable idempotent transaction", () => {
    expect(SERVICE).toContain('selection.mode !== DIRECT_MODE');
    expect(SERVICE).toContain('selection.status !== LOCKED_STATUS');
    expect(SERVICE).toContain("companyScheduleJson: selection.companyScheduleJson");
    expect(SERVICE).toContain("scheduleDigest: selection.scheduleDigest");
    expect(SERVICE).toContain("vatType: lease.vatType");
    expect(SERVICE).toContain("storedVatRate: Number(lease.vatRate)");
    expect(SERVICE).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(SERVICE).toContain("nextInvoiceNumber: { increment: DIRECT_INVOICE_COUNT }");
    expect(SERVICE).toContain("await tx.invoice.create({");
    expect(SERVICE).toContain("await postInvoiceEntry(");
    expect(SERVICE).toContain("await tx.rentFlexDirectInvoiceLink.create({");
    expect(SERVICE).toContain('code !== "P2002" && code !== "P2034"');
    expect(SERVICE).toContain("RENT_FLEX_DIRECT_SCHEDULE_ACTIVATED");
  });

  it("inherits the current local rental QR invoice contract without provider submission", () => {
    expect(SERVICE).toContain('from "@/lib/zatca/qr"');
    expect(SERVICE).toContain("buildQrPayload({");
    expect(SERVICE).toContain("encodeQrCode(payload)");
    expect(SERVICE).toContain("await generateQrImage(qrCode)");
    expect(SERVICE).toContain("qrPayload: artifact.qrPayload");
    expect(SERVICE).toContain("qrCode: artifact.qrCode");
    expect(SERVICE).toContain("qrImage: artifact.qrImage");
    expect(SERVICE).not.toContain("publicHttpsJsonRequest");
    expect(SERVICE).not.toContain("ZATCA_SUBMIT_INVOICE");
  });

  it("keeps external RNPL repayments and legacy payment-plan domains out of P4 invoicing", () => {
    expect(SERVICE).not.toContain("repaymentScheduleJson");
    expect(SERVICE).not.toContain("rentFlexOfferTerms");
    expect(SERVICE).not.toMatch(/\bpaymentPlan\.(?:create|update|delete|upsert)/);
    expect(SERVICE).not.toMatch(/\binstallment\.(?:create|update|delete|upsert)/);
    expect(SERVICE).not.toMatch(/\bpaymentTransaction\.(?:create|update|delete|upsert)/);
    expect(SERVICE).not.toContain("fetch(");
    expect(GATE).toContain("`EXTERNAL_RNPL_12` is rejected");
  });

  it("keeps financial activation ADMIN-only and behind a separate dark feature gate", () => {
    expect(FACADE).toContain("ACCOUNTING_WRITE_ROLES");
    expect(FACADE).toContain("hasDatabaseRole(accountingSession, ACCOUNTING_WRITE_ROLES)");
    expect(FACADE).toContain('authorizeW1eActor(session, "finance-case.transition")');
    expect(BOUNDARY).toContain(
      'process.env.ORCA_RENT_FLEX_12_DIRECT_INVOICING_ENABLED === "true"',
    );
    expect(BOUNDARY).toContain("isRentFlex12LeaseBindingApiEnabled()");
    expect(BOUNDARY).toContain("beginRentFlex12DirectInvoicingRequest");
    expect(GATE).toContain("RF12-P4 does not set any of these flags");
  });

  it("exposes one facade-only G4-evidenced direct activation route", () => {
    expect(G4_ROUTE_EVIDENCE).toBe(
      "/api/v1/rent-flex/selections/[id]/activate-direct-invoices",
    );
    expect(GATE).toContain(
      "POST /api/v1/rent-flex/selections/:id/activate-direct-invoices",
    );
    expect(ROUTE).toContain("beginRentFlex12DirectInvoicingRequest");
    expect(ROUTE).toContain("rf12ActivateDirectInvoices");
    expect(ROUTE).toContain("requiredRentFlexUuidValue");
    expect(ROUTE).toContain('"Cache-Control": "no-store"');
    expect(ROUTE).not.toContain("@/lib/prisma");
    expect(ROUTE).not.toContain("rent-flex-12-accounting-service");
    expect(ROUTE).not.toMatch(/\bprisma\./);
  });

  it("documents that schema rollout and production operations remain separate", () => {
    expect(GATE).toContain("migration generation");
    expect(GATE).toContain("migration application");
    expect(GATE).toContain("`prisma db push`");
    expect(GATE).toContain("environment/feature-flag mutation");
    expect(GATE).toContain("deploy");
    expect(GATE).toContain("production action");
  });
});
