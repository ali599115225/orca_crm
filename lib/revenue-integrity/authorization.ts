import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import type { RevenuePermission } from "./contracts";

const ALL: RevenuePermission[] = [
  "revenue.risk.read",
  "revenue.risk.manage",
  "revenue.action.read",
  "revenue.action.approve",
  "revenue.trust.read",
  "revenue.trust.manage",
  "revenue.audit.read",
  "revenue.predictive.read",
  "revenue.predictive.manage",
];

const ROLE_PERMISSIONS: Record<string, RevenuePermission[]> = {
  SUPER_ADMIN: ALL,
  PLATFORM_ARCHITECT: ALL,
  ADMIN: ALL,
  OWNER: ALL,
  owner: ALL,
  SALES_MANAGER: [
    "revenue.risk.read",
    "revenue.risk.manage",
    "revenue.action.read",
    "revenue.action.approve",
    "revenue.trust.read",
    "revenue.audit.read",
    "revenue.predictive.read",
  ],
  SALES_EMPLOYEE: [
    "revenue.risk.read",
    "revenue.action.read",
    "revenue.predictive.read",
  ],
  MARKETING: ["revenue.action.read", "revenue.predictive.read"],
  rental_manager: [
    "revenue.risk.read",
    "revenue.risk.manage",
    "revenue.action.read",
    "revenue.action.approve",
    "revenue.trust.read",
  ],
  accountant: [
    "revenue.risk.read",
    "revenue.risk.manage",
    "revenue.trust.read",
    "revenue.audit.read",
    "revenue.predictive.read",
  ],
  READ_ONLY: [
    "revenue.risk.read",
    "revenue.action.read",
    "revenue.trust.read",
    "revenue.predictive.read",
  ],
};

export type RevenueAuthorizationContext = {
  tenantId: string;
  userId: string;
  role: string;
  email?: string;
};

export async function requireRevenuePermission(
  permission: RevenuePermission,
): Promise<RevenueAuthorizationContext> {
  const session = await getSession();
  if (!session?.userId) throw new Error("AUTHENTICATION_REQUIRED");

  const tenant = await getActiveTenant();
  const role = String(session.role || "READ_ONLY");
  const permissions = ROLE_PERMISSIONS[role] || [];

  if (!permissions.includes(permission)) {
    throw new Error(`FORBIDDEN:${permission}`);
  }

  const sessionTenantId = String(session.tenantId || "");
  const platformRole = role === "SUPER_ADMIN" || role === "PLATFORM_ARCHITECT";
  if (!platformRole && sessionTenantId && sessionTenantId !== tenant.id) {
    throw new Error("CROSS_TENANT_ACCESS_DENIED");
  }

  return {
    tenantId: tenant.id,
    userId: String(session.userId),
    role,
    email: session.email ? String(session.email) : undefined,
  };
}

export function assertSystemTenantId(tenantId: string): string {
  const value = String(tenantId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("INVALID_TENANT_ID");
  }
  return value;
}
