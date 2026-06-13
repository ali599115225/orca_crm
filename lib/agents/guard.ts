// lib/agents/guard.ts
// Agent Runtime Guard — centralized operational policy for all AI agents
// Enforces: Global Kill Switch, Vacation Mode, Emergency Mode, Approval Mode
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export type AgentActionType = "ANALYSIS" | "RECOMMENDATION" | "EXECUTION" | "ADMIN";

export type AgentGuardResult =
  | { allowed: true; mode: string }
  | { allowed: false; blocked: true; code: string; reason: string; mode: string };

export async function assertAgentCanRun(params: {
  tenantId?: string;
  userId?: string;
  agentName: string;
  actionType: AgentActionType;
  source?: string;
}): Promise<AgentGuardResult> {
  let mode = "NORMAL_MODE";

  try {
    const config = await prisma.sentinelConfig.findFirst();
    if (config) {
      mode = config.operatingMode || "NORMAL_MODE";
    }
  } catch {
    // DB unavailable — err on the side of safety
    return { allowed: false, blocked: true, code: "GUARD_DB_ERROR", reason: "Cannot verify operating mode", mode: "UNKNOWN" };
  }

  const { agentName, actionType, tenantId, userId } = params;

  // ── 1. Global AI Kill Switch ──
  if (process.env.AGENTS_DISABLED === "true") {
    // Sentinel diagnostics + SANAD reminders survive Kill Switch
    if (agentName === "SENTINEL" && actionType === "ANALYSIS") {
      return { allowed: true, mode };
    }
    if (agentName === "SANAD") {
      return { allowed: true, mode };
    }

    await logBlocked(params, "GLOBAL_KILL_SWITCH", "AI agents are globally disabled", mode);
    return { allowed: false, blocked: true, code: "GLOBAL_KILL_SWITCH", reason: "AI agents are globally disabled", mode };
  }

  // ── 2. Emergency Mode — block everything except Sentinel diagnostics ──
  if (mode === "EMERGENCY_MODE") {
    if (agentName === "SENTINEL" && actionType === "ANALYSIS") {
      return { allowed: true, mode };
    }

    await logBlocked(params, "EMERGENCY_MODE", "Emergency mode active — agents suspended", mode);
    return { allowed: false, blocked: true, code: "EMERGENCY_MODE", reason: "Emergency mode active — agents suspended", mode };
  }

  // ── 3. Vacation Mode — allow analysis + recommendation, block execution + admin ──
  if (mode === "VACATION_MODE") {
    if (actionType === "ANALYSIS" || actionType === "RECOMMENDATION") {
      return { allowed: true, mode };
    }

    await logBlocked(params, "VACATION_MODE", `Agent ${actionType} blocked in vacation mode`, mode);
    return { allowed: false, blocked: true, code: "VACATION_MODE", reason: `Agent ${actionType} blocked during vacation mode`, mode };
  }

  // ── 4. Approval Mode — execution only via approval (existing flow) ──
  if (mode === "APPROVAL_MODE") {
    if (actionType === "EXECUTION") {
      await logBlocked(params, "APPROVAL_MODE", "Direct execution blocked — approval required", mode);
      return { allowed: false, blocked: true, code: "APPROVAL_MODE", reason: "Direct execution not allowed — requires approval", mode };
    }
    return { allowed: true, mode };
  }

  // ── 5. NORMAL_MODE — everything allowed ──
  return { allowed: true, mode };
}

async function logBlocked(
  params: { tenantId?: string; userId?: string; agentName: string; actionType: string; source?: string },
  code: string,
  reason: string,
  mode: string
) {
  if (!params.tenantId) return;
  try {
    await writeAuditLog({
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: "AGENT_BLOCKED_OPERATION_MODE" as any,
      tableName: "sentinel_command",
      recordId: params.agentName,
      details: JSON.stringify({
        agentName: params.agentName,
        actionType: params.actionType,
        code,
        reason,
        mode,
        source: params.source || "GUARD",
      }),
    });
  } catch {}
}
