import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_REGISTRY,
  AGENT_TYPES,
  getAgentDefinition,
} from "@/lib/agents/registry";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Phase 04 Agent AI closure", () => {
  it("defines one central registry for all operational agents", () => {
    expect(AGENT_TYPES).toEqual([
      "SAHER",
      "SANAD",
      "MANSOUR",
      "BASEER",
      "KHABEER",
      "SENTINEL",
      "CHAT_BOT",
    ]);
    expect(getAgentDefinition("saher")).toEqual(AGENT_REGISTRY.SAHER);
    expect(AGENT_REGISTRY.SAHER.requiresApprovalForExternalAction).toBe(true);
    expect(AGENT_REGISTRY.SANAD.requiresApprovalForExternalAction).toBe(true);
    expect(AGENT_REGISTRY.SENTINEL.tenantScoped).toBe(false);
  });

  it("enforces authenticated tenant users and manager-only mutations", () => {
    const access = source("lib/agents/access.ts");
    const slots = source("app/actions/agentSlots.ts");
    const command = source("app/api/admin/command-center/route.ts");

    expect(access).toContain("id: userId");
    expect(access).toContain("tenantId");
    expect(access).toContain("isActive: true");
    expect(slots).toContain("AGENT_MANAGER_ROLES");
    expect(command).toContain("approvalRequired: true");
    expect(command).toContain("roles: AGENT_MANAGER_ROLES");
  });

  it("uses DB-backed tenant quotas, token telemetry, and safe JSON", () => {
    const quota = source("lib/agents/quota.ts");
    const client = source("lib/agents/gemini-client.ts");

    expect(quota).toContain("INSERT INTO rate_limit_entries");
    expect(quota).toContain("AI_TENANT_MINUTE_LIMIT");
    expect(quota).toContain("AI_TENANT_DAILY_LIMIT");
    expect(client).toContain("detectInjectionPatterns");
    expect(client).toContain("responseMimeType: \"application/json\"");
    expect(client).toContain("usageMetadata");
    expect(client).toContain('actionType: "AI_USAGE"');
    expect(client).toContain('const DEFAULT_MODEL = "gemini-2.5-flash"');
    expect(client).not.toContain("gemini-2.0-flash");
    expect(client).toContain("AbortController");
    expect(client).not.toContain("console.log(apiKey");
  });

  it("persists Saher retries and uses tenant WhatsApp credentials", () => {
    const retry = source("lib/agents/persistent-retry.ts");
    const saher = source("app/actions/saherAgent.ts");

    expect(retry).toContain('source: "AGENT_RETRY"');
    expect(retry).toContain("encryptText");
    expect(retry).toContain("claimAgentRetries");
    expect(saher).toContain("enqueueAgentRetry");
    expect(saher).toContain("sendWhatsAppMessage");
    expect(saher).not.toContain("GREEN_API_TOKEN_INSTANCE");
    expect(saher).not.toContain("saherReplayEngine");
  });

  it("removes mock AI routes and centralizes structured generation", () => {
    const action = source("app/actions/aiActions.ts");
    const routes = [
      "app/api/v1/ai/lead-score/route.ts",
      "app/api/v1/ai/offer-optimize/route.ts",
      "app/api/v1/ai/summarize-conversation/route.ts",
    ].map(source);

    expect(action).toContain("generateAgentJson");
    expect(action).not.toContain("Math.random");
    expect(action).not.toContain("setTimeout(resolve, 1500)");
    for (const route of routes) {
      expect(route).toContain("requireAgentAccess");
      expect(route).toContain("generateAgentJson");
      expect(route).toContain("fallback:");
      expect(route).not.toContain("hardcoded mock");
    }
  });

  it("protects agent APIs and platform-wide diagnostics", () => {
    const agentRoutes = [
      "app/api/v1/agents/route.ts",
      "app/api/v1/agents/[id]/logs/route.ts",
      "app/api/v1/agents/[id]/toggle/route.ts",
      "app/api/v1/agents/[id]/run/route.ts",
    ].map(source);
    const diagnostics = source("app/actions/errorAgent.ts");

    for (const route of agentRoutes) {
      expect(route).toContain("requireAgentAccess");
      expect(route).toContain("tenantId");
    }
    expect(agentRoutes[2]).toContain("AGENT_MANAGER_ROLES");
    expect(agentRoutes[3]).toContain("claimAgentIdempotency");
    expect(diagnostics).toContain("requirePlatformOwnerAccess");
    expect(diagnostics).not.toContain('session.email === "ali.orca@outlook.sa"');
  });
});
