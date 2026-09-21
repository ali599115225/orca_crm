"use server";

import { assertServerActionRole } from "@/lib/api-auth-guard";
import {
  listOperationalNotifications,
  markAllOperationalNotificationsRead,
  markOperationalNotificationRead,
  type OperationalNotification,
} from "@/lib/operational-notifications";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

const NOTIFICATION_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

async function requireNotificationSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const verified = await assertServerActionRole(
    session,
    NOTIFICATION_ROLES,
  );

  return {
    tenantId: verified.tenantId,
    userId: verified.userId,
    role: String(verified.role),
  };
}

export async function getHeaderNotificationsAction(): Promise<{
  success: boolean;
  notifications: OperationalNotification[];
}> {
  try {
    const session = await requireNotificationSession();
    const notifications = await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      () => listOperationalNotifications(session, 30),
    );

    return { success: true, notifications };
  } catch {
    return { success: false, notifications: [] };
  }
}

export async function markHeaderNotificationReadAction(
  notificationId: string,
) {
  try {
    const session = await requireNotificationSession();
    await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      () => markOperationalNotificationRead(session, notificationId),
    );

    return { success: true as const };
  } catch {
    return { success: false as const };
  }
}

export async function markAllHeaderNotificationsReadAction() {
  try {
    const session = await requireNotificationSession();
    const count = await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      () => markAllOperationalNotificationsRead(session),
    );

    return { success: true as const, count };
  } catch {
    return { success: false as const, count: 0 };
  }
}
