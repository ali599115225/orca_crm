import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  displayPredictionReason,
  displayRevenueIntegrityError,
  displayRevenueIntegrityValue,
  safeDisplayId,
} from "@/lib/display/revenueIntegrity";

const read = (relative: string) =>
  readFileSync(join(process.cwd(), relative), "utf8");

const page = read("app/operations/revenue-integrity/page.tsx");
const view = read("components/revenue-integrity/RevenueIntegrityView.tsx");
const visual = read("components/revenue-integrity/visual.ts");
const viewWithVisual = `${view}\n${visual}`;
const actions = read("app/actions/revenue-integrity.ts");
const auth = read("lib/revenue-integrity/authorization.ts");
const queries = read("lib/revenue-integrity/queries.ts");
const events = read("lib/revenue-integrity/events.ts");
const conversation = read("lib/revenue-integrity/conversation-to-action.ts");

describe("Revenue Integrity final closure", () => {
  it("uses a database-backed role boundary and exposes server capabilities", () => {
    expect(auth).toContain("assertServerActionRole");
    expect(auth).toContain("prisma.user.findFirst");
    expect(auth).toContain("capabilitiesForRole");
    expect(page).toContain("auth.capabilities");
  });

  it("does not load protected sections when the role cannot read them", () => {
    expect(queries).toContain("capabilities.canReadActions");
    expect(queries).toContain("capabilities.canReadAudit");
    expect(queries).toContain("capabilities.canReadPredictive");
    expect(view).toContain("visibleTabs");
  });

  it("scopes manual Outbox processing to the authenticated tenant", () => {
    expect(actions).toContain('"revenue.trust.manage"');
    expect(actions).toContain("processRevenueOutbox(");
    expect(actions).toContain("auth.tenantId");
    expect(events).toContain("tenantId?: string");
    expect(events).toContain("...(tenantId ? { tenantId } : {})");
  });

  it("keeps suggestion state, event, audit, and Outbox in the same transaction", () => {
    expect(events).toContain("transactionClient?: RevenueEventClient");
    expect(conversation).toContain("suggestion-approved:${suggestion.id}");
    expect(conversation).toMatch(
      /suggestion-approved:\$\{suggestion\.id\}[\s\S]*?\}, tx\);/,
    );
    expect(conversation).toMatch(
      /suggestion-rejected:\$\{suggestion\.id\}[\s\S]*?\}, tx\);/,
    );
    expect(conversation).toMatch(
      /suggestion-executed:\$\{suggestion\.id\}[\s\S]*?\}, tx\);/,
    );
  });

  it("returns public error codes and never sends provider secrets to the client", () => {
    expect(actions).toContain("publicRevenueErrorCode");
    expect(actions).not.toContain(
      "error instanceof Error ? error.message",
    );
    expect(view).toContain("displayRevenueIntegrityError");
    expect(view).not.toContain("{provider.lastError}");
  });

  it("uses the Dashboard contrast and gold interaction contract", () => {
    expect(viewWithVisual).toContain("bg-[var(--nc-surface-solid)]");
    expect(viewWithVisual).toContain("hover:border-[var(--nc-accent-border)]");
    expect(viewWithVisual).toContain("hover:bg-[var(--nc-accent-soft)]");
    // Primary buttons must use the token the Dashboard contract defines in
    // globals.css; --nc-on-primary does not exist there.
    expect(viewWithVisual).toContain("text-[var(--orca-ui-on-primary)]");
    expect(viewWithVisual).not.toContain("--nc-on-primary");
    expect(viewWithVisual).not.toContain("--nc-foreground");
    expect(viewWithVisual).not.toContain("rounded-3xl");
    expect(viewWithVisual).not.toMatch(/bg-blue-|text-blue-|border-blue-/);
  });

  it("caps every list card at REVENUE_CARD_PAGE_SIZE = 4", () => {
    expect(view).toContain("const REVENUE_CARD_PAGE_SIZE = 4;");
    // كل التقطيعات تستخدم الثابت الموحد
    for (const list of ["openRisks", "initialData.suggestions", "initialData.events", "initialData.audits"]) {
      expect(view).toContain(`Math.ceil(${list}.length / REVENUE_CARD_PAGE_SIZE)`);
    }
    expect(view).toContain("pageSize: REVENUE_CARD_PAGE_SIZE");
    // لا أحجام صفحات قديمة
    expect(view).not.toMatch(/pageSize:\s*(5|8|10)\b/);
    expect(view).not.toMatch(/PageSize\s*=\s*(5|8|10)\b/);
  });

  it("keeps cards content-sized with no fake stretch", () => {
    expect(view).not.toContain("min-h-40");
    expect(view).not.toMatch(/\bh-\[\d+px\]/);
    expect(view).not.toMatch(/minHeight/);
    expect(view).not.toContain("placeholder-row");
    expect(view).toContain("grid items-start gap-5 xl:grid-cols-2");
    expect(view).toContain("flex items-center justify-between gap-3 flex-wrap");
    expect(view).toContain("inline-flex items-center gap-1.5");
  });

  it("blocks follow-up execution without a lead and offers linking", () => {
    expect(view).toContain("suggestionNeedsLeadLink");
    expect(view).toContain("linkRevenueSuggestionLeadAction");
    expect(view).toContain("listRevenueLinkableLeadsAction");
    expect(view).toContain("اربط المحادثة بعميل محتمل قبل تنفيذ المتابعة.");
    expect(view).toContain("ربط بعميل محتمل");
    expect(conversation).toContain("LEAD_LINK_REQUIRED");
    expect(conversation).toContain("linkActionSuggestionLead");
    expect(conversation).toContain("CROSS_TENANT_LEAD_ACCESS_DENIED");
    expect(actions).toContain("linkRevenueSuggestionLeadAction");
    expect(actions).toContain('"revenue.action.approve"');
    expect(
      displayRevenueIntegrityError("LEAD_LINK_REQUIRED", "ar"),
    ).toBe("اربط المحادثة بعميل محتمل قبل تنفيذ المتابعة.");
    expect(
      displayRevenueIntegrityError("LEAD_LINK_REQUIRED", "en"),
    ).toBe("Link the conversation to a lead before executing the follow-up.");
    expect(
      displayRevenueIntegrityError("EXECUTION_FAILED:LEAD_ID_REQUIRED_FOR_TASK", "ar"),
    ).not.toContain("LEAD_ID_REQUIRED");
  });

  it("implements the reason dialog keyboard contract", () => {
    expect(view).toContain('event.key === "Escape"');
    expect(view).toContain("dialogReturnFocusRef");
    expect(view).toContain('aria-modal="true"');
  });

  it("does not stretch empty cards or expose manual identifiers", () => {
    expect(view).not.toContain('style={{ minHeight: "380px" }}');
    expect(view).not.toContain('h-[580px]');
    expect(view).not.toContain('h-[400px]');
    expect(view).not.toContain("placeholder-");
    expect(view).toContain('sourceType !== "MANUAL"');
    expect(safeDisplayId("manual-123", "ar")).toBe("");
  });

  it("disables manual textarea resize and constrains height", () => {
    expect(visual).toContain("resize-none");
    expect(visual).toContain("overflow-y-auto");
    expect(visual).toContain("max-w-full");
    expect(visual).toContain("min-w-0");
    expect(visual).toContain("box-border");
    expect(view).not.toContain("resize-y");
    expect(view).not.toContain("resize-x");
    expect(view).not.toContain("resize-both");
    expect(view).not.toMatch(/style=\{\{\s*resize/);
    expect(view).toContain("h-40");
    expect(view).toContain("h-28");
  });

  it("keeps Arabic and English interface content separate", () => {
    expect(displayRevenueIntegrityValue("CREATE_TASK", "ar")).toBe("إنشاء مهمة");
    expect(displayRevenueIntegrityValue("CREATE_TASK", "en")).toBe("Create task");
    expect(displayRevenueIntegrityValue("OUTBOX", "ar")).toBe("صندوق الصادر");
    expect(displayRevenueIntegrityValue("OUTBOX", "en")).toBe("Outbox");
    expect(view).toContain("التدقيق وصندوق الصادر");
    expect(view).not.toContain("التدقيق وOutbox");
    expect(view).not.toContain(">Deterministic<");
  });

  it("localizes technical failures and predictive reason labels", () => {
    expect(
      displayRevenueIntegrityError("RESEND_API_KEY_REQUIRED", "ar"),
    ).not.toContain("RESEND_API_KEY");
    expect(
      displayPredictionReason(
        { code: "NO_TOURS", label: "No tours scheduled" },
        "ar",
      ),
    ).toBe("لا توجد جولات مجدولة");
  });

  it("implements route loading, error, unauthorized, and forbidden states", () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          "app/operations/revenue-integrity/loading.tsx",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "app/operations/revenue-integrity/error.tsx",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "components/revenue-integrity/RevenueIntegrityRouteState.tsx",
        ),
      ),
    ).toBe(true);
    expect(page).toContain('state="forbidden"');
    expect(page).toContain('state="unauthorized"');
  });

  it("does not introduce SaaS subscription logic or database migrations", () => {
    const combined = `${page}\n${view}\n${actions}\n${auth}`;
    expect(combined).not.toContain("assertPlanLimit");
    expect(combined).not.toContain("subscriptionPlan");
    expect(combined).not.toContain("@/lib/plan-guard");
  });

  it("removes all trust tab references from RevenueIntegrityView", () => {
    expect(view).not.toContain('"trust"');
    expect(view).not.toContain("trust:");
    expect(view).not.toContain("canReadTrust");
    expect(view).not.toContain("بوابات الثقة السعودية");
    expect(view).not.toContain("Saudi Trust Gates");
    expect(view).not.toContain('activeTab === "trust"');
    expect(view).not.toContain("connectedProviders");
    expect(view).not.toContain("testRevenueProviderAction");
    expect(view).not.toContain("providerPage");
    expect(view).not.toContain("providerItems");
  });
});
