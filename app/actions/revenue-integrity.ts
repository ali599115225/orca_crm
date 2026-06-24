"use server";

import { revalidatePath } from "next/cache";
import { rawPrisma } from "@/lib/prisma";
import { requireRevenuePermission } from "@/lib/revenue-integrity/authorization";
import {
  acknowledgeRevenueRisk,
  evaluateRevenueLeakRadar,
  resolveRevenueRisk,
} from "@/lib/revenue-integrity/radar";
import {
  analyzeConversationToAction,
  approveActionSuggestion,
  executeActionSuggestion,
  rejectActionSuggestion,
} from "@/lib/revenue-integrity/conversation-to-action";
import {
  disconnectProviderConnection,
  listProviderApplications,
  listProviderConnections,
  saveProviderConnection,
  submitProviderApplication,
  testProviderConnection,
} from "@/lib/revenue-integrity/trust-gates";
import {
  scoreOpenOpportunities,
  trainPredictiveModel,
} from "@/lib/revenue-integrity/predictive";
import {
  loadIntelligenceScores,
  scoreAllOpportunitiesIntelligence,
  scoreOpportunityIntelligence,
} from "@/lib/revenue-integrity/predictive-intelligence";
import { processRevenueOutbox } from "@/lib/revenue-integrity/events";
import { loadRevenueIntegrityDashboard } from "@/lib/revenue-integrity/queries";
import type { ProviderCredentials } from "@/lib/revenue-integrity/contracts";

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "UNKNOWN_REVENUE_INTEGRITY_ERROR";
}

function refresh() {
  revalidatePath("/operations/revenue-integrity");
  revalidatePath("/operations/settings");
}

