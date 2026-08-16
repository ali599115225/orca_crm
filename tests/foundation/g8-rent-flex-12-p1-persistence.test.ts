import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  RentFlexP1Error,
  assertRentFlexCommandContext,
  assertRentFlexSettlementAmounts,
  digestRentFlexSchedule,
  isRentFlexSelectionTransitionAllowed,
  isRentFlexSettlementTransitionAllowed,
  parseRentFlexDateOnly,
  parseRentFlexScheduleJson,
} from "@/lib/domain/rental/rent-flex-12-persistence-contract";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("RF12-P1 persistence contract", () => {
  it("fails closed when tenant or actor context does not match", () => {
    expect(() =>
      assertRentFlexCommandContext(
        { tenantId: "tenant-a", userId: "actor-a" },
        "tenant-b",
        "actor-a",
      ),
    ).toThrowError(new RentFlexP1Error("RENT_FLEX_P1_TENANT_CONTEXT_MISMATCH"));

    expect(() =>
      assertRentFlexCommandContext(
        { tenantId: "tenant-a", userId: "actor-a" },
        "tenant-a",
        "actor-b",
      ),
    ).toThrowError(new RentFlexP1Error("RENT_FLEX_P1_ACTOR_CONTEXT_MISMATCH"));

    expect(() =>
      assertRentFlexCommandContext(
        { tenantId: "tenant-a", userId: "actor-a" },
        "tenant-a",
        "actor-a",
      ),
    ).not.toThrow();
  });

  it("permits only the frozen selection lifecycle", () => {
    expect(isRentFlexSelectionTransitionAllowed("DRAFT", "SELECTED")).toBe(true);
    expect(isRentFlexSelectionTransitionAllowed("SELECTED", "LOCKED")).toBe(true);
    expect(isRentFlexSelectionTransitionAllowed("SELECTED", "CANCELLED")).toBe(true);
    expect(isRentFlexSelectionTransitionAllowed("LOCKED", "SELECTED")).toBe(false);
    expect(isRentFlexSelectionTransitionAllowed("CANCELLED", "DRAFT")).toBe(false);
  });

  it("allows failed settlement recovery without discarding partial receipt evidence", () => {
    expect(isRentFlexSettlementTransitionAllowed("EXPECTED", "FAILED")).toBe(true);
    expect(isRentFlexSettlementTransitionAllowed("FAILED", "EXPECTED")).toBe(true);
    expect(isRentFlexSettlementTransitionAllowed("FAILED", "PARTIAL")).toBe(true);
    expect(isRentFlexSettlementTransitionAllowed("FAILED", "RECEIVED")).toBe(true);
    expect(isRentFlexSettlementTransitionAllowed("PARTIAL", "FAILED")).toBe(false);
    expect(isRentFlexSettlementTransitionAllowed("PARTIAL", "CANCELLED")).toBe(false);
    expect(isRentFlexSettlementTransitionAllowed("PARTIAL", "RECEIVED")).toBe(true);
    expect(isRentFlexSettlementTransitionAllowed("RECEIVED", "PARTIAL")).toBe(false);
    expect(isRentFlexSettlementTransitionAllowed("CANCELLED", "EXPECTED")).toBe(false);
  });

  it("validates settlement amount semantics", () => {
    expect(
      assertRentFlexSettlementAmounts({
        expectedAmount: 75_000,
        receivedAmount: 25_000,
        status: "PARTIAL",
      }),
    ).toEqual({ expectedAmount: 75_000, receivedAmount: 25_000 });

    expect(
      assertRentFlexSettlementAmounts({
        expectedAmount: 75_000,
        receivedAmount: null,
        status: "FAILED",
      }),
    ).toEqual({ expectedAmount: 75_000, receivedAmount: null });

    expect(() =>
      assertRentFlexSettlementAmounts({
        expectedAmount: 75_000,
        receivedAmount: 1,
        status: "FAILED",
      }),
    ).toThrowError(
      new RentFlexP1Error("RENT_FLEX_P1_NONPAYMENT_STATUS_MUST_NOT_CARRY_RECEIPT"),
    );

    expect(() =>
      assertRentFlexSettlementAmounts({
        expectedAmount: 75_000,
        receivedAmount: 75_001,
        status: "RECEIVED",
      }),
    ).toThrow(RentFlexP1Error);

    expect(() =>
      assertRentFlexSettlementAmounts({
        expectedAmount: 75_000,
        receivedAmount: 74_999,
        status: "RECEIVED",
      }),
    ).toThrowError(
      new RentFlexP1Error("RENT_FLEX_P1_RECEIVED_SETTLEMENT_MUST_EQUAL_EXPECTED"),
    );
  });

  it("uses strict date-only parsing and deterministic schedule digests", () => {
    expect(parseRentFlexDateOnly("2026-09-30").toISOString().slice(0, 10)).toBe(
      "2026-09-30",
    );
    expect(() => parseRentFlexDateOnly("2026-02-30")).toThrow(RentFlexP1Error);

    const schedule = Array.from({ length: 12 }, (_, index) => ({
      installmentNumber: index + 1,
      dueDate: `2026-${String(index + 1).padStart(2, "0")}-01`,
      amountSar: 1000,
    }));
    expect(parseRentFlexScheduleJson(schedule)).toEqual(schedule);
    expect(() =>
      parseRentFlexScheduleJson([
        ...schedule.slice(0, 11),
        { ...schedule[11], installmentNumber: 99 },
      ]),
    ).toThrowError(new RentFlexP1Error("RENT_FLEX_P1_SCHEDULE_SHAPE_INVALID"));

    const first = digestRentFlexSchedule(
      "DIRECT_MONTHLY_EJAR",
      12_000,
      "2026-01-01",
      schedule,
    );
    const second = digestRentFlexSchedule(
      "DIRECT_MONTHLY_EJAR",
      12_000,
      "2026-01-01",
      schedule,
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });

  it("defines the additive schema with unique tenant-bound operational identities", () => {
    const schema = source("prisma/rent-flex-12.prisma");
    for (const model of [
      "RentFlexUnitConfig",
      "RentFlexSelection",
      "RentFlexOfferTerms",
      "RentFlexSettlement",
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
    expect(schema).toContain(
      '@@unique([tenantId, unitId], map: "uq_rent_flex_unit_configs_tenant_unit")',
    );
    expect(schema).toContain(
      '@@unique([tenantId, financeCaseId], map: "uq_rent_flex_selections_tenant_finance_case")',
    );
    expect(schema).toContain(
      '@@unique([tenantId, financeProviderOfferId], map: "uq_rent_flex_offer_terms_tenant_offer")',
    );
    expect(schema).not.toContain("model RentFlexProviderOffer");
    expect(schema).not.toContain("PaymentPlan");
    expect(schema).not.toContain("Installment");
    expect(schema).not.toContain("Invoice");
  });

  it("keeps provider selection atomic with W1 inside the Rent Flex transaction", () => {
    const service = source("lib/domain/rental/rent-flex-12-service.ts");
    const providerService = source(
      "lib/domain/contract-finance/provider-offer-service.ts",
    );
    expect(providerService).toContain(
      "export async function selectProviderOfferInTransaction",
    );
    expect(service).toContain("selectProviderOfferInTransaction(");
    expect(service).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(service).not.toContain("await selectProviderOffer(");
  });

  it("enforces unit configuration, FinanceCase uniqueness, and late lease synchronization", () => {
    const service = source("lib/domain/rental/rent-flex-12-service.ts");
    expect(service).toContain("RENT_FLEX_P1_EXTERNAL_RNPL_NOT_ENABLED_FOR_UNIT");
    expect(service).toContain("externalRnplEnabled: true");
    expect(service).toContain("RENT_FLEX_P1_FINANCE_CASE_ALREADY_BOUND_TO_SELECTION");
    expect(service).toContain("tx.rentFlexSettlement.updateMany(");
    expect(service).toContain("rentalLeaseId: lease.id");
  });

  it("normalizes direct-selection date errors at the RF12-P1 command boundary", () => {
    const service = source("lib/domain/rental/rent-flex-12-service.ts");
    const parseIndex = service.indexOf(
      "const firstDueDate = parseRentFlexDateOnly(input.firstDueDate);",
      service.indexOf("function createDirectMonthlySelection"),
    );
    const buildIndex = service.indexOf(
      "const plan = buildDirectMonthlyEjarPlan({",
      service.indexOf("function createDirectMonthlySelection"),
    );
    expect(parseIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(parseIndex);
  });

  it("defines receivedAt as final-settlement time rather than partial-receipt time", () => {
    const service = source("lib/domain/rental/rent-flex-12-service.ts");
    const schema = source("prisma/rent-flex-12.prisma");
    expect(service).toContain(
      "`receivedAt` means the timestamp at which the full expected owner/company",
    );
    expect(service).toContain('input.status === "RECEIVED"');
    expect(schema).toContain(
      "Timestamp at which the full expected settlement was received; partial receipts keep this null.",
    );
  });

  it("keeps all RF12-P1 commands tenant-guarded, audited, integrity-checked, and non-accounting", () => {
    const service = source("lib/domain/rental/rent-flex-12-service.ts");
    for (const command of [
      "configureRentFlexForUnit",
      "createDirectMonthlySelection",
      "createExternalRnplSelection",
      "attachExternalFinanceCase",
      "attachExternalOfferTerms",
      "selectExternalRnplOffer",
      "attachRentFlexSelectionToLease",
      "lockRentFlexSelection",
      "recordRentFlexSettlement",
    ]) {
      expect(service).toContain(`function ${command}`);
    }
    expect(service).toContain("requireTenantContext()");
    expect(service).toContain("db.auditLog.create(");
    expect(service).toContain("parseRentFlexScheduleJson(");
    expect(service).not.toContain("tx.invoice.create(");
    expect(service).not.toContain("tx.paymentTransaction.create(");
    expect(service).not.toContain("postInvoiceEntry(");
    expect(service).not.toContain("fetch(");
  });
});
