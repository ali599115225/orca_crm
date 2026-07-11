import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const tenantScopedRoutes = [
  "app/api/v1/leads/route.ts",
  "app/api/v1/leads/[id]/move/route.ts",
  "app/api/properties/route.ts",
  "app/api/v1/opportunities/route.ts",
  "app/api/v1/opportunities/[id]/offers/route.ts",
  "app/api/v1/offers/route.ts",
  "app/api/v1/offers/[id]/accept/route.ts",
  "app/api/v1/tours/route.ts",
  "app/api/v1/tours/[id]/status/route.ts",
  "app/api/v1/tasks/route.ts",
  "app/api/v1/tasks/[id]/complete/route.ts",
  "app/api/v1/contacts/route.ts",
  "app/api/v1/contacts/[id]/notes/route.ts",
];

describe("Leads functional tenant boundary", () => {
  it("provides one callback boundary that owns the complete database operation", () => {
    const guard = read("lib/api-auth-guard.ts");

    expect(guard).toContain("export async function runWithDatabaseSession");
    expect(guard).toContain("runWithTenantContext(");
    expect(guard).toContain("() => operation(session)");
    expect(guard).toContain("export const TENANT_WRITE_ROLES");
  });

  it("wraps every Leads lifecycle API route in the database session boundary", () => {
    for (const file of tenantScopedRoutes) {
      const source = read(file);
      expect(source, file).toContain("runWithDatabaseSession");
      expect(source, file).not.toContain("getTenantAndUser");
      expect(source, file).not.toMatch(/\brequireAuth\s*\(/);
      expect(source, file).not.toMatch(/\bsetTenantContext\s*\(/);
    }
  });

  it("scopes tab reads by leadId rather than loading the full tenant dataset", () => {
    for (const file of [
      "app/api/v1/opportunities/route.ts",
      "app/api/v1/offers/route.ts",
      "app/api/v1/tours/route.ts",
      "app/api/v1/tasks/route.ts",
      "app/api/v1/contacts/route.ts",
    ]) {
      expect(read(file), file).toContain('searchParams.get("leadId")');
    }

    const engagement = read(
      "features/leads/components/EngagementTabs.tsx",
    );
    expect(engagement).toContain(
      "/api/v1/opportunities?leadId=${encodeURIComponent(leadId)}",
    );
    expect(engagement).toContain(
      "/api/v1/offers?leadId=${encodeURIComponent(leadId)}",
    );
    expect(engagement).toContain(
      "/api/v1/tours?leadId=${encodeURIComponent(leadId)}",
    );
  });

  it("does not disguise failed tab requests as valid empty states", () => {
    const engagement = read(
      "features/leads/components/EngagementTabs.tsx",
    );

    expect(engagement).toContain("setOpportunitiesError");
    expect(engagement).toContain("setOffersError");
    expect(engagement).toContain("setToursError");
    expect(engagement).toContain("setOfferActionError");
    expect(engagement).toContain("setTourActionError");
    expect(engagement).not.toContain(
      "Non-blocking: the panel state simply stays unchanged.",
    );
  });

  it("supports task creation/completion and tour status updates from the detail page", () => {
    const detail = read(
      "features/leads/components/LeadDetailClient.tsx",
    );
    const engagement = read(
      "features/leads/components/EngagementTabs.tsx",
    );
    const tours = read(
      "components/leads/panels/LeadToursPanel.tsx",
    );

    expect(detail).toContain('fetch("/api/v1/tasks"');
    expect(detail).toContain(
      "fetch(`/api/v1/tasks/${taskId}/complete`",
    );
    expect(engagement).toContain(
      "fetch(`/api/v1/tours/${tour.id}/status`",
    );
    expect(tours).toContain('"COMPLETED"');
    expect(tours).toContain('"NO_SHOW"');
    expect(tours).toContain('"CANCELLED"');
  });
});

describe("Leads relationship and lifecycle integrity", () => {
  it("verifies project ownership before create and update linkage", () => {
    const service = read("lib/leads/service.ts");
    const actions = read("app/actions/leads.ts");

    expect(service).toContain(
      "where: { id: input.projectId, tenantId: tenant.id }",
    );
    expect(service).toContain("projectId = project.id");
    expect(actions).toContain(
      "where: { id: input.projectId, tenantId: tenant.id }",
    );
    expect(actions).toContain(
      "data.project = { connect: { id: project.id } }",
    );
  });

  it("keeps dedicated lead creation independent from subscription-count gates", () => {
    const service = read("lib/leads/service.ts");
    const api = read("app/api/v1/leads/route.ts");

    expect(service).not.toContain("@/lib/plan-guard");
    expect(service).not.toContain("assertPlanLimit");
    expect(service).not.toContain("PlanLimitError");
    expect(api).not.toContain("PlanLimitError");
  });

  it("verifies lead/contact ownership before creating an outbound email record", () => {
    const email = read("app/actions/email.ts");
    const ownershipCheck = email.indexOf(
      "const lead = await prisma.lead.findFirst",
    );
    const messageCreate = email.indexOf(
      "const emailMessage = await prisma.emailMessage.create",
    );

    expect(ownershipCheck).toBeGreaterThan(-1);
    expect(messageCreate).toBeGreaterThan(ownershipCheck);
    expect(email).toContain(
      "where: { id: contactId, tenantId: tenant.id }",
    );
  });

  it("aggregates related opportunity, offer, tour, task, and contract audits into Lead history", () => {
    const actions = read("app/actions/leads.ts");
    const copy = read("features/leads/copy/leadsCopy.ts");

    for (const tableName of [
      "opportunities",
      "offers",
      "tours",
      "tasks",
      "contracts",
    ]) {
      expect(actions).toContain(`tableName: "${tableName}"`);
    }
    expect(actions).toContain("OR: historyScopes");
    expect(copy).toContain("LEAD_OPPORTUNITY_CREATED");
    expect(copy).toContain("LEAD_OFFER_ACCEPTED");
    expect(copy).toContain("SIGN_CONTRACT");
  });

  it("does not manufacture production PDF links for offers", () => {
    for (const file of [
      "app/api/v1/offers/route.ts",
      "app/api/v1/opportunities/[id]/offers/route.ts",
    ]) {
      const source = read(file);
      expect(source, file).not.toContain(
        "https://orca.az-ez.pro/documents/offer_",
      );
    }
  });

  it("keeps Lead.status as the only lifecycle source of truth", () => {
    for (const file of [
      "lib/domain/transaction-spine/accept-offer.ts",
      "lib/domain/transaction-spine/cancel-contract.ts",
      "lib/domain/transaction-spine/issue-contract.ts",
      "lib/domain/transaction-spine/sign-contract.ts",
      "lib/domain/transaction-spine/update-tour-status.ts",
    ]) {
      expect(read(file), file).not.toMatch(/\bstage\s*:/);
    }
  });
});

describe("Leads communication and page linking", () => {
  it("categorizes and localizes provider failures without exposing technical payloads", () => {
    const detail = read(
      "features/leads/components/LeadDetailClient.tsx",
    );
    const email = read("app/actions/email.ts");
    const copy = read("features/leads/copy/leadsCopy.ts");

    expect(detail).toContain("localizeEmailProviderError(result.error, langKey)");
    expect(detail).toContain("localizeEmailProviderError(");
    expect(detail).toContain("{emailError}");
    expect(detail).not.toContain("result.error ||");
    expect(copy).toContain("export function localizeEmailProviderError");
    expect(copy).toContain("resend_api_key");
    expect(email).toContain("function publicEmailError");
    expect(email).toContain("error: publicEmailError(result.error)");
    expect(email).not.toContain("compact && compact.length");
  });

  it("supports WhatsApp through the platform route with a direct WhatsApp fallback", () => {
    const detail = read(
      "features/leads/components/LeadDetailClient.tsx",
    );
    const actions = read("app/actions/leads.ts");
    const copy = read("features/leads/copy/leadsCopy.ts");

    expect(detail).toContain('fetch("/api/v1/whatsapp/send"');
    expect(detail).toContain("https://wa.me/");
    expect(detail).toContain("normalizeSaudiWhatsAppPhone");
    expect(detail).toContain("recordLeadWhatsAppActivityAction");
    expect(actions).toContain(
      "export async function recordLeadWhatsAppActivityAction",
    );
    expect(actions).toContain('activityType: "WHATSAPP"');
    expect(actions).toContain('"LEAD_WHATSAPP_SENT"');
    expect(actions).toContain('"LEAD_WHATSAPP_OPENED"');
    expect(copy).toContain("LEAD_WHATSAPP_SENT");
    expect(copy).toContain("LEAD_WHATSAPP_OPENED");
  });

  it("links the Lead record to the existing project, unit, task, offer, tour, and WhatsApp pages", () => {
    const detail = read(
      "features/leads/components/LeadDetailClient.tsx",
    );
    const engagement = read(
      "features/leads/components/EngagementTabs.tsx",
    );

    expect(detail).toContain("/operations/projects?projectId=");
    expect(detail).toContain("/operations/tasks?leadId=");
    expect(detail).toContain("/operations/whatsapp?leadId=");
    expect(engagement).toContain("/operations/properties?unitId=");
    expect(engagement).toContain("/operations/offers?offerId=");
    expect(engagement).toContain("/operations/tours?tourId=");
  });
});
