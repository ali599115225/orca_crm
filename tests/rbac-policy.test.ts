import { describe, expect, it } from 'vitest';
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
        'TENANT_ADMIN',
        'SALES_MANAGER',
        'SALES_EMPLOYEE',
        'READ_ONLY',
      ]),
    );
    expect(RBAC_POLICY_MATRIX.every((row) => row.evidence.length > 0)).toBe(true);
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

