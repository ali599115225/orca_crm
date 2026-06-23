"use server";

import {
  AGENT_READ_ROLES,
  requireAgentAccess,
} from "@/lib/agents/access";
import {
  generateAgentJson,
  type AgentJsonResult,
} from "@/lib/agents/gemini-client";

type Insight = {
  recommendation: string;
  actionText: string;
  priority: "low" | "medium" | "high";
  confidence: number;
};

function safeLeadContext(lead: any) {
  return {
    firstName: String(lead?.firstName || "").slice(0, 100),
    city: String(lead?.city || "").slice(0, 100),
    source: String(lead?.source || "").slice(0, 100),
    status: String(lead?.status || "").slice(0, 50),
    leadScore: Math.max(0, Math.min(100, Number(lead?.leadScore || 0))),
    budget: Number.isFinite(Number(lead?.budget))
      ? Number(lead.budget)
      : null,
    interest: String(
      lead?.interest || lead?.propertyType || "",
    ).slice(0, 200),
  };
}

function fallbackInsight(context: ReturnType<typeof safeLeadContext>): Insight {
  const score = context.leadScore;
  if (score >= 80) {
    return {
      recommendation:
        "العميل ذو أولوية مرتفعة ويحتاج متابعة بشرية مباشرة للتحقق من الاحتياج والجاهزية.",
      actionText: "جدولة متابعة مباشرة",
      priority: "high",
      confidence: 0.65,
    };
  }
  if (score < 50) {
    return {
      recommendation:
        "الأولوية الحالية منخفضة؛ يوصى بجمع معلومات إضافية قبل أي إجراء بيعي.",
      actionText: "طلب معلومات إضافية",
      priority: "low",
      confidence: 0.55,
    };
  }
  return {
    recommendation:
      "العميل يحتاج متابعة منظمة مع التحقق من الميزانية والجدول الزمني للشراء.",
    actionText: "جدولة متابعة",
    priority: "medium",
    confidence: 0.6,
  };
}

function isInsight(value: unknown): value is Insight {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.recommendation === "string" &&
    typeof item.actionText === "string" &&
    ["low", "medium", "high"].includes(String(item.priority)) &&
    typeof item.confidence === "number" &&
    item.confidence >= 0 &&
    item.confidence <= 1
  );
}

export async function analyzeLeadAI(lead: any) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const context = safeLeadContext(lead);

    const result: AgentJsonResult<Insight> =
      await generateAgentJson<Insight>({
        tenantId: access.tenantId,
        agentName: "KHABEER",
        systemPrompt: [
          "You are ORCA CRM's sales-analysis agent.",
          "Analyze only the supplied tenant-scoped lead context.",
          "Do not claim certainty, legal advice, or external facts.",
          "Return JSON with recommendation, actionText, priority, confidence.",
          "priority must be low, medium, or high.",
          "confidence must be a number from 0 to 1.",
        ].join("\n"),
        userPrompt: JSON.stringify(context),
        validate: isInsight,
        fallback: () => fallbackInsight(context),
      });

    return {
      ...result.data,
      source: result.source,
      model: result.model,
    };
  } catch (error) {
    console.error("[analyzeLeadAI] blocked or unavailable");
    return {
      recommendation: "تعذر التحليل الآمن حالياً.",
      actionText: "",
      priority: "medium",
      confidence: 0,
      source: "UNAVAILABLE",
    };
  }
}
