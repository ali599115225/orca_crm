const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
}
