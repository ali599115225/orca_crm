import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(join(process.cwd(), file), "utf8");

const radar = read("lib/revenue-integrity/radar.ts");
const actions = read("app/actions/revenue-integrity.ts");
const schema = read("prisma/schema.prisma");

describe("Revenue Leak Radar closure contract", () => {
  it("uses tenant-scoped, idempotent radar runs", () => {
    expect(radar).toContain(
      "export async function evaluateRevenueLeakRadar"
    );
    expect(radar).toContain("tenantId: string");
    expect(radar).toContain("revenueRuleRun.findFirst");
    expect(radar).toContain("idempotencyKey");

    expect(schema).toContain(
      '@@unique([tenantId, idempotencyKey], map: "revenue_rule_run_tenant_idempotency_uq")'
    );
  });

  it("deduplicates risk signals inside each tenant", () => {
    expect(radar).toContain("revenueRiskSignal.findFirst");
    expect(radar).toContain("fingerprint: key");

    expect(schema).toContain(
      '@@unique([tenantId, fingerprint], map: "revenue_risk_tenant_fingerprint_uq")'
    );
  });

  it("records the complete risk lifecycle", () => {
    for (const event of [
      "REVENUE_RISK_DETECTED",
      "REVENUE_RISK_REOPENED",
      "REVENUE_RISK_AUTO_RESOLVED",
      "REVENUE_RADAR_EVALUATED",
      "REVENUE_RISK_ACKNOWLEDGED",
      "REVENUE_RISK_RESOLVED",
    ]) {
      expect(radar).toContain(event);
    }
  });

  it("passes the authenticated tenant through server actions", () => {
    expect(actions).toContain("evaluateRevenueLeakRadar(");
    expect(actions).toContain("acknowledgeRevenueRisk(");
    expect(actions).toContain("resolveRevenueRisk(");

    const tenantUses = actions.match(/auth\.tenantId/g) ?? [];
    expect(tenantUses.length).toBeGreaterThanOrEqual(3);
  });
});