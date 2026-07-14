import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const agentView = read("components/views/AgentManagementView.tsx");
const agentPage = read("app/operations/agents/page.tsx");
const agentsRoute = read("app/api/v1/agents/route.ts");
const agentLogsRoute = read("app/api/v1/agents/[id]/logs/route.ts");
const agentRunRoute = read("app/api/v1/agents/[id]/run/route.ts");
const agentToggleRoute = read("app/api/v1/agents/[id]/toggle/route.ts");

const documentsView = read("components/views/DocumentsView.tsx");
const documentsRoute = read("app/api/v1/documents/route.ts");
const documentRoute = read("app/api/v1/documents/[id]/route.ts");
const schema = read("prisma/schema.prisma");
const policy = read("lib/tenant-model-policy.ts");

describe("agents operational closure", () => {
  it("removes licensing and subscription concepts from the agents workspace", () => {
    const scope = [agentView, agentPage, agentToggleRoute].join("\n");
    expect(scope).not.toMatch(
      /license|subscription|entitlement|اشتراك|ترخيص|مشمول|غير مشمول/i,
    );
  });

  it("keeps all agent reads and mutations tenant scoped", () => {
    expect(agentsRoute).toContain("where: { tenantId: access.tenantId }");
    expect(agentLogsRoute).toContain("where: { id, tenantId: access.tenantId }");
    expect(agentRunRoute).toContain("where: { id, tenantId: access.tenantId }");
    expect(agentToggleRoute).toContain("where: { id, tenantId: access.tenantId }");
    expect(agentToggleRoute).toContain("updateMany");
  });

  it("supports real activation, execution, runtime states, and safe logs", () => {
    expect(agentView).toContain("يعمل الآن");
    expect(agentView).toContain("يحتاج انتباه");
    expect(agentView).toContain("فشل آخر تشغيل");
    expect(agentRunRoute).toContain("MANUAL_RUN_STARTED");
    expect(agentRunRoute).toContain("MANUAL_RUN_SUCCEEDED");
    expect(agentRunRoute).toContain("MANUAL_RUN_FAILED");
    expect(agentLogsRoute).toContain("safeLogMessage");
    expect(agentView).not.toContain("GEMINI_API_KEY");
  });

  it("keeps action controls at least 44px high", () => {
    expect(agentView.match(/min-h-\[44px\]/g)?.length || 0).toBeGreaterThanOrEqual(4);
  });
});

describe("document repository closure", () => {
  it("stores real bytes and never emits mock storage URLs", () => {
    const scope = [documentsRoute, documentRoute, documentsView].join("\n");
    expect(scope).not.toContain("/mock-documents/");
    expect(scope).not.toContain("MOCK_PERSIST_JSON");
    expect(documentsRoute).toMatch(
      /content:\s*Uint8Array\.from\(inspected\.content\)/,
    );
    expect(documentRoute).toContain("new Uint8Array(document.content)");
  });

  it("enforces tenant isolation and role-based writes", () => {
    expect(documentsRoute).toContain("runWithDatabaseSession");
    expect(documentsRoute).toContain("tenantId: session.tenantId");
    expect(documentRoute).toContain("tenantId: session.tenantId");
    expect(documentRoute).toContain("DOCUMENT_DELETE_ROLES");
    expect(documentRoute).toContain("deleteMany");
  });

  it("uses portal dialogs, hidden internal scrolling, and 44px controls", () => {
    expect(documentsView).toContain("createPortal");
    expect(documentsView).toContain("pt-24");
    expect(documentsView).toContain('scrollbarWidth: "none"');
    expect(documentsView.match(/min-h-\[44px\]/g)?.length || 0).toBeGreaterThanOrEqual(10);
  });

  it("does not render storage paths, checksums, or visible UUID labels", () => {
    expect(documentsView).not.toContain("checksumSha256");
    expect(documentsView).not.toContain("storagePath");
    expect(documentsView).not.toContain("معرف الكيان");
    expect(documentsView).not.toContain("SECURE_DECRYPT_ID");
  });

  it("registers Document as a required tenant model", () => {
    expect(schema).toMatch(/model Document \{[\s\S]*?tenantId\s+String/);
    expect(schema).toMatch(/content\s+Bytes/);
    expect(schema).toMatch(/ownerName\s+String/);
    expect(schema).toMatch(/checksumSha256\s+String/);
    expect(policy).toContain('"Document"');
  });
});
