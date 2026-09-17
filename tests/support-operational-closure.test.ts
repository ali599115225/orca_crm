import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockAuditLogCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: (...args: unknown[]) => mockAuditLogCreate(...args) },
  },
}));

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("Support Center operational and property-identity closure", () => {
  const page = source("app/operations/helpdesk/page.tsx");
  const view = source("components/views/HelpdeskView.tsx");
  const actions = source("app/actions/helpdesk.ts");
  const listApi = source("app/api/v1/support/tickets/route.ts");
  const statusApi = source("app/api/v1/support/tickets/[id]/route.ts");
  const replyApi = source(
    "app/api/v1/support/tickets/[id]/reply/route.ts",
  );
  const audit = source("lib/audit.ts");
  const destination = source("lib/support/ticket-destination.ts");
  const properties = source(
    "components/real-estate/properties/PropertiesWorkspace.tsx",
  );
  const tasks = source("components/views/TasksView.tsx");
  const operationsVisual = source("features/operations/visual.ts");
  const operationsDialog = source("components/operations/OperationsDialog.tsx");
  const operationsContractCss = source(
    "app/operations/orca-page-contract-v1.css",
  );

  it("keeps the support route on the canonical HelpdeskView", () => {
    expect(page).toContain(
      'import HelpdeskView from "@/components/views/HelpdeskView"',
    );
    expect(page).toContain("<HelpdeskView");
    expect(page).toContain("initialLoadFailed");
  });

  it("uses a real tenant-scoped read model and distinguishes load failure", () => {
    expect(page).toContain("where: { tenantId: tenant.id }");
    expect(page).toContain("runWithTenantContext");
    expect(page).toContain("{ tenantId: tenant.id, userId }");
    expect(page).toContain("async () =>");
    expect(page).toContain("await prisma.ticket.findMany");
    expect(actions).toContain("export async function getTicketsAction");
    expect(actions).toContain("success: false as const");
    expect(view).toContain("initialLoadFailed");
    expect(view).toContain("loadError ? (");
    expect(view).toContain("isLoading && tickets.length === 0");
  });

  it("does not fabricate AI, payment, DNS, escalation, or SLA outcomes", () => {
    for (const file of [actions, listApi, view]) {
      expect(file).not.toContain("cname.vercel-dns.com");
      expect(file).not.toContain("STC Pay");
      expect(file).not.toContain("تم إرسال تنبيه مباشر");
      expect(file).not.toContain("slaMet");
      expect(file).not.toContain("priorityFor");
      expect(file).not.toContain("demoTicket");
    }

    expect(actions).toContain("aiResponse: null");
    expect(listApi).toContain("aiResponse: null");
  });

  it("protects list, create, status, and reply routes with database-backed roles", () => {
    expect(listApi).toContain("runWithDatabaseSession");
    expect(statusApi).toContain("runWithDatabaseSession");
    expect(replyApi).toContain("runWithDatabaseSession");
    expect(listApi).toContain("TENANT_ROLES");
    expect(actions).toContain("assertServerActionRole");
    expect(actions).toContain("tenantId: session.tenantId");
  });

  it("keeps ticket status transitions validated and tenant scoped", () => {
    expect(statusApi).toContain(
      'const ALLOWED_STATUSES = new Set(["OPEN", "CLOSED"])',
    );
    expect(statusApi).toContain("id,\n            tenantId: session.tenantId");
    expect(actions).toContain("reopenTicketAction");
    expect(actions).toContain("TICKET_REOPENED");
    expect(audit).toContain('"TICKET_REOPENED"');
  });

  it("persists replies in the tenant audit timeline instead of a missing model", () => {
    expect(replyApi).not.toContain("ticketReply");
    expect(replyApi).toContain("prisma.auditLog.findMany");
    expect(replyApi).toContain("prisma.auditLog.create");
    expect(replyApi).toContain('action: "TICKET_REPLIED"');
    expect(replyApi).toContain('sender: "CLIENT"');
    expect(replyApi).not.toContain("const { message, sender }");
    expect(audit).toContain('"TICKET_REPLIED"');
  });

  it("does not accept a client-supplied sender identity", () => {
    expect(view).toContain(
      'body: JSON.stringify({ message: replyInput.trim() })',
    );
    expect(view).not.toContain(
      'JSON.stringify({ message: replyInput.trim(), sender',
    );
    expect(replyApi).not.toContain("body.sender");
    expect(replyApi).toContain('sender: "CLIENT"');
  });

  it("uses the approved two lower operational cards for support", () => {
    expect(view).toContain("const PAGE_SIZE = 6");
    expect(view).toContain("data-four-page-two-card-workspace");
    expect(view).toContain("data-operational-list-card");
    expect(view).toContain("data-operational-detail-card");
    expect(view).toContain("data-support-ticket-list");
    expect(view).toContain("data-support-conversation");
    expect(view).toContain("<OperationsExecutiveGrid");
    expect(operationsVisual).toContain(
      'executiveGrid: "orca-operations-executive-grid"',
    );
    expect(view).not.toContain('lg:h-[460px]');
    expect(view).toContain("orca-operations-flow-region");
    expect(view).toContain("OperationsScrollRegion");
    expect(view).toContain('scrollRole="conversation"');
    expect(view).toContain('className="orca-workspace-pagination');
    expect(view).not.toContain('lg:w-[34%]');
    expect(view).not.toContain("<table");
  });

  it("adopts the approved property workspace identity", () => {
    for (const workspace of [properties, tasks, view]) {
      expect(workspace).toContain("operationsVisual.page");
      expect(workspace).toContain("OperationsPageHeader");
      expect(workspace).toContain("OperationsKpiGrid");
      expect(workspace).toContain("OperationsPanel");
      expect(workspace).not.toContain("UnifiedOperationsWorkspace");
    }

    expect(operationsVisual).toContain(
      'page:\n    "nc-page nc-stack orca-container orca-operations-page pb-4',
    );
    expect(operationsVisual).toContain('panel: "orca-workspace-panel"');
    expect(operationsVisual).toContain('toolbar: "orca-workspace-toolbar"');
    expect(view).toContain("data-helpdesk-property-workspace");
    expect(view).toContain("orca-info-cell");
  });

  it("keeps hero actions local to the support page", () => {
    expect(view).toContain("RefreshCw");
    expect(view).toContain("onClick={beginCreate}");
    expect(view).not.toContain('href: "/operations/whatsapp"');
    expect(view).not.toContain('href: "/operations/email"');
    expect(view).not.toContain('import Link from "next/link"');
  });

  it("uses rounded gold ticket rows without square table edges", () => {
    expect(view).toContain("data-ticket-row");
    expect(view).toContain("h-[60px]");
    expect(view).toContain("rounded-2xl");
    expect(view).toContain("hover:bg-[var(--nc-accent-soft)]");
    expect(view).not.toContain("border-spacing-y-2");
  });

  it("keeps context collapsible and switches to list/detail navigation on small screens", () => {
    expect(view).toContain("contextOpen");
    expect(view).toContain(
      "const [contextOpen, setContextOpen] = useState(false)",
    );
    expect(view).toContain("mobileDetailOpen");
    expect(view).toContain("setMobileDetailOpen(true)");
    expect(view).toContain("setMobileDetailOpen(false)");
    expect(view).toContain("lg:hidden");
    expect(view).toContain("OperationsScrollRegion");
    expect(view).toContain('scrollRole="conversation"');
    expect(view).toContain("min-h-[78px]");
    expect(view).toContain("min-h-[56px]");
    expect(view).toContain("max-w-[74%]");
  });

  it("reviews the internal ticket form and renders it through a safe portal", () => {
    expect(view).toContain("<OperationsDialog");
    expect(operationsDialog).toContain(
      'import { createPortal } from "react-dom"',
    );
    expect(operationsDialog).toContain(
      'if (!open || typeof document === "undefined") return null;',
    );
    expect(operationsDialog).toContain("document.body");
    expect(operationsDialog).toContain('event.key === "Escape"');
    expect(operationsDialog).toContain("operationsVisual.dialog");
    expect(view).not.toContain("orca-form-textarea min-h-[180px]");
  });

  it("uses stable Latin date and time formatting in both languages", () => {
    expect(view).toContain(
      "`${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(",
    );
    expect(view).toContain('dir="ltr"');
    expect(view).not.toContain(
      "`${pad(date.getDate())}-${pad(date.getMonth() + 1)}-",
    );
  });

  it("keeps all actionable controls at least 44px high", () => {
    const actionableTags =
      view.match(/<(?:button|input|textarea|select)\b[\s\S]*?>/g) ?? [];
    const actionableSource = actionableTags.join("\n");

    expect(operationsVisual).toContain(
      'primaryButton: "orca-operations-primary-button"',
    );
    expect(operationsVisual).toContain(
      'secondaryButton: "orca-operations-secondary-button"',
    );
    expect(operationsVisual).toContain(
      'iconButton: "orca-operations-icon-button"',
    );
    expect(operationsContractCss).toMatch(
      /\.orca-v1-shell \.orca-operations-primary-button,[\s\S]*?min-height:\s*44px;/,
    );
    expect(actionableSource).not.toContain("min-h-[40px]");
    expect(actionableSource).not.toContain("h-10");
  });

  it("does not display internal UUIDs or technical identifiers", () => {
    expect(view).not.toContain("{selectedTicket.id}</");
    expect(view).not.toContain("{ticket.id}</");
    expect(view).not.toContain("{reply.id}</");
    expect(view).not.toContain("UUID");
    expect(view).toContain("ticketNumber(ticket)");
  });

  it("collects customer destination on ticket create", () => {
    expect(view).toContain('formData.append("email", newEmail.trim())');
    expect(view).toContain('formData.append("phone", newPhone.trim())');
    expect(view).toContain('formData.append("channel", newChannel)');
    expect(actions).toContain("email, phone, channel");
  });

  it("keeps the create-ticket channel selector inside the shared ORCA form contract", () => {
    expect(view).not.toContain('<select value={newChannel}');
    expect(view).toContain("<SettingsSelect");
    expect(view).toContain("value={newChannel}");
    expect(view).toContain("label={t.channelField}");
    expect(view).toContain('channelField: "القناة"');
    expect(view).toContain('emailField: "البريد الإلكتروني"');
    expect(view).toContain('phoneField: "الهاتف"');
  });

  it("sends close and reply through one bounded shared destination dispatcher", () => {
    expect(actions).toContain("notifyTicketDestination");
    expect(replyApi).toContain("notifyTicketDestination");
    expect(destination).toContain("sendEmail");
    expect(destination).toContain("sendSMSNotification");
    expect(destination).toContain("sendWhatsAppNotification");
    expect(destination).not.toContain("Promise.race");
    expect(destination).not.toContain("SUPPORT_NOTIFICATION_TIMEOUT_MS");
    expect(destination).toContain("textBody: input.message");
    expect(destination).toContain("EMAIL_PROVIDER_NOT_CONFIGURED");
    expect(destination).toContain("SMS_NOT_CONFIGURED");
    expect(destination).toContain("وجهة العميل غير موجودة.");
  });
});

describe("outbound SMS audit persist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SMS_API_KEY;
    mockAuditLogCreate.mockResolvedValue({ id: "sms-audit-1" });
  });

  it("writes SMS_NOT_CONFIGURED to lead audit history without throwing", async () => {
    const { sendSMSNotification } = await import("@/lib/notifications");
    const result = await sendSMSNotification("0500000000", "welcome", {
      tenantId: "tenant-1",
      leadId: "lead-1",
      userId: "user-1",
    });

    expect(result).toEqual({
      success: false,
      error: "SMS_NOT_CONFIGURED",
    });
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        userId: "user-1",
        action: "SMS_OUTBOUND_ATTEMPT",
        tableName: "leads",
        recordId: "lead-1",
      }),
    });
    const details = JSON.parse(
      mockAuditLogCreate.mock.calls[0][0].data.details,
    );
    expect(details).toEqual({
      destinationPresent: true,
      result: "SMS_NOT_CONFIGURED",
    });
    expect(JSON.stringify(mockAuditLogCreate.mock.calls[0][0])).not.toContain(
      "0500000000",
    );
  });
});
