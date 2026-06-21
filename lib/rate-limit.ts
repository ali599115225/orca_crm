import { prisma } from './prisma';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number;
};

type MemoryEntry = { count: number; resetAt: number };

const MEMORY_BACKUP = new Map<string, MemoryEntry>();

function productionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

function normalizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.floor(value));
}

function prismaCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

async function databaseRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    await prisma.rateLimitEntry.create({
      data: { key, count: 1, resetAt },
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetIn: windowMs,
    };
  } catch (error: unknown) {
    if (prismaCode(error) !== 'P2002') {
      return { allowed: false, remaining: 0, resetIn: windowMs };
    }
  }

  try {
    const reset = await prisma.rateLimitEntry.updateMany({
      where: {
        key,
        resetAt: { lte: now },
      },
      data: {
        count: 1,
        resetAt,
      },
    });

    if (reset.count === 1) {
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetIn: windowMs,
      };
    }

    const increment = await prisma.rateLimitEntry.updateMany({
      where: {
        key,
        resetAt: { gt: now },
        count: { lt: limit },
      },
      data: {
        count: { increment: 1 },
      },
    });

    const current = await prisma.rateLimitEntry.findUnique({
      where: { key },
      select: { count: true, resetAt: true },
    });

    const resetIn = Math.max(
      0,
      (current?.resetAt.getTime() ?? resetAt.getTime()) - Date.now()
    );

    if (increment.count === 1) {
      return {
        allowed: true,
        remaining: Math.max(0, limit - (current?.count ?? limit)),
        resetIn,
      };
    }

    return { allowed: false, remaining: 0, resetIn };
  } catch {
    return { allowed: false, remaining: 0, resetIn: windowMs };
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = MEMORY_BACKUP.get(key);

  if (!entry || now >= entry.resetAt) {
    MEMORY_BACKUP.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetIn: windowMs,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.max(0, entry.resetAt - now),
    };
  }

  entry.count += 1;

  if (MEMORY_BACKUP.size > 10_000) {
    for (const [candidateKey, candidate] of MEMORY_BACKUP) {
      if (candidate.resetAt <= now) MEMORY_BACKUP.delete(candidateKey);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetIn: Math.max(0, entry.resetAt - now),
  };
}

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  useDb?: boolean
): Promise<RateLimitResult> {
  const normalizedKey = key.trim().slice(0, 500);
  const normalizedLimit = normalizePositiveInteger(limit, 30);
  const normalizedWindow = normalizePositiveInteger(windowMs, 60_000);

  if (!normalizedKey) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: normalizedWindow,
    };
  }

  const distributed = useDb ?? productionRuntime();

  return distributed
    ? databaseRateLimit(normalizedKey, normalizedLimit, normalizedWindow)
    : memoryRateLimit(normalizedKey, normalizedLimit, normalizedWindow);
}
