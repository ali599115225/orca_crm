import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = process.env.EXEC010_POSTGRES_EVIDENCE;

describe("EXEC-010 — PostgreSQL integrity evidence", () => {
  it("requires the disposable PostgreSQL proof to pass", () => {
    expect(path).toBeTruthy();
    const evidence = JSON.parse(readFileSync(path as string, "utf8"));
    expect(evidence.result).toBe("PASS");
    expect(evidence.postgresMajor).toBe(16);
    expect(evidence.tests).toMatchObject({
      documentIdentityImmutable: true,
      legalHoldBlocksExpiry: true,
      documentHashPreserved: true,
      crossTenantDocumentDenied: true,
      privacyAppendOnly: true,
      metricImmutable: true,
      metricCrossTenantDenied: true,
      unapprovedMetricDenied: true,
      exportAppendOnly: true,
      crossTenantExportDenied: true,
      privacyReplayConcurrencyBounded: true,
      privacyRaceCount: 1,
    });
  });
});
