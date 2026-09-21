// lib/sentinel/audit.ts
// Sentinel audit logging — wraps existing AuditLog with Sentinel-specific metadata
import { prisma } from "@/lib/prisma";

export interface SentinelAuditParams {
  eventType: string;
  scope?: string;
  tenantId?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source?: string;
  decision?: string;
  reason?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  actionTaken?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  beforeState?: string;
  afterState?: string;
  correlationId?: string;
}

export async function writeSentinelAudit(params: SentinelAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId || "00000000-0000-0000-0000-000000000000",
      userId: null,
      action: params.eventType,
      tableName: "sentinel_command",
      recordId: params.correlationId || "sentinel",
      details: JSON.stringify({
        actorType: "SENTINEL",
        actorId: "platform_sentinel",
        scope: params.scope || "PLATFORM",
        severity: params.severity || "LOW",
        source: params.source || "SYSTEM",
        decision: params.decision || "",
        reason: params.reason || "",
        riskLevel: params.riskLevel || "LOW",
        actionTaken: params.actionTaken || "",
        approvalRequired: params.approvalRequired || false,
        approvedBy: params.approvedBy || null,
        beforeState: params.beforeState || null,
        afterState: params.afterState || null,
        correlationId: params.correlationId || null,
      }),
    },
  });
}
