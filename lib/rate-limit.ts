import { prisma } from './prisma';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number;
};

const MEMORY_BACKUP = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60000,
  useDb: boolean = false
): Promise<RateLimitResult> {
  const now = Date.now();

  if (useDb) {
    try {
      const windowStart = new Date(now - windowMs);
      const windowEnd = new Date(now + windowMs);

      const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

      if (!existing || existing.resetAt < new Date(now)) {
        if (existing) {
          await prisma.rateLimitEntry.delete({ where: { key } });
        }
        await prisma.rateLimitEntry.create({
          data: { key, count: 1, resetAt: windowEnd },
        });
        return { allowed: true, remaining: limit - 1, resetIn: windowMs };
      }

      if (existing.count >= limit) {
        const resetIn = existing.resetAt.getTime() - now;
        return { allowed: false, remaining: 0, resetIn: Math.max(0, resetIn) };
      }

      await prisma.rateLimitEntry.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return { allowed: true, remaining: limit - existing.count - 1, resetIn: existing.resetAt.getTime() - now };
    } catch {
      return { allowed: true, remaining: limit - 1, resetIn: windowMs };
    }
  }

  const entry = MEMORY_BACKUP.get(key);
  if (!entry || now > entry.resetAt) {
    MEMORY_BACKUP.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
}
