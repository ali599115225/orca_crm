import { describe, expect, it } from 'vitest';
import {
  evaluateTenantIsolation,
  tenantScopedWhere,
  type TenantScopedSession,
} from '../lib/tenant-isolation';

describe('Tenant Isolation', () => {
  const session: TenantScopedSession = {
    userId: 'user-a',
    tenantId: 'tenant-a',
    role: 'ADMIN',
  };

  it('blocks Tenant A from reading Tenant B resources', () => {
    const decision = evaluateTenantIsolation({
      session,
      resourceTenantId: 'tenant-b',
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.status).toBe(403);
      expect(JSON.stringify(decision.publicError)).not.toContain('tenant-b');
    }
  });

  it('blocks Tenant A from writing Tenant B resources', () => {
    const decision = evaluateTenantIsolation({
      session,
      bodyTenantId: 'tenant-b',
      resourceTenantId: 'tenant-b',
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.status).toBe(403);
  });

  it('blocks route param tenant spoofing', () => {
    expect(
      evaluateTenantIsolation({ session, routeTenantId: 'tenant-b' }).allowed,
    ).toBe(false);
  });

  it('blocks query param tenant spoofing', () => {
    expect(
      evaluateTenantIsolation({ session, queryTenantId: 'tenant-b' }).allowed,
    ).toBe(false);
  });

  it('blocks body tenantId spoofing', () => {
    expect(
      evaluateTenantIsolation({ session, bodyTenantId: 'tenant-b' }).allowed,
    ).toBe(false);
  });

  it('does not trust client-supplied role', () => {
    const decision = evaluateTenantIsolation({
      session,
      clientRole: 'PLATFORM_OWNER',
    });

    expect(decision.allowed).toBe(true);
    if (decision.allowed) expect(decision.trustedRole).toBe('ADMIN');
  });

  it('uses session tenantId in service-layer where clauses', () => {
    const where = tenantScopedWhere(session, {
      id: 'lead-1',
      tenantId: 'tenant-b',
    });

    expect(where).toEqual({ id: 'lead-1', tenantId: 'tenant-a' });
  });

  it('returns 403 rather than 500 for forbidden cross-tenant access', () => {
    const decision = evaluateTenantIsolation({
      session,
      routeTenantId: 'tenant-b',
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.status).toBe(403);
  });

  it('does not disclose whether another tenant resource exists', () => {
    const decision = evaluateTenantIsolation({
      session,
      resourceTenantId: 'tenant-b',
    });

    expect(JSON.stringify(decision)).not.toContain('resource exists');
    expect(JSON.stringify(decision)).not.toContain('tenant-b');
  });

  it('Tenant Admin cannot bypass tenant membership', () => {
    expect(
      evaluateTenantIsolation({
        session: { ...session, role: 'ADMIN' },
        resourceTenantId: 'tenant-b',
      }).allowed,
    ).toBe(false);
  });

  it('Platform Owner follows the extracted policy and does not bypass membership by role claim', () => {
    expect(
      evaluateTenantIsolation({
        session: { ...session, role: 'PLATFORM_OWNER' },
        resourceTenantId: 'tenant-b',
      }).allowed,
    ).toBe(false);
  });
});
