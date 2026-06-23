import { prisma } from "@/lib/prisma";

export class AgentQuotaError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryAfterSeconds: number,
  ) {
    super("AI usage limit exceeded.");
    this.name = "AgentQuotaError";
  }
}

type RateRow = {
  count: number;
  resetAt: Date;
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function consumeWindow(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateRow> {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<RateRow[]>`
    INSERT INTO rate_limit_entries ("key", "count", "reset_at")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN rate_limit_entries."reset_at" <= NOW() THEN 1
        ELSE rate_limit_entries."count" + 1
      END,
      "reset_at" = CASE
        WHEN rate_limit_entries."reset_at" <= NOW() THEN EXCLUDED."reset_at"
        ELSE rate_limit_entries."reset_at"
      END
    RETURNING "count", "reset_at" AS "resetAt"
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to persist AI quota.");
  }

  if (Number(row.count) > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000),
    );
    throw new AgentQuotaError("AI_QUOTA_EXCEEDED", retryAfterSeconds);
  }

  return row;
}

export async function enforceAiQuota(
  tenantId: string,
  agentName: string,
): Promise<void> {
  const minuteLimit = positiveInt(
    process.env.AI_TENANT_MINUTE_LIMIT,
    20,
  );
  const dailyLimit = positiveInt(
    process.env.AI_TENANT_DAILY_LIMIT,
    500,
  );
  const prefix = `ai:${tenantId}:${agentName.toUpperCase()}`;

  await consumeWindow(`${prefix}:minute`, minuteLimit, 60_000);
  await consumeWindow(`${prefix}:day`, dailyLimit, 86_400_000);
}

export async function claimAgentIdempotency(
  tenantId: string,
  operation: string,
  key: string,
  ttlMs = 86_400_000,
): Promise<boolean> {
  const normalized = key.trim();
  if (!normalized || normalized.length > 200) {
    throw new Error("A valid idempotency key is required.");
  }

  try {
    await consumeWindow(
      `agent-idempotency:${tenantId}:${operation}:${normalized}`,
      1,
      ttlMs,
    );
    return true;
  } catch (error) {
    if (error instanceof AgentQuotaError) return false;
    throw error;
  }
}
