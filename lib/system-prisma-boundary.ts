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

import { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";

function getRawPrisma(): import("@prisma/client").PrismaClient {
  return rawPrisma;
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
  {
    module: "app/api/payments/custom/return/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.WEBHOOK_INGRESS,
    justification:
      "Signed payment-provider browser return resolves the transaction before tenant binding, then verifies the connection tenant before reconciliation.",
  },
  {
    module: "app/api/payments/custom/webhook/[connectionId]/route.ts",
    category: SYSTEM_CLIENT_CATEGORIES.WEBHOOK_INGRESS,
    justification:
      "Signed custom payment webhook resolves its tenant-scoped provider connection before tenant binding and rejects cross-tenant transactions.",
  },
  {
    module: "lib/payments/custom-payment-reconciliation.ts",
    category: SYSTEM_CLIENT_CATEGORIES.WEBHOOK_INGRESS,
    justification:
      "Authoritative custom-payment reconciliation is invoked from signed ingress routes and validates transaction and provider tenant ownership before financial completion.",
  },

] as const;

export const SYSTEM_CLIENT_ALLOWLIST_MODULES = SYSTEM_CLIENT_ALLOWLIST.map(
  (entry) => entry.module,
);

export function isAllowlistedSystemClient(modulePath: string): boolean {
  return SYSTEM_CLIENT_ALLOWLIST_MODULES.includes(modulePath);
}
const DATABASE_INITIALIZATION_STATEMENTS = [
  Prisma.sql`
    CREATE OR REPLACE FUNCTION check_agent_slots_cap()
    RETURNS TRIGGER AS $$
    DECLARE
      tenant_plan VARCHAR(50);
      active_slots_count INT;
      max_slots INT;
    BEGIN
      SELECT subscription_plan
      INTO tenant_plan
      FROM tenants
      WHERE id = NEW.tenant_id;

      CASE tenant_plan
        WHEN 'basic' THEN max_slots := 1;
        WHEN 'silver' THEN max_slots := 5;
        WHEN 'gold' THEN max_slots := 999999;
        ELSE max_slots := 1;
      END CASE;

      SELECT COUNT(*)
      INTO active_slots_count
      FROM agent_slots
      WHERE tenant_id = NEW.tenant_id
        AND is_active = TRUE;

      IF active_slots_count >= max_slots THEN
        RAISE EXCEPTION
          '🔒 CAP LOCK: الحد الأقصى للمقاعد في باقة (%) هو % مقاعد. يرجى ترقية باقتك.',
          tenant_plan,
          max_slots
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `,

  Prisma.sql`
    DROP TRIGGER IF EXISTS trigger_check_agent_slots_cap
    ON agent_slots
  `,

  Prisma.sql`
    CREATE TRIGGER trigger_check_agent_slots_cap
    BEFORE INSERT ON agent_slots
    FOR EACH ROW
    EXECUTE FUNCTION check_agent_slots_cap()
  `,

  Prisma.sql`
    CREATE OR REPLACE FUNCTION get_next_available_agent(p_tenant_id UUID)
    RETURNS UUID AS $$
    DECLARE
      next_agent_id UUID;
    BEGIN
      SELECT u.id
      INTO next_agent_id
      FROM users u
      LEFT JOIN (
        SELECT assigned_to, COUNT(*) AS lead_count
        FROM leads
        WHERE tenant_id = p_tenant_id
          AND assigned_to IS NOT NULL
        GROUP BY assigned_to
      ) lc ON lc.assigned_to = u.id
      WHERE u.tenant_id = p_tenant_id
        AND u.is_active = TRUE
        AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
      ORDER BY COALESCE(lc.lead_count, 0) ASC, u.created_at ASC
      LIMIT 1;

      RETURN next_agent_id;
    END;
    $$ LANGUAGE plpgsql
  `,

  Prisma.sql`
    CREATE OR REPLACE FUNCTION auto_assign_lead_round_robin()
    RETURNS TRIGGER AS $$
    DECLARE
      assigned_agent UUID;
    BEGIN
      IF NEW.assigned_to IS NULL THEN
        assigned_agent := get_next_available_agent(NEW.tenant_id);

        IF assigned_agent IS NOT NULL THEN
          NEW.assigned_to := assigned_agent;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `,

  Prisma.sql`
    DROP TRIGGER IF EXISTS trigger_leads_round_robin
    ON leads
  `,

  Prisma.sql`
    CREATE TRIGGER trigger_leads_round_robin
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_lead_round_robin()
  `,

  Prisma.sql`
    CREATE OR REPLACE FUNCTION sanitize_text_input(input_text TEXT)
    RETURNS TEXT AS $$
    BEGIN
      RETURN regexp_replace(
        regexp_replace(input_text, '<[^>]*>', '', 'g'),
        '(DROP|DELETE|INSERT|UPDATE|UNION|ALTER|EXEC|SCRIPT|JAVASCRIPT)',
        '***',
        'gi'
      );
    END;
    $$ LANGUAGE plpgsql
  `,

  Prisma.sql`
    CREATE OR REPLACE FUNCTION sanitize_lead_inputs()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.first_name := sanitize_text_input(NEW.first_name);

      IF NEW.last_name IS NOT NULL THEN
        NEW.last_name := sanitize_text_input(NEW.last_name);
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `,

  Prisma.sql`
    DROP TRIGGER IF EXISTS trigger_sanitize_leads
    ON leads
  `,

  Prisma.sql`
    CREATE TRIGGER trigger_sanitize_leads
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_lead_inputs()
  `,

  Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_agent_slots_tenant
    ON agent_slots(tenant_id)
  `,

  Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_usage_meters_tenant
    ON usage_meters(tenant_id)
  `,

  Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_payroll_tenant
    ON payroll_commissions(tenant_id)
  `,

  Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_leads_assigned
    ON leads(tenant_id, assigned_to)
  `,
] as const;

/**
 * Applies the fixed, compile-time database initialization definition.
 *
 * No caller-provided SQL or unrestricted Prisma client is accepted.
 */
export async function applyDatabaseInitialization(): Promise<number> {
  const client = getRawPrisma();

  for (const statement of DATABASE_INITIALIZATION_STATEMENTS) {
    await client.$executeRaw(statement);
  }

  return DATABASE_INITIALIZATION_STATEMENTS.length;
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

export async function authBootstrapFindUserByEmail(email: string) {
  if (!email) return null;

  return getRawPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
      tenant: {
        select: {
          id: true,
          isActive: true,
          subdomain: true,
        },
      },
    },
  });
}
/**
 * TENANT_RESOLUTION capabilities.
 *
 * Resolves an active tenant before tenant-aware Prisma context exists.
 * These functions do not expose a generic Prisma client.
 */
export async function tenantResolutionFindActiveById(tenantId: string) {
  if (!tenantId) return null;

  return getRawPrisma().tenant.findFirst({
    where: {
      id: tenantId,
      isActive: true,
    },
  });
}

export async function tenantResolutionFindActiveBySubdomain(
  subdomain: string,
) {
  if (!subdomain) return null;

  return getRawPrisma().tenant.findFirst({
    where: {
      subdomain,
      isActive: true,
    },
  });
}

export async function tenantResolutionFindFirstActive() {
  return getRawPrisma().tenant.findFirst({
    where: {
      isActive: true,
    },
  });
}
