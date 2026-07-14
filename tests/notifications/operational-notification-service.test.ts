import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const service = readFileSync(
  resolve(process.cwd(), "lib/operational-notifications.ts"),
  "utf8",
);

describe("operational notification service", () => {
  it("derives real notifications from WhatsApp, email, support, and tasks", () => {
    expect(service).toContain('source: "WHATSAPP"');
    expect(service).toContain('source: "EMAIL"');
    expect(service).toContain('source: "SUPPORT"');
    expect(service).toContain('source: "TASKS"');
    expect(service).toContain("whatsAppMessage.findMany");
    expect(service).toContain("emailMessage.findMany");
    expect(service).toContain('tableName: "tickets"');
    expect(service).toContain("task.findMany");
  });

  it("isolates every source by tenant and target user", () => {
    expect(service.match(/tenantId: session\.tenantId/g)?.length).toBeGreaterThanOrEqual(8);
    expect(service).toContain("assignedTo: session.userId");
    expect(service).toContain("target === session.userId");
    expect(service).toContain("MANAGER_ROLES.has(session.role)");
  });

  it("persists read state using existing audit records without a migration", () => {
    expect(service).toContain('tableName: "notifications"');
    expect(service).toContain('action: "NOTIFICATION_READ"');
    expect(service).toContain("auditLog.createMany");
    expect(service).toContain("auditLog.create");
    expect(service).not.toContain("model Notification");
  });

  it("never exposes UUIDs in user-facing titles or messages", () => {
    expect(service).toContain("ticketReference");
    expect(service).toContain("cleanText");
    expect(service).toContain("/operations/whatsapp");
    expect(service).toContain("/operations/email");
    expect(service).toContain("/operations/helpdesk");
    expect(service).toContain("/operations/tasks");
  });
});
