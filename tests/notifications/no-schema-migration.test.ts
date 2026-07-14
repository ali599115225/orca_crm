import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(
  resolve(process.cwd(), "prisma/schema.prisma"),
  "utf8",
);
const service = readFileSync(
  resolve(process.cwd(), "lib/operational-notifications.ts"),
  "utf8",
);

describe("notification storage compatibility", () => {
  it("reuses existing domain tables and audit log read receipts", () => {
    expect(schema).toContain("model AuditLog");
    expect(schema).toContain("model WhatsAppMessage");
    expect(schema).toContain("model EmailMessage");
    expect(schema).toContain("model Task");
    expect(schema).toContain("model Ticket");
    expect(service).toContain("NOTIFICATION_READ");
  });

  it("does not require a Notification model or migration", () => {
    expect(schema).not.toContain("model Notification");
  });
});
