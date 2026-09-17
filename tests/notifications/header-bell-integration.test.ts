import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const header = readFileSync(
  resolve(process.cwd(), "app/components/SovereignHeader.tsx"),
  "utf8",
);
const actions = readFileSync(
  resolve(process.cwd(), "app/actions/notifications.ts"),
  "utf8",
);

describe("header notification bell", () => {
  it("loads persistent notifications instead of transient toast state", () => {
    expect(header).toContain("getHeaderNotificationsAction");
    expect(header).toContain("setInterval");
    expect(header).toContain("30000");
    expect(header).not.toContain("useNotify()");
  });

  it("shows unread count and supports single and bulk read actions", () => {
    expect(header).toContain("!notification.read");
    expect(header).toContain("markHeaderNotificationReadAction");
    expect(header).toContain("markAllHeaderNotificationsReadAction");
    expect(header).toContain("markAllNotificationsRead");
  });

  it("opens the operational page attached to the notification", () => {
    expect(header).toContain("router.push(notification.href)");
    expect(header).toContain("openNotification");
  });

  it("uses tenant-scoped server actions for all bell operations", () => {
    expect(actions).toContain("assertServerActionRole");
    expect(actions).toContain("runWithTenantContext");
    expect(actions).toContain("tenantId: session.tenantId");
    expect(actions).toContain("userId: session.userId");
  });

  it("never refreshes notifications inside a React state updater", () => {
    expect(header).toContain("const handleNotificationsToggle = () =>");
    expect(header).toContain("const nextOpen = !notificationsOpen");
    expect(header).toContain("setNotificationsOpen(nextOpen)");
    expect(header).toContain("if (nextOpen)");
    expect(header).toContain("void refreshNotifications()");
    expect(header).toContain("onClick={handleNotificationsToggle}");
    expect(header).not.toContain("setNotificationsOpen((open) => {");
  });
  it("portals the notification window to document.body", () => {
    expect(header).toContain("import { createPortal } from 'react-dom'");
    expect(header).toContain("notificationsPanelRef");
    expect(header).toContain("createPortal(");
    expect(header).toContain("document.body");
    expect(header).toContain("ref={notificationsPanelRef}");
    expect(header).toContain("clickedTrigger");
    expect(header).toContain("clickedPanel");
    expect(header).not.toContain("{notificationsOpen && (");
  });});