export async function getRevenueIntegrityDashboardAction(): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.risk.read");
    return {
      success: true,
      data: await loadRevenueIntegrityDashboard(auth.tenantId),
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function runRevenueRadarAction(): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.risk.manage");
    const bucket = new Date().toISOString().slice(0, 13);
    const data = await evaluateRevenueLeakRadar(
      auth.tenantId,
      auth.userId,
      `manual:${auth.userId}:${bucket}`,
    );
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function acknowledgeRevenueRiskAction(
  riskId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.risk.manage");
    const data = await acknowledgeRevenueRisk(
      auth.tenantId,
      auth.userId,
      String(riskId),
    );
    refresh();
    return { success: true, data: { id: data.id, status: data.status } };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function resolveRevenueRiskAction(
  riskId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.risk.manage");
    const normalizedReason = String(reason || "").trim();
    if (normalizedReason.length < 3) throw new Error("RESOLUTION_REASON_REQUIRED");
    const data = await resolveRevenueRisk(
      auth.tenantId,
      auth.userId,
      String(riskId),
      normalizedReason,
    );
    refresh();
    return { success: true, data: { id: data.id, status: data.status } };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function analyzeConversationAction(input: {
  sourceType: "WHATSAPP" | "EMAIL" | "SUPPORT" | "MANUAL";
  sourceId: string;
  text: string;
  leadId?: string;
  opportunityId?: string;
  unitId?: string;
  contactId?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.action.read");
    const text = String(input.text || "").trim();
    const sourceId = String(input.sourceId || "").trim();
    if (text.length < 3) throw new Error("CONVERSATION_TEXT_REQUIRED");
    if (!sourceId) throw new Error("SOURCE_ID_REQUIRED");

    const data = await analyzeConversationToAction({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      sourceType: input.sourceType,
      sourceId,
      text,
      leadId: input.leadId || undefined,
      opportunityId: input.opportunityId || undefined,
      unitId: input.unitId || undefined,
      contactId: input.contactId || undefined,
    });
    refresh();
    return {
      success: true,
      data: {
        id: data.id,
        intent: data.intent,
        actionType: data.actionType,
        status: data.status,
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function approveRevenueSuggestionAction(
  suggestionId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.action.approve");
    const data = await approveActionSuggestion(
      auth.tenantId,
      auth.userId,
      String(suggestionId),
    );
    refresh();
    return {
      success: true,
      data: { id: data.id, status: data.status },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function rejectRevenueSuggestionAction(
  suggestionId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.action.approve");
    const normalizedReason = String(reason || "").trim();
    if (normalizedReason.length < 3) throw new Error("REJECTION_REASON_REQUIRED");
    const data = await rejectActionSuggestion(
      auth.tenantId,
      auth.userId,
      String(suggestionId),
      normalizedReason,
    );
    refresh();
    return {
      success: true,
      data: { id: data.id, status: data.status },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function executeRevenueSuggestionAction(
  suggestionId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.action.approve");
    const data = await executeActionSuggestion(
      auth.tenantId,
      auth.userId,
      String(suggestionId),
    );
    refresh();
    return {
      success: true,
      data: { id: data.id, status: data.status },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}


export async function getRevenueTrustStateAction(): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.trust.read");
    const [providers, applications] = await Promise.all([
      listProviderConnections(auth.tenantId),
      listProviderApplications(auth.tenantId),
    ]);
    return { success: true, data: { providers, applications } };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveRevenueProviderAction(input: {
  provider: string;
  baseUrl?: string | null;
  credentials: ProviderCredentials;
  isDefault?: boolean;
}): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.trust.manage");
    const data = await saveProviderConnection({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      provider: input.provider,
      baseUrl: input.baseUrl || null,
      credentials: input.credentials,
      isDefault: Boolean(input.isDefault),
    });
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}


export async function submitRevenueProviderApplicationAction(input: {
  provider: string;
  companyData: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.trust.manage");
    const data = await submitProviderApplication({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      provider: input.provider,
      companyData: input.companyData,
      documents: input.documents || [],
      notes: input.notes,
    });
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function testRevenueProviderAction(
  provider: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.trust.manage");
    const data = await testProviderConnection(
      auth.tenantId,
      auth.userId,
      String(provider),
    );
    refresh();
    return { success: true, data };
  } catch (error) {
    refresh();
    return { success: false, error: errorMessage(error) };
  }
}

export async function disconnectRevenueProviderAction(
  provider: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.trust.manage");
    const data = await disconnectProviderConnection(
      auth.tenantId,
      auth.userId,
      String(provider),
    );
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function trainRevenuePredictiveModelAction(
  minimumRows = 30,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.predictive.manage");
    const safeMinimum = Math.min(Math.max(Number(minimumRows) || 30, 20), 10_000);
    const data = await trainPredictiveModel(
      auth.tenantId,
      auth.userId,
      safeMinimum,
    );
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function scoreRevenueOpportunitiesAction(): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.predictive.manage");
    const data = await scoreOpenOpportunities(auth.tenantId, auth.userId);
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function processRevenueOutboxAction(): Promise<ActionResult> {
  try {
    await requireRevenuePermission("revenue.audit.read");
    const data = await processRevenueOutbox(100);
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function getRevenueAuditProofAction(
  correlationId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.audit.read");
    const id = String(correlationId || "").trim();
    if (!id) throw new Error("CORRELATION_ID_REQUIRED");
    const [events, audits] = await Promise.all([
      rawPrisma.revenueDomainEvent.findMany({
        where: { tenantId: auth.tenantId, correlationId: id },
        orderBy: { occurredAt: "asc" },
      }),
      rawPrisma.revenueAuditEntry.findMany({
        where: { tenantId: auth.tenantId, correlationId: id },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      success: true,
      data: {
        events: events.map((event: any) => ({
          ...event,
          occurredAt: event.occurredAt.toISOString(),
          createdAt: event.createdAt.toISOString(),
        })),
        audits: audits.map((entry: any) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function scoreOpportunityIntelligenceAction(
  opportunityId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.predictive.manage");
    const id = String(opportunityId || "").trim();
    if (!id) throw new Error("OPPORTUNITY_ID_REQUIRED");
    const data = await scoreOpportunityIntelligence(auth.tenantId, auth.userId, id);
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function scoreAllIntelligenceAction(): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.predictive.manage");
    const data = await scoreAllOpportunitiesIntelligence(auth.tenantId, auth.userId);
    refresh();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function getIntelligenceScoresAction(options?: {
  category?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireRevenuePermission("revenue.predictive.read");
    const pageSize = Math.min(Math.max(Number(options?.pageSize || 5), 1), 20);
    const page = Math.max(1, Number(options?.page || 1));
    const data = await loadIntelligenceScores(auth.tenantId, {
      category: options?.category,
      entityType: options?.entityType,
      entityId: options?.entityId,
      page,
      pageSize,
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
