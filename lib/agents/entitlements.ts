export const AGENT_CODES = [
  "MANSOUR",
  "SAHER",
  "SANAD",
  "BASEER",
  "KHABEER",
] as const;

export type AgentCode = (typeof AGENT_CODES)[number];

export type SupportedPlan =
  | "basic"
  | "silver"
  | "gold"
  | "platinum"
  | "professional"
  | "diamond";

export interface PlanAgentEntitlement {
  plan: SupportedPlan;
  activeAgentLimit: number;
  includedAgents: readonly AgentCode[];
}

const ALL_AGENTS: readonly AgentCode[] = AGENT_CODES;

export const AGENT_MONTHLY_PRICE_SAR = 250;

export const PLAN_AGENT_ENTITLEMENTS: Record<
  SupportedPlan,
  PlanAgentEntitlement
> = {
  basic: {
    plan: "basic",
    activeAgentLimit: 1,
    includedAgents: ["MANSOUR"],
  },
  silver: {
    plan: "silver",
    activeAgentLimit: 2,
    includedAgents: ["MANSOUR", "SAHER"],
  },
  gold: {
    plan: "gold",
    activeAgentLimit: 5,
    includedAgents: ALL_AGENTS,
  },
  platinum: {
    plan: "platinum",
    activeAgentLimit: 5,
    includedAgents: ALL_AGENTS,
  },
  professional: {
    plan: "professional",
    activeAgentLimit: 5,
    includedAgents: ALL_AGENTS,
  },
  diamond: {
    plan: "diamond",
    activeAgentLimit: 5,
    includedAgents: ALL_AGENTS,
  },
};

export function normalizeAgentPlan(value: unknown): SupportedPlan {
  const normalized = String(value || "basic").trim().toLowerCase();

  if (normalized in PLAN_AGENT_ENTITLEMENTS) {
    return normalized as SupportedPlan;
  }

  return "basic";
}

export function getPlanAgentEntitlement(
  plan: unknown,
): PlanAgentEntitlement {
  return PLAN_AGENT_ENTITLEMENTS[normalizeAgentPlan(plan)];
}

export function isKnownAgentCode(value: unknown): value is AgentCode {
  return AGENT_CODES.includes(
    String(value || "").trim().toUpperCase() as AgentCode,
  );
}

export function isAgentIncludedInPlan(
  plan: unknown,
  agentCode: AgentCode,
): boolean {
  return getPlanAgentEntitlement(plan).includedAgents.includes(agentCode);
}

export function getEffectiveActiveAgentLimit(
  plan: unknown,
  activeSubscriptionCount: number,
): number {
  const baseLimit = getPlanAgentEntitlement(plan).activeAgentLimit;
  const paidAdditions = Math.max(0, Math.floor(activeSubscriptionCount));

  return Math.min(AGENT_CODES.length, baseLimit + paidAdditions);
}

export type AgentAccessSource =
  | "PLAN"
  | "SUBSCRIPTION"
  | "LOCKED";

export function resolveAgentAccessSource(input: {
  plan: unknown;
  agentCode: AgentCode;
  hasActiveSubscription: boolean;
}): AgentAccessSource {
  if (isAgentIncludedInPlan(input.plan, input.agentCode)) {
    return "PLAN";
  }

  if (input.hasActiveSubscription) {
    return "SUBSCRIPTION";
  }

  return "LOCKED";
}

export function canActivateAgent(input: {
  plan: unknown;
  agentCode: AgentCode;
  activeAgentCount: number;
  activeSubscriptionCount: number;
  hasActiveSubscription: boolean;
}): {
  allowed: boolean;
  source: AgentAccessSource;
  effectiveLimit: number;
  reason:
    | "ALLOWED"
    | "AGENT_NOT_ENTITLED"
    | "ACTIVE_AGENT_LIMIT_REACHED";
} {
  const source = resolveAgentAccessSource(input);
  const effectiveLimit = getEffectiveActiveAgentLimit(
    input.plan,
    input.activeSubscriptionCount,
  );

  if (source === "LOCKED") {
    return {
      allowed: false,
      source,
      effectiveLimit,
      reason: "AGENT_NOT_ENTITLED",
    };
  }

  if (input.activeAgentCount >= effectiveLimit) {
    return {
      allowed: false,
      source,
      effectiveLimit,
      reason: "ACTIVE_AGENT_LIMIT_REACHED",
    };
  }

  return {
    allowed: true,
    source,
    effectiveLimit,
    reason: "ALLOWED",
  };
}
