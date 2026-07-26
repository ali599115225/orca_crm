import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const operatingModel = source("lib/platform-operating-model.ts");
const registrationAction = source("app/actions/register.ts");
const agentSlotsAction = source("app/actions/agentSlots.ts");

describe("EXEC-004 legacy SaaS retirement", () => {
  it("defines one independent company as the canonical operating model", () => {
    expect(operatingModel).toContain(
      'businessModel: "SINGLE_INDEPENDENT_COMPANY"',
    );
    expect(operatingModel).toContain("legacySaasEnabled: false");
    expect(operatingModel).toContain(
      'externalIntegrationsDefaultState: "NOT_CONFIGURED"',
    );
  });

  it.each([
    "PUBLIC_TENANT_REGISTRATION",
    "SELF_SERVICE_TRIAL",
    "SUBSCRIPTION_CHECKOUT",
    "SUBSCRIPTION_CHANGE",
    "ADDON_CHECKOUT",
    "AGENT_LEASING",
    "AUTOMATIC_RENEWAL",
    "BILLING_CRON",
    "PACKAGE_LIMIT_ENFORCEMENT",
    "UPGRADE_NAVIGATION",
  ])("blocks %s in the canonical capability registry", (capability) => {
    expect(operatingModel).toContain(`\"${capability}\"`);
  });

  it("keeps public company registration as a non-executable compatibility boundary", () => {
    expect(registrationAction).toContain(
      'legacySaasBlockedResult(\n    "PUBLIC_TENANT_REGISTRATION"',
    );
    expect(registrationAction).not.toMatch(
      /prisma\.|cookies\(|setSession|payment|checkout/i,
    );
  });

  it("removes subscription-plan reads and commercial cap decisions from agent slots", () => {
    expect(agentSlotsAction).not.toContain("subscriptionPlan");
    expect(agentSlotsAction).not.toContain("PLAN_SLOT_LIMITS");
    expect(agentSlotsAction).not.toContain("CAP_LOCK");
    expect(agentSlotsAction).not.toContain("isDedicatedCopyDeployment");
    expect(agentSlotsAction).not.toContain(
      "meter.usageValue + amount > meter.limitValue",
    );
    expect(agentSlotsAction).toContain("commercialLimitApplied: false");
    expect(agentSlotsAction).toContain("commercialPlanLimitApplied: false");
    expect(agentSlotsAction).toContain("recordedLimitValue: meter.limitValue");
    expect(agentSlotsAction).toContain("limitValue: null");
  });

  it("retains tenant isolation and audit on agent-slot mutations", () => {
    expect(agentSlotsAction).toContain(
      "requireAgentAccess({ roles: AGENT_MANAGER_ROLES })",
    );
    expect(agentSlotsAction).toContain("tenantId: access.tenantId");
    expect(agentSlotsAction).toContain('action: "AGENT_SLOT_CREATED"');
    expect(agentSlotsAction).toContain('action: "AGENT_SLOT_DEACTIVATED"');
  });
});
