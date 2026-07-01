/**
 * System Prisma Boundary — R01 Tenant Isolation Closure
 *
 * This module defines the explicit allowlist of runtime modules permitted to
 * import the raw (un-extended) Prisma client. All other tenant-facing runtime
 * code MUST use the tenant-aware `prisma` export from `@/lib/prisma`.
 *
 * The raw client bypasses tenant middleware and must only be used where tenant
 * context is not yet available or where cross-tenant/infrastructure operations
 * are architecturally required.
 *
 * AUTH_BOOTSTRAP capabilities:
 * This module also exports narrow, named functions for pre-context authentication
 * operations. These encapsulate rawPrisma access and are the ONLY approved way for
 * lib/api-auth-guard.ts to perform database lookups before tenant context is established.
 *
 * Approved AUTH_BOOTSTRAP consumers:
 * - lib/api-auth-guard.ts (isSuperAdmin, hasDatabaseRole)
 */

let _rawPrisma: import("@prisma/client").PrismaClient | null = null;
function getRawPrisma(): import("@prisma/client").PrismaClient {
  if (!_rawPrisma) {
    _rawPrisma = require("@/lib/prisma").rawPrisma;
  }
  const cached = _rawPrisma;
  if (!cached) throw new Error("rawPrisma unavailable");
  return cached;
}

export const SYSTEM_CLIENT_CATEGORIES = {
  AUTH_BOOTSTRAP: "authentication bootstrap before tenant binding",
  PLATFORM_SENTINEL: "platform Sentinel operations",
  CROSS_TENANT_WORKER: "cross-tenant workers/outbox/cron",
  WEBHOOK_INGRESS: "webhook ingress before tenant binding",
  AUDIT_INFRASTRUCTURE: "audit/infrastructure operations",
  PRISMA_CORE: "prisma core module (client creation and middleware)",
} as const;

export type SystemClientCategory =
  (typeof SYSTEM_CLIENT_CATEGORIES)[keyof typeof SYSTEM_CLIENT_CATEGORIES];

export interface SystemClientAllowlistEntry {
  module: string;
  category: SystemClientCategory;
  justification: string;
}

export const SYSTEM_CLIENT_ALLOWLIST: readonly SystemClientAllowlistEntry[] = [
  {
    module: "lib/system-prisma-boundary.ts",
    category: SYSTEM_CLIENT_CATEGORIES.PRISMA_CORE,
    justification:
      "Encapsulates raw Prisma access and exports narrow AUTH_BOOTSTRAP capabilities for pre-context authentication lookups.",
  },
  {
    module: "lib/prisma.ts",
    category: SYSTEM_CLIENT_CATEGORIES.PRISMA_CORE,
    justification:
      "Creates the raw Prisma client instance and the extended tenant-aware client. Internal to the prisma module.",
  },
  {
    module: "lib/audit.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUDIT_INFRASTRUCTURE,
    justification:
      "Writes AuditLog records using rawPrisma to avoid recursive tenant middleware interception.",
  },
  {
    module: "lib/compliance-gateway.ts",
    category: SYSTEM_CLIENT_CATEGORIES.PLATFORM_SENTINEL,
    justification:
      "Platform Sentinel compliance checking reads tenant and audit data across tenant boundaries.",
  },
  {
    module: "lib/saudi-trust-gate/index.ts",
    category: SYSTEM_CLIENT_CATEGORIES.PLATFORM_SENTINEL,
    justification:
      "Saudi trust gate resolves tenant, contract, device, and audit records for government submission.",
  },
  {
    module: "lib/revenue-integrity/trust-gates.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue provider connection management operates across tenants for platform-level integrations.",
  },
  {
    module: "lib/revenue-integrity/queries.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue dashboard queries aggregate cross-tenant data for platform analytics.",
  },
  {
    module: "lib/revenue-integrity/radar.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue leak radar scans cross-tenant risk signals and rule runs.",
  },
  {
    module: "lib/revenue-integrity/predictive.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue predictive model training and scoring operates cross-tenant.",
  },
  {
    module: "lib/revenue-integrity/predictive-intelligence.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue predictive intelligence uses raw SQL and cross-tenant aggregation.",
  },
  {
    module: "lib/revenue-integrity/events.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue outbox event dispatch and processing operates cross-tenant.",
  },
  {
    module: "lib/revenue-integrity/conversation-to-action.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue conversation-to-action suggestion engine operates cross-tenant.",
  },
  {
    module: "app/actions/auth.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUTH_BOOTSTRAP,
    justification:
      "Login server action resolves user and tenant before tenant context is established.",
  },
  {
    module: "app/actions/register.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUTH_BOOTSTRAP,
    justification:
      "Tenant registration checks uniqueness before any tenant context exists.",
  },
  {
    module: "app/actions/compliance.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUDIT_INFRASTRUCTURE,
    justification:
      "Compliance server action writes audit logs using rawPrisma to avoid recursive middleware.",
  },
  {
    module: "app/actions/revenue-integrity.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue integrity server actions dispatch cross-tenant revenue operations.",
  },
  {
    module: "app/api/v1/auth/login/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUTH_BOOTSTRAP,
    justification:
      "Login API route resolves user, failed attempts, and rate limiting before tenant binding.",
  },
  {
    module: "app/api/db-init/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.AUDIT_INFRASTRUCTURE,
    justification:
      "Database initialization executes raw DDL/DML for schema bootstrapping.",
  },
  {
    module: "app/api/cron/revenue-integrity/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Revenue integrity cron iterates all tenants for cross-tenant processing.",
  },
  {
    module: "app/api/cron/retention/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.CROSS_TENANT_WORKER,
    justification:
      "Retention cron executes cross-tenant data lifecycle raw SQL operations.",
  },
] as const;

export const SYSTEM_CLIENT_ALLOWLIST_MODULES = SYSTEM_CLIENT_ALLOWLIST.map(
  (entry) => entry.module,
);

export function isAllowlistedSystemClient(modulePath: string): boolean {
  return SYSTEM_CLIENT_ALLOWLIST_MODULES.includes(modulePath);
}

/**
 * AUTH_BOOTSTRAP capabilities — narrow, named functions for pre-context authentication.
 *
 * These functions encapsulate rawPrisma access and are the ONLY approved way for
 * lib/api-auth-guard.ts to perform database lookups before tenant context is established.
 *
 * Each function:
 * - Uses minimal selects (only the fields needed)
 * - Uses explicit userId/tenantId predicates
 * - Returns null on not-found or error
 * - Does NOT expose a generic Prisma client or unrestricted query callback
 */

export async function authBootstrapFindUserEmail(
  userId: string,
): Promise<{ email: string } | null> {
  if (!userId) return null;
  try {
    return await getRawPrisma().user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
  } catch {
    return null;
  }
}

export async function authBootstrapFindUserRole(
  userId: string,
  tenantId: string,
): Promise<{ role: string } | null> {
  if (!userId || !tenantId) return null;
  try {
    return await getRawPrisma().user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true },
    });
  } catch {
    return null;
  }
}

export async function authBootstrapFindTenantActive(
  tenantId: string,
): Promise<{ id: string } | null> {
  if (!tenantId) return null;
  try {
    return await getRawPrisma().tenant.findFirst({
      where: { id: tenantId, isActive: true },
      select: { id: true },
    });
  } catch {
    return null;
  }
}
