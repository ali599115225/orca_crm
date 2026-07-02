// lib/plan-guard.ts
// Centralized plan enforcement — single source of truth for limits and guarding
import { prisma } from "./prisma";
import type { PrismaClient } from "@prisma/client";
import { getDeploymentLicenseMode } from "./deployment-license";

// Transaction client type — derived from the extended prisma instance
type PrismaTx = Parameters<Parameters<(typeof prisma)["$transaction"]>[0]>[0];

// ── Canonical plan type ──
export type CanonicalPlan = "basic" | "silver" | "gold";

// ── Legacy alias normalization ──
const PLAN_ALIAS_MAP: Record<string, CanonicalPlan> = {
  basic: "basic",
  starter: "basic",
  silver: "silver",
  pro: "silver",
  professional: "silver",
  gold: "gold",
  diamond: "gold",
  platinum: "gold",
  enterprise: "gold",
};

export function normalizePlan(plan: string | null | undefined): CanonicalPlan {
  const key = (plan || "").toLowerCase().trim();
  return PLAN_ALIAS_MAP[key] || "basic";
}

// ── Centralized plan limits ──
// null = unlimited
type PlanLimitValue = number | null;

export const PLAN_LIMITS: Record<
  CanonicalPlan,
  {
    leads: PlanLimitValue;
    staff: PlanLimitValue;
    projects: PlanLimitValue;
    aiAgents: PlanLimitValue;
    whatsapp: boolean;
  }
> = {
  basic: { leads: 100, staff: 2, projects: 2, aiAgents: 1, whatsapp: false },
  silver: {
    leads: 1000,
    staff: 10,
    projects: 10,
    aiAgents: 2,
    whatsapp: false,
  },
  gold: {
    leads: null,
    staff: null,
    projects: null,
    aiAgents: 5,
    whatsapp: true,
  },
};

// ── Feature-to-table mapping for count queries ──
const FEATURE_TABLE: Record<string, string> = {
  leads: "Lead",
  staff: "User",
  projects: "Project",
  aiAgents: "AgentSlot",
};

export type CountFeature = "leads" | "staff" | "projects" | "aiAgents";
type GateFeature = "whatsapp";

// ── Structured error class ──
export class PlanLimitError extends Error {
  code: "PLAN_LIMIT_EXCEEDED" | "PLAN_FEATURE_BLOCKED";
  feature: string;
  plan: CanonicalPlan;
  limit?: number;
  current?: number;
  upgradeRequired: true;
  statusCode: number;

  constructor(params: {
    code: "PLAN_LIMIT_EXCEEDED" | "PLAN_FEATURE_BLOCKED";
    feature: string;
    plan: CanonicalPlan;
    limit?: number;
    current?: number;
  }) {
    const msg =
      params.code === "PLAN_LIMIT_EXCEEDED"
        ? `تجاوز الحد الأقصى: الباقة ${params.plan} تسمح بـ ${params.limit} ${params.feature} (الحالي: ${params.current})`
        : `خاصية ${params.feature} غير متاحة في الباقة ${params.plan}. يرجى الترقية.`;
    super(msg);
    this.name = "PlanLimitError";
    this.code = params.code;
    this.feature = params.feature;
    this.plan = params.plan;
    this.limit = params.limit;
    this.current = params.current;
    this.upgradeRequired = true;
    this.statusCode = 403;
  }

  toJSON() {
    return {
      code: this.code,
      feature: this.feature,
      plan: this.plan,
      limit: this.limit,
      current: this.current,
      upgradeRequired: this.upgradeRequired,
      message: this.message,
    };
  }
}

// ── Helpers ──
export function getPlanLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export function isFeatureAccessible(
  tenantPlan: string | null | undefined,
  feature: GateFeature,
): boolean {
  const p = normalizePlan(tenantPlan);
  return PLAN_LIMITS[p][feature] as boolean;
}

// ── Enforcement: count-based limits ──
// Must be called with a transaction client (`tx`) for race safety.
// Uses SELECT ... FOR UPDATE on the tenant row to serialize concurrent checks.
export async function assertPlanLimit(params: {
  tenantId: string;
  feature: CountFeature;
  tx: PrismaTx;
}): Promise<void> {
  if (getDeploymentLicenseMode() === "DEDICATED_COPY") return;

  const db = params.tx;

  // 1. Lock the tenant row to serialize concurrent count checks
  await db.$queryRaw`SELECT id FROM "tenants" WHERE id = ${params.tenantId} FOR UPDATE`;

  // 2. Fetch plan
  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: { subscriptionPlan: true },
  });

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const plan = normalizePlan(tenant.subscriptionPlan);
  const limit = PLAN_LIMITS[plan][params.feature] as PlanLimitValue;

  // null = unlimited
  if (limit === null) return;

  // 3. Count current usage (safe — tenant row is locked)
  let current: number;

  switch (params.feature) {
    case "leads":
      current = await db.lead.count({ where: { tenantId: params.tenantId } });
      break;
    case "staff":
      current = await db.user.count({ where: { tenantId: params.tenantId } });
      break;
    case "projects":
      current = await db.project.count({
        where: { tenantId: params.tenantId },
      });
      break;
    case "aiAgents":
      current = await db.agentSlot.count({
        where: { tenantId: params.tenantId, isActive: true },
      });
      break;
    default:
      current = 0;
  }

  if (current >= limit) {
    throw new PlanLimitError({
      code: "PLAN_LIMIT_EXCEEDED",
      feature: params.feature,
      plan,
      limit,
      current,
    });
  }
}

// ── Audit log helper — called OUTSIDE transaction after catching PlanLimitError ──
export async function logPlanBlockedAttempt(params: {
  tenantId: string;
  error: PlanLimitError;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      action: "PLAN_LIMIT_BLOCKED",
      tableName: FEATURE_TABLE[params.error.feature] || params.error.feature,
      recordId: "SYSTEM",
      details: params.error.message,
    },
  });
}

// ── Enforcement: boolean feature access (WhatsApp) ──
export async function canUseFeature(params: {
  tenantId: string;
  feature: GateFeature;
  tx?: PrismaTx;
}): Promise<boolean> {
  if (getDeploymentLicenseMode() === "DEDICATED_COPY") return true;

  const db = params.tx || prisma;
  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: { subscriptionPlan: true },
  });

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return isFeatureAccessible(tenant.subscriptionPlan, params.feature);
}

export async function assertFeatureAccess(params: {
  tenantId: string;
  feature: GateFeature;
  tx?: PrismaTx;
}): Promise<void> {
  const allowed = await canUseFeature(params);

  if (!allowed) {
    const db = params.tx || prisma;
    const tenant = await db.tenant.findUnique({
      where: { id: params.tenantId },
      select: { subscriptionPlan: true },
    });

    const plan = normalizePlan(tenant?.subscriptionPlan);

    throw new PlanLimitError({
      code: "PLAN_FEATURE_BLOCKED",
      feature: params.feature,
      plan,
    });
  }
}
