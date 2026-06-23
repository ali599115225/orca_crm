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

type OfferOptimization = {
  summary: string;
  recommendations: string[];
  riskFlags: string[];
  confidence: number;
};

function contextFromBody(body: any) {
  const offer = body?.offer || body || {};
  return {
    price: Number.isFinite(Number(offer.price))
      ? Number(offer.price)
      : null,
    listPrice: Number.isFinite(Number(offer.listPrice))
      ? Number(offer.listPrice)
      : null,
    downPayment: Number.isFinite(Number(offer.downPayment))
      ? Number(offer.downPayment)
      : null,
    paymentTermMonths: Number.isFinite(Number(offer.paymentTermMonths))
      ? Number(offer.paymentTermMonths)
      : null,
    status: String(offer.status || "").slice(0, 50),
    notes: String(offer.notes || "").slice(0, 700),
  };
}

function fallback(
  context: ReturnType<typeof contextFromBody>,
): OfferOptimization {
  const riskFlags: string[] = [];
  if (
    context.price !== null &&
    context.listPrice !== null &&
    context.price < context.listPrice * 0.85
  ) {
    riskFlags.push("Discount exceeds 15% of the listed price.");
  }
  if (
    context.downPayment !== null &&
    context.price !== null &&
    context.downPayment < context.price * 0.1
  ) {
    riskFlags.push("Down payment is below 10%.");
  }

  return {
    summary: "Rule fallback based only on submitted numeric offer fields.",
    recommendations:
      riskFlags.length > 0
        ? ["Require manager review before sending the offer."]
        : ["Verify commercial terms with the assigned sales manager."],
    riskFlags,
    confidence: 0.5,
  };
}

function valid(value: unknown): value is OfferOptimization {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.summary === "string" &&
    Array.isArray(item.recommendations) &&
    item.recommendations.every((entry) => typeof entry === "string") &&
    Array.isArray(item.riskFlags) &&
    item.riskFlags.every((entry) => typeof entry === "string") &&
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

    const result = await generateAgentJson<OfferOptimization>({
      tenantId: access.tenantId,
      agentName: "KHABEER",
      systemPrompt: [
        "Review a real-estate offer using only the supplied numeric and status fields.",
        "Do not approve, reject, send, or modify the offer.",
        "Return JSON: summary, recommendations, riskFlags, confidence.",
        "All recommendations are advisory and require human review.",
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
