import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

const GATE = read("docs", "product-extension", "RENT_FLEX_12_P3_UI_GATE.md");
const PROPERTY_PAGE = read("app", "operations", "properties", "page.tsx");
const LEASE_PAGE = read("app", "operations", "rental", "leases", "page.tsx");
const PROPERTY_PANEL = read(
  "components",
  "rent-flex",
  "RentFlexPropertyAvailabilityPanel.tsx",
);
const LEASE_PANEL = read(
  "components",
  "rent-flex",
  "RentFlexLeaseWorkspacePanel.tsx",
);

describe("RF12-P3 contextual property and lease UI", () => {
  it("extends the existing Properties and Rental/Leases surfaces without a new navigation silo", () => {
    expect(PROPERTY_PAGE).toContain("RentFlexPropertyAvailabilityPanel");
    expect(PROPERTY_PAGE).toContain("<PropertiesWorkspace canWrite={canWrite} />");
    expect(LEASE_PAGE).toContain("RentFlexLeaseWorkspacePanel");
    expect(LEASE_PAGE).toContain('<ContractsPaymentsCenter defaultPane="leases" />');
    expect(GATE).toContain("does not add a new Rent Flex navigation silo");
  });

  it("keeps both add-ons dark when the guarded read boundary is unavailable", () => {
    expect(PROPERTY_PANEL).toContain("response.status === 404");
    expect(PROPERTY_PANEL).toContain("setFeatureAvailable(false)");
    expect(PROPERTY_PANEL).toContain("if (featureAvailable === false) return null");
    expect(LEASE_PANEL).toContain("selectionResponse.status === 404");
    expect(LEASE_PANEL).toContain("setFeatureAvailable(false)");
    expect(LEASE_PANEL).toContain("if (featureAvailable === false) return null");
    expect(GATE).toContain("the add-on renders nothing and the existing page remains unchanged");
  });

  it("labels property availability without implying tenant eligibility or provider approval", () => {
    expect(PROPERTY_PANEL).toContain("الدفع المرن متاح");
    expect(PROPERTY_PANEL).toContain("لا تعني الأهلية أو القبول لدى أي مزود");
    expect(PROPERTY_PANEL).toContain("externalRnplEnabled");
    expect(PROPERTY_PANEL).toContain('config.status === "ACTIVE"');
    expect(GATE).toContain("is **not** tenant eligibility or provider approval");
  });

  it("uses the verified direct-monthly calculator instead of duplicating installment math", () => {
    expect(LEASE_PANEL).toContain("buildDirectMonthlyEjarPlan");
    expect(LEASE_PANEL).toContain("directPlan.schedule.map");
    expect(LEASE_PANEL).not.toContain("Math.floor(Number(annualRent) / 12)");
    expect(GATE).toContain("verified `buildDirectMonthlyEjarPlan` calculator");
  });

  it("keeps direct monthly company receivables distinct from external provider repayments", () => {
    expect(LEASE_PANEL).toContain("استحقاقًا لصالح المؤجر/الشركة");
    expect(LEASE_PANEL).toContain("سداد خارجي لمزود");
    expect(LEASE_PANEL).toContain("أقساط المستأجر للمزود تظل خارج ذمم ORCA");
    expect(GATE).toContain("external-provider repayments into ORCA receivables");
  });

  it("supports pre-lease selection, provider-offer choice, and lock through RF12-P2 only", () => {
    expect(LEASE_PANEL).toContain('fetch("/api/v1/rent-flex/selections"');
    expect(LEASE_PANEL).toContain("/select-offer");
    expect(LEASE_PANEL).toContain("/lock");
    expect(PROPERTY_PANEL).toContain("/api/v1/rent-flex/units/");
    expect(PROPERTY_PANEL).toContain('method: "PUT"');
    expect(GATE).toContain("create a pre-lease Rent Flex selection");
    expect(GATE).toContain("choose a provider offer");
    expect(GATE).toContain("lock the payment choice");
  });

  it("does not expose lease binding before the RF12-P4 accounting guard", () => {
    expect(LEASE_PANEL).not.toMatch(/rent-flex\/selections\/\$\{[^}]+\}\/lease/);
    expect(LEASE_PANEL).toContain("ربط خيار الدفع بعقد الإيجار الفعلي يبقى خارج هذه الدفعة");
    expect(GATE).toContain("RF12-P3 does **not** call the lease-binding endpoint");
    expect(GATE).toContain("RF12-P4 — Legacy Accounting Guard + Lease Binding");
  });

  it("distinguishes a provider offer from recorded provider approval", () => {
    expect(LEASE_PANEL).toContain("عرض مزود");
    expect(LEASE_PANEL).toContain("موافقة مزود مثبتة");
    expect(LEASE_PANEL).toContain("ليست موافقة مثبتة");
    expect(LEASE_PANEL).toContain('authorityStatus).toUpperCase() === "APPROVED"');
    expect(GATE).toContain("does not treat an offer as an approval");
  });

  it("renders human labels for unit and lease identity instead of technical IDs", () => {
    expect(LEASE_PANEL).toContain("unitLabel(selection.unitId)");
    expect(LEASE_PANEL).toContain("leaseLabel(selection.rentalLeaseId)");
    expect(LEASE_PANEL).toContain("unit.unitNumber");
    expect(LEASE_PANEL).toContain("lease.tenant");
    expect(GATE).toContain("no visible technical UUIDs");
  });

  it("introduces no provider-network, accounting, migration, or deployment operation", () => {
    const combined = [PROPERTY_PANEL, LEASE_PANEL].join("\n");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("open-banking");
    expect(combined).not.toContain("credit-bureau");
    expect(combined).not.toContain("prisma");
    expect(combined).not.toContain("/api/accounting/settle-lease");
    expect(combined).not.toContain("/api/v1/invoices/");
    expect(combined).not.toContain("/api/v1/payments/");
    expect(GATE).toContain("RF12-P3 performs no lease binding");
    expect(GATE).toContain("- provider API call;");
    expect(GATE).toContain("- ledger or journal posting;");
  });
});
