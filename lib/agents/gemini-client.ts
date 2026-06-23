import { prisma } from "@/lib/prisma";
import { assertAgentCanRun } from "@/lib/agents/guard";
import {
  detectInjectionPatterns,
  sanitizeAgentInput,
  validateAllowedAction,
  wrapUntrustedContent,
} from "@/lib/agents/prompt-guard";
import { enforceAiQuota, AgentQuotaError } from "@/lib/agents/quota";

export class AiRuntimeError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AiRuntimeError";
  }
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentJsonResult<T> {
  data: T;
  source: "GEMINI" | "SAFE_FALLBACK";
  model: string;
  usage: AiUsage;
  fallback: boolean;
}

export interface AgentJsonRequest<T> {
  tenantId: string;
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  allowedActions?: readonly string[];
  validate?: (value: unknown) => value is T;
  fallback?: () => T;
  maxInputLength?: number;
  maxOutputTokens?: number;
  temperature?: number;
  enforceRuntimeGuard?: boolean;
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_ROOT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function emptyUsage(): AiUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  if (!cleaned || cleaned.length > 50_000) {
    throw new AiRuntimeError(
      "AI_OUTPUT_INVALID",
      502,
      "AI returned an invalid response.",
    );
  }

  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AiRuntimeError(
      "AI_OUTPUT_INVALID",
      502,
      "AI returned an invalid structured response.",
    );
  }
  return parsed;
}

async function logUsage(params: {
  tenantId: string;
  agentName: string;
  model: string;
  usage: AiUsage;
  source: string;
  outcome: string;
}) {
  try {
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId: params.tenantId,
        agentId: params.agentName,
        actionType: "AI_USAGE",
        logMessageAr: JSON.stringify({
          model: params.model,
          source: params.source,
          outcome: params.outcome,
          promptTokens: params.usage.promptTokens,
          completionTokens: params.usage.completionTokens,
          totalTokens: params.usage.totalTokens,
        }),
        severity: params.outcome === "SUCCESS" ? "Info" : "Warning",
      },
    });
  } catch {
    // Telemetry failure must not leak secrets or change the business result.
  }
}

function fallbackResult<T>(
  request: AgentJsonRequest<T>,
  model: string,
): AgentJsonResult<T> {
  if (!request.fallback) {
    throw new AiRuntimeError(
      "AI_PROVIDER_UNAVAILABLE",
      503,
      "AI provider is unavailable.",
    );
  }
  return {
    data: request.fallback(),
    source: "SAFE_FALLBACK",
    model,
    usage: emptyUsage(),
    fallback: true,
  };
}

export async function generateAgentJson<T>(
  request: AgentJsonRequest<T>,
): Promise<AgentJsonResult<T>> {
  const agentName = request.agentName.trim().toUpperCase();
  const model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();

  if (request.enforceRuntimeGuard !== false) {
    const runtime = await assertAgentCanRun({
      tenantId: request.tenantId,
      agentName,
      actionType: "ANALYSIS",
    });
    if (!runtime.allowed) {
      throw new AiRuntimeError(
        "AGENT_RUNTIME_BLOCKED",
        409,
        runtime.reason || "Agent runtime is blocked.",
      );
    }
  }

  const sanitized = sanitizeAgentInput(request.userPrompt, {
    maxLength: request.maxInputLength || 6_000,
  });
  const injection = detectInjectionPatterns(request.userPrompt);
  if (injection.riskLevel === "HIGH") {
    throw new AiRuntimeError(
      "PROMPT_INJECTION_BLOCKED",
      400,
      "Unsafe input was blocked.",
    );
  }

  try {
    await enforceAiQuota(request.tenantId, agentName);
  } catch (error) {
    if (error instanceof AgentQuotaError) {
      throw new AiRuntimeError(
        error.code,
        429,
        error.message,
        error.retryAfterSeconds,
      );
    }
    throw error;
  }

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    const result = fallbackResult(request, model);
    await logUsage({
      tenantId: request.tenantId,
      agentName,
      model,
      usage: result.usage,
      source: result.source,
      outcome: "FALLBACK",
    });
    return result;
  }

  const wrappedInput = wrapUntrustedContent(
    "AGENT_USER_INPUT",
    sanitized.sanitized,
  );
  const endpoint = `${API_ROOT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: request.systemPrompt.slice(0, 12_000) }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${wrappedInput}\n\nReturn one JSON object only.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxOutputTokens || 2_048,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        if (RETRYABLE.has(response.status) && attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, attempt * 750),
          );
          continue;
        }
        throw new AiRuntimeError(
          "AI_PROVIDER_ERROR",
          response.status === 429 ? 429 : 502,
          `AI provider request failed with status ${response.status}.`,
        );
      }

      const payload = (await response.json()) as any;
      const rawText =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = parseJsonObject(rawText);

      if (
        request.allowedActions &&
        "action" in (parsed as Record<string, unknown>) &&
        !validateAllowedAction(
          String((parsed as Record<string, unknown>).action || ""),
          [...request.allowedActions],
        )
      ) {
        throw new AiRuntimeError(
          "AI_ACTION_REJECTED",
          502,
          "AI returned an action outside the allowlist.",
        );
      }

      if (request.validate && !request.validate(parsed)) {
        throw new AiRuntimeError(
          "AI_OUTPUT_SCHEMA_INVALID",
          502,
          "AI output did not match the required schema.",
        );
      }

      const metadata = payload?.usageMetadata || {};
      const usage: AiUsage = {
        promptTokens: Number(metadata.promptTokenCount || 0),
        completionTokens: Number(metadata.candidatesTokenCount || 0),
        totalTokens: Number(metadata.totalTokenCount || 0),
      };

      await logUsage({
        tenantId: request.tenantId,
        agentName,
        model,
        usage,
        source: "GEMINI",
        outcome: "SUCCESS",
      });

      return {
        data: parsed as T,
        source: "GEMINI",
        model,
        usage,
        fallback: false,
      };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof Error &&
        (error.name === "AbortError" ||
          (error instanceof AiRuntimeError &&
            error.code === "AI_PROVIDER_ERROR"));
      if (retryable && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        continue;
      }
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (request.fallback) {
    const result = fallbackResult(request, model);
    await logUsage({
      tenantId: request.tenantId,
      agentName,
      model,
      usage: result.usage,
      source: result.source,
      outcome: "FALLBACK",
    });
    return result;
  }

  await logUsage({
    tenantId: request.tenantId,
    agentName,
    model,
    usage: emptyUsage(),
    source: "GEMINI",
    outcome: "FAILED",
  });

  if (lastError instanceof AiRuntimeError) throw lastError;
  throw new AiRuntimeError(
    "AI_PROVIDER_UNAVAILABLE",
    503,
    "AI provider is unavailable.",
  );
}

export function aiErrorResponse(error: unknown): {
  status: number;
  headers?: Record<string, string>;
  body: { success: false; code: string; error: string };
} {
  if (error instanceof AiRuntimeError) {
    return {
      status: error.status,
      headers: error.retryAfterSeconds
        ? { "Retry-After": String(error.retryAfterSeconds) }
        : undefined,
      body: {
        success: false,
        code: error.code,
        error: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      code: "AI_INTERNAL_ERROR",
      error: "AI operation failed.",
    },
  };
}
