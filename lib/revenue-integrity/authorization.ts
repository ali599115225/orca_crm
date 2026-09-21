import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  assertServerActionRole,
  isSuperAdmin,
  TENANT_ROLES,
} from "@/lib/api-auth-guard";
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
  ADMIN: ALL,
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
  MARKETING: [
    "revenue.action.read",
    "revenue.predictive.read",
  ],
  READ_ONLY: [
    "revenue.risk.read",
    "revenue.action.read",
    "revenue.trust.read",
    "revenue.predictive.read",
  ],
};

export type RevenueCapabilities = {
  canReadRisks: boolean;
  canManageRisks: boolean;
  canReadActions: boolean;
  canApproveActions: boolean;
  canReadTrust: boolean;
  canManageTrust: boolean;
  canReadAudit: boolean;
  canReadPredictive: boolean;
  canManagePredictive: boolean;
};

export type RevenueAuthorizationContext = {
  tenantId: string;
  userId: string;
  role: string;
  email?: string;
  capabilities: RevenueCapabilities;
};

function capabilitiesForRole(
  role: string,
): RevenueCapabilities {
  return capabilitiesForPermissions(ROLE_PERMISSIONS[role] || []);
}

function capabilitiesForPermissions(
  permissions: readonly RevenuePermission[],
): RevenueCapabilities {
  const granted = new Set(permissions);

  return {
    canReadRisks: granted.has("revenue.risk.read"),
    canManageRisks: granted.has("revenue.risk.manage"),
    canReadActions: granted.has("revenue.action.read"),
    canApproveActions: granted.has("revenue.action.approve"),
    canReadTrust: granted.has("revenue.trust.read"),
    canManageTrust: granted.has("revenue.trust.manage"),
    canReadAudit: granted.has("revenue.audit.read"),
    canReadPredictive: granted.has(
      "revenue.predictive.read",
    ),
    canManagePredictive: granted.has(
      "revenue.predictive.manage",
    ),
  };
}

export async function requireRevenuePermission(
  permission: RevenuePermission,
): Promise<RevenueAuthorizationContext> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }

  const verified = await assertServerActionRole(
    session,
    TENANT_ROLES,
  );

  const tenant = await getActiveTenant();
  if (String(verified.tenantId) !== String(tenant.id)) {
    throw new Error("CROSS_TENANT_ACCESS_DENIED");
  }

  const platformAdmin = await isSuperAdmin(
    String(verified.userId),
  );

  const role = platformAdmin
    ? "SUPER_ADMIN"
    : String(
        (
          await prisma.user.findFirst({
            where: {
              id: String(verified.userId),
              tenantId: String(tenant.id),
            },
            select: { role: true },
          })
        )?.role || "",
      );

  const capabilities = platformAdmin
    ? capabilitiesForPermissions(ALL)
    : capabilitiesForRole(role);
  const permissionGranted: Record<
    RevenuePermission,
    boolean
  > = {
    "revenue.risk.read": capabilities.canReadRisks,
    "revenue.risk.manage": capabilities.canManageRisks,
    "revenue.action.read": capabilities.canReadActions,
    "revenue.action.approve":
      capabilities.canApproveActions,
    "revenue.trust.read": capabilities.canReadTrust,
    "revenue.trust.manage": capabilities.canManageTrust,
    "revenue.audit.read": capabilities.canReadAudit,
    "revenue.predictive.read":
      capabilities.canReadPredictive,
    "revenue.predictive.manage":
      capabilities.canManagePredictive,
  };

  if (!permissionGranted[permission]) {
    throw new Error(`FORBIDDEN:${permission}`);
  }

  return {
    tenantId: String(tenant.id),
    userId: String(verified.userId),
    role,
    email: session.email
      ? String(session.email)
      : undefined,
    capabilities,
  };
}

export function assertSystemTenantId(
  tenantId: string,
): string {
  const value = String(tenantId || "").trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("INVALID_TENANT_ID");
  }
  return value;
}
