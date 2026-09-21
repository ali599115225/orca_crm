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

type ConversationSummary = {
  summary: string;
  sentiment: "NEGATIVE" | "NEUTRAL" | "POSITIVE";
  nextActions: string[];
  confidence: number;
};

function messagesFromBody(body: any): string[] {
  const values = Array.isArray(body?.messages)
    ? body.messages
    : typeof body?.conversation === "string"
      ? [body.conversation]
      : [];

  return values
    .slice(-100)
    .map((entry: any) =>
      typeof entry === "string"
        ? entry
        : `${String(entry?.sender || "unknown")}: ${String(entry?.text || entry?.message || "")}`,
    )
    .map((entry: string) => entry.slice(0, 1_000))
    .filter(Boolean);
}

function fallback(messages: string[]): ConversationSummary {
  const combined = messages.join(" ").slice(0, 500);
  return {
    summary: combined || "No conversation content was supplied.",
    sentiment: "NEUTRAL",
    nextActions: ["Review the conversation manually."],
    confidence: 0.35,
  };
}

function valid(value: unknown): value is ConversationSummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.summary === "string" &&
    ["NEGATIVE", "NEUTRAL", "POSITIVE"].includes(String(item.sentiment)) &&
    Array.isArray(item.nextActions) &&
    item.nextActions.every((entry) => typeof entry === "string") &&
    typeof item.confidence === "number" &&
    item.confidence >= 0 &&
    item.confidence <= 1
  );
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const body = await request.json();
    const messages = messagesFromBody(body);
    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: "CONVERSATION_REQUIRED",
          error: "Conversation messages are required.",
        },
        { status: 400 },
      );
    }

    const result = await generateAgentJson<ConversationSummary>({
      tenantId: access.tenantId,
      agentName: "MANSOUR",
      systemPrompt: [
        "Summarize only the supplied CRM conversation.",
        "Do not translate customer-authored content and do not invent facts.",
        "Return JSON: summary, sentiment, nextActions, confidence.",
        "sentiment is NEGATIVE, NEUTRAL, or POSITIVE.",
      ].join("\n"),
      userPrompt: messages.join("\n"),
      validate: valid,
      fallback: () => fallback(messages),
      maxInputLength: 10_000,
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
