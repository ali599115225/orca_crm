import { NextRequest, NextResponse } from "next/server";
import {
  AGENT_READ_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import {
  aiErrorResponse,
  generateAgentJson,
} from "@/lib/agents/gemini-client";

type LeadScoreResult = {
  score: number;
  classification: "COLD" | "WARM" | "HOT";
  reasons: string[];
  recommendedAction: string;
  confidence: number;
};

function contextFromBody(body: any) {
  const lead = body?.lead || body || {};
  return {
    city: String(lead.city || "").slice(0, 100),
    source: String(lead.source || "").slice(0, 100),
    status: String(lead.status || "").slice(0, 50),
    currentScore: Math.max(
      0,
      Math.min(100, Number(lead.leadScore || lead.score || 0)),
    ),
    budget: Number.isFinite(Number(lead.budget))
      ? Number(lead.budget)
      : null,
    interest: String(
      lead.interest || lead.propertyType || lead.notes || "",
    ).slice(0, 500),
  };
}

function fallback(context: ReturnType<typeof contextFromBody>): LeadScoreResult {
  const score = context.currentScore || 50;
  return {
    score,
    classification: score >= 75 ? "HOT" : score >= 45 ? "WARM" : "COLD",
    reasons: ["Fallback based on the current verified CRM score."],
    recommendedAction:
      score >= 75
        ? "Human follow-up"
        : score >= 45
          ? "Collect qualification details"
          : "Low-priority nurture",
    confidence: 0.5,
  };
}

function valid(value: unknown): value is LeadScoreResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.score === "number" &&
    item.score >= 0 &&
    item.score <= 100 &&
    ["COLD", "WARM", "HOT"].includes(String(item.classification)) &&
    Array.isArray(item.reasons) &&
    item.reasons.every((reason) => typeof reason === "string") &&
    typeof item.recommendedAction === "string" &&
    typeof item.confidence === "number" &&
    item.confidence >= 0 &&
    item.confidence <= 1
  );
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const body = await request.json();
    const context = contextFromBody(body);

    const result = await generateAgentJson<LeadScoreResult>({
      tenantId: access.tenantId,
      agentName: "KHABEER",
      systemPrompt: [
        "Score a real-estate CRM lead using only the supplied context.",
        "Do not infer protected traits or use external personal data.",
        "Return JSON: score, classification, reasons, recommendedAction, confidence.",
        "classification is COLD, WARM, or HOT; score is 0-100; confidence is 0-1.",
      ].join("\n"),
      userPrompt: JSON.stringify(context),
      validate: valid,
      fallback: () => fallback(context),
    });

    return NextResponse.json({
      success: true,
      ...result.data,
      data: result.data,
      meta: {
        source: result.source,
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (error) {
    const ai = aiErrorResponse(error);
    if (ai.status !== 500 || ai.body.code !== "AI_INTERNAL_ERROR") {
      return NextResponse.json(ai.body, {
        status: ai.status,
        headers: ai.headers,
      });
    }
    const access = agentErrorResponse(error);
    return NextResponse.json(access.body, { status: access.status });
  }
}
