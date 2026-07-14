import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("four operational pages", () => {
  it("removes generated marketing and campaign data", () => {
    const marketing = read("components/views/MarketingView.tsx");
    const campaigns = read("components/views/CampaignsView.tsx");
    const workspace = read(
      "components/marketing/MarketingPerformanceWorkspace.tsx",
    );

    expect(marketing).not.toContain("RAW_PLATFORMS");
    expect(marketing).not.toContain("RAW_CAMPAIGNS");
    expect(campaigns).not.toContain("RAW_CAMPAIGNS");
    expect(workspace).not.toContain("Math.random");
    expect(workspace).toContain("getMarketingOverviewAction");
  });

  it("uses tenant-scoped operational marketing data", () => {
    const action = read("app/actions/marketing.ts");

    expect(action).toContain("tenantId: tenant.id");
    expect(action).toContain("prisma.lead.findMany");
    expect(action).toContain("prisma.platformConnection.findMany");
    expect(action).not.toContain("encryptedApiKey: true");
  });

  it("keeps the calculator provider neutral", () => {
    const calculator = read("components/views/CalculatorView.tsx");

    expect(calculator).not.toContain("BANK_DATA");
    expect(calculator).not.toContain("SAMA");
    expect(calculator).not.toContain("2026");
    expect(calculator).toContain("annualRate");
  });

  it("uses recorded response times instead of simulated sales data", () => {
    const action = read("app/actions/sales.ts");

    expect(action).toContain("lastContactedAt");
    expect(action).toContain("tenantId: tenant.id");
    expect(action).not.toContain("simulatedResponseTime");
    expect(action).not.toContain("monthlyTarget");
  });
});
