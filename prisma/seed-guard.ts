/**
 * prisma/seed-guard.ts
 *
 * ORCA CRM — Production Seed Safety Guard
 *
 * Pure module with NO side effects.
 * Does NOT import database drivers, Prisma, or dotenv.
 * Safe to import in tests without triggering DB connections.
 */

export interface SeedEnvironment {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
}

export type SeedGuardDecision = {
  allowed: boolean;
  reason: 'non_production' | 'production';
};

/**
 * Determines whether the current runtime environment is production.
 *
 * Blocked environments:
 *  - NODE_ENV === 'production'
 *  - VERCEL_ENV === 'production'
 *
 * If either flag indicates production, seed MUST be blocked.
 * Unknown/missing values are treated as non-production (development default).
 *
 * This function is pure — no side effects, no I/O.
 */
export function isProductionEnvironment(
  env: SeedEnvironment = process.env,
): boolean {
  return (
    env.NODE_ENV === 'production' ||
    env.VERCEL_ENV === 'production'
  );
}

export function evaluateSeedExecution(
  env: SeedEnvironment = process.env,
): SeedGuardDecision {
  if (isProductionEnvironment(env)) {
    return { allowed: false, reason: 'production' };
  }

  return { allowed: true, reason: 'non_production' };
}

/**
 * Asserts that seed execution is allowed in the current environment.
 * Throws an error if the environment is production.
 *
 * This function MUST be called before any database initialization.
 */
export function assertSeedExecutionAllowed(
  env: SeedEnvironment = process.env,
): void {
  const decision = evaluateSeedExecution(env);

  if (!decision.allowed) {
    throw new Error(
      'SEED_BLOCKED: Cannot execute seed in production environment. ' +
      'This guard prevents accidental data loss.',
    );
  }
}
