/**
 * tests/seed-guard.test.ts
 *
 * ORCA CRM — Seed Production Safety Guard Tests
 *
 * Tests the PURE guard module (prisma/seed-guard.ts) which has
 * NO side effects and does NOT import database drivers.
 *
 * IMPORTANT: We import from seed-guard.ts, NOT seed.ts.
 * Importing seed.ts would trigger module-scope DB initialization.
 *
 * Verifies:
 *  1. NODE_ENV=production → blocked
 *  2. VERCEL_ENV=production → blocked
 *  3. Both production → blocked
 *  4. development → allowed
 *  5. test → allowed
 *  6. Missing env → allowed (documented policy)
 *  7. Mixed (one production) → blocked
 *  8. assertSeedExecutionAllowed throws on production
 *  9. assertSeedExecutionAllowed does not throw on non-production
 */

import { describe, it, expect } from 'vitest';
import {
  isProductionEnvironment,
  evaluateSeedExecution,
  assertSeedExecutionAllowed,
  type SeedEnvironment,
} from '../prisma/seed-guard';

describe('Seed Production Safety Guard', () => {
  describe('isProductionEnvironment()', () => {
    it('1. Returns true when NODE_ENV is production', () => {
      const env: SeedEnvironment = { NODE_ENV: 'production' };
      expect(isProductionEnvironment(env)).toBe(true);
    });

    it('2. Returns true when VERCEL_ENV is production', () => {
      const env: SeedEnvironment = { VERCEL_ENV: 'production' };
      expect(isProductionEnvironment(env)).toBe(true);
    });

    it('3. Returns true when both are production', () => {
      const env: SeedEnvironment = {
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
      };
      expect(isProductionEnvironment(env)).toBe(true);
    });

    it('4. Returns false when NODE_ENV is development', () => {
      const env: SeedEnvironment = { NODE_ENV: 'development' };
      expect(isProductionEnvironment(env)).toBe(false);
    });

    it('5. Returns false when NODE_ENV is test', () => {
      const env: SeedEnvironment = { NODE_ENV: 'test' };
      expect(isProductionEnvironment(env)).toBe(false);
    });

    it('6. Returns false when both are undefined (missing env)', () => {
      const env: SeedEnvironment = {};
      expect(isProductionEnvironment(env)).toBe(false);
    });

    it('7. Returns false when VERCEL_ENV is preview (not production)', () => {
      const env: SeedEnvironment = { VERCEL_ENV: 'preview' };
      expect(isProductionEnvironment(env)).toBe(false);
    });

    it('8. Returns true when NODE_ENV=development but VERCEL_ENV=production', () => {
      const env: SeedEnvironment = {
        NODE_ENV: 'development',
        VERCEL_ENV: 'production',
      };
      expect(isProductionEnvironment(env)).toBe(true);
    });

    it('9. Returns true when NODE_ENV=production but VERCEL_ENV=preview', () => {
      const env: SeedEnvironment = {
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
      };
      expect(isProductionEnvironment(env)).toBe(true);
    });

    it('10. Returns false when NODE_ENV is empty string', () => {
      const env: SeedEnvironment = { NODE_ENV: '' };
      expect(isProductionEnvironment(env)).toBe(false);
    });
  });

  describe('assertSeedExecutionAllowed()', () => {
    it('11. Throws when NODE_ENV is production', () => {
      const env: SeedEnvironment = { NODE_ENV: 'production' };
      expect(() => assertSeedExecutionAllowed(env)).toThrow('SEED_BLOCKED');
    });

    it('12. Throws when VERCEL_ENV is production', () => {
      const env: SeedEnvironment = { VERCEL_ENV: 'production' };
      expect(() => assertSeedExecutionAllowed(env)).toThrow('SEED_BLOCKED');
    });

    it('13. Does NOT throw when NODE_ENV is development', () => {
      const env: SeedEnvironment = { NODE_ENV: 'development' };
      expect(() => assertSeedExecutionAllowed(env)).not.toThrow();
    });

    it('14. Does NOT throw when NODE_ENV is test', () => {
      const env: SeedEnvironment = { NODE_ENV: 'test' };
      expect(() => assertSeedExecutionAllowed(env)).not.toThrow();
    });

    it('15. Does NOT throw when env is empty (missing)', () => {
      const env: SeedEnvironment = {};
      expect(() => assertSeedExecutionAllowed(env)).not.toThrow();
    });

    it('16. Error message does NOT mention any override or bypass', () => {
      const env: SeedEnvironment = { NODE_ENV: 'production' };
      try {
        assertSeedExecutionAllowed(env);
        expect.fail('Should have thrown');
      } catch (e: unknown) {
        const message = (e as Error).message;
        expect(message).not.toMatch(/override/i);
        expect(message).not.toMatch(/bypass/i);
        expect(message).not.toMatch(/ALLOW_PRODUCTION/i);
        expect(message).not.toMatch(/FORCE/i);
      }
    });

    it('17. Error message does NOT leak env values or secrets', () => {
      const env: SeedEnvironment = { NODE_ENV: 'production' };
      try {
        assertSeedExecutionAllowed(env);
        expect.fail('Should have thrown');
      } catch (e: unknown) {
        const message = (e as Error).message;
        expect(message).not.toMatch(/DATABASE_URL/i);
        expect(message).not.toMatch(/password/i);
        expect(message).not.toMatch(/connection/i);
        expect(message).not.toMatch(/host/i);
      }
    });
  });

  describe('Guard module isolation', () => {
    it('18. Documents the missing-env policy as non-production', () => {
      expect(evaluateSeedExecution({})).toEqual({
        allowed: true,
        reason: 'non_production',
      });
    });

    it('19. Guard module does NOT import pg or prisma', async () => {
      // Verify the guard module source doesn't contain DB imports
      const fs = await import('fs');
      const guardSource = fs.readFileSync(
        new URL('../prisma/seed-guard.ts', import.meta.url),
        'utf-8',
      );
      expect(guardSource).not.toMatch(/from ['"]pg['"]/);
      expect(guardSource).not.toMatch(/from ['"]@prisma/);
      expect(guardSource).not.toMatch(/new Pool/);
      expect(guardSource).not.toMatch(/new PrismaClient/);
      expect(guardSource).not.toMatch(/DATABASE_URL/);
    });

    it('20. Seed guard is evaluated before DB client construction', async () => {
      const fs = await import('fs');
      const seedSource = fs.readFileSync(
        new URL('../prisma/seed.ts', import.meta.url),
        'utf-8',
      );

      const guardIndex = seedSource.indexOf('assertSeedExecutionAllowed();');
      const poolIndex = seedSource.indexOf('new Pool(');
      const prismaIndex = seedSource.indexOf('new PrismaClient(');

      expect(guardIndex).toBeGreaterThanOrEqual(0);
      expect(poolIndex).toBeGreaterThan(guardIndex);
      expect(prismaIndex).toBeGreaterThan(guardIndex);
    });
  });
});
