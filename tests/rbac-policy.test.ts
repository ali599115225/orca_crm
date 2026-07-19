import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RBAC_POLICY_AMBIGUOUS,
  RBAC_POLICY_MATRIX,
  type RbacRole,
} from '../lib/rbac-policy';

describe('Extracted RBAC policy matrix', () => {
  it('covers the required roles with tenant context evidence', () => {
    const roles = new Set<RbacRole>(RBAC_POLICY_MATRIX.map((row) => row.role));

    expect(RBAC_POLICY_AMBIGUOUS).toBe(false);
    expect(roles).toEqual(
      new Set([
        'PLATFORM_OWNER',
        'ADMIN',
        'SALES_MANAGER',
        'SALES_EMPLOYEE',
        'MARKETING',
        'READ_ONLY',
      ]),
    );
    expect(RBAC_POLICY_MATRIX.every((row) => row.evidence.length > 0)).toBe(true);
  });

  it('keeps removed legacy tenant roles out of server authorization boundaries', () => {
    const files = [
      'app/actions/accounting.ts',
      'app/actions/advertising-integrations.ts',
      'app/actions/contract.ts',
      'app/actions/ejar.ts',
      'app/actions/email.ts',
      'app/actions/finance.ts',
      'app/actions/marketing-campaigns.ts',
      'app/actions/marketing.ts',
      'app/actions/projects.ts',
      'app/actions/sales.ts',
      'app/actions/tasks.ts',
      'app/actions/users.ts',
      'app/context/AuthContext.tsx',
      'app/api/integrations/tiktok/oauth/callback/route.ts',
      'app/api/integrations/tiktok/oauth/pending/route.ts',
      'app/api/integrations/tiktok/oauth/start/route.ts',
      'app/api/v1/installments/[id]/pay/route.ts',
      'app/api/v1/settings/api-keys/route.ts',
      'app/api/v1/settings/route.ts',
      'lib/auth/contract-access-policy.ts',
      'lib/leads/model.ts',
      'lib/revenue-integrity/authorization.ts',
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toMatch(/["'](?:owner|accountant|rental_manager)["']/);
    }
  });

  it('does not grant tenant bypass to Platform Owner without explicit configured identity', () => {
    const platformRows = RBAC_POLICY_MATRIX.filter((row) => row.role === 'PLATFORM_OWNER');

    expect(platformRows).not.toHaveLength(0);
    expect(platformRows.every((row) => row.tenantContext === 'CONFIGURED_PLATFORM_OWNER')).toBe(true);
  });

  it('keeps READ_ONLY write access denied', () => {
    const readOnlyWrite = RBAC_POLICY_MATRIX.find(
      (row) => row.role === 'READ_ONLY' && row.action === 'write',
    );

    expect(readOnlyWrite?.allowed).toBe(false);
  });
});

