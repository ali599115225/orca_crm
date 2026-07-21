import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const adrPath = resolve(
  root,
  'docs/architecture/ADR-G3-01-single-company-access-context.md',
);
const schemaPath = resolve(root, 'prisma/schema.prisma');

const adr = readFileSync(adrPath, 'utf8');
const schema = readFileSync(schemaPath, 'utf8');

describe('G3-01 architecture contract', () => {
  it('declares the required architecture decisions', () => {
    const requiredStatements = [
      'Single-Company Operational Mode',
      '`tenantId` remains the security namespace',
      'Central CompanyContext and AccessContext',
      'Trusted scope derivation',
      '`OrgAssignment` and `RoleAssignment` SHALL be separate',
      'Scoped, DB-backed RBAC',
      'default-deny',
      'Legacy SaaS capability disablement',
      'Expand → Backfill → Verify → Enforce → Contract',
      'Rollback, backup, and restore policy',
      'No request body, query string, route parameter',
      'No Prisma migration is created in G3-01',
    ];

    for (const statement of requiredStatements) {
      expect(adr, `ADR is missing required statement: ${statement}`).toContain(
        statement,
      );
    }
  });

  it('preserves the current compatibility anchors for later additive stages', () => {
    expect(schema).toMatch(/enum\s+Role\s*\{/);
    expect(schema).toMatch(/model\s+Tenant\s*\{/);
    expect(schema).toMatch(/tenantId\s+String/);
    expect(schema).toMatch(/department\s+String\?/);
    expect(schema).toMatch(/subscriptionPlan\s+String/);
    expect(schema).toMatch(/subscriptionExpiresAt\s+DateTime\?/);
  });

  it('does not authorize a destructive rename or legacy data deletion', () => {
    expect(adr).toContain('A repository-wide rename to `companyId` is explicitly rejected');
    expect(adr).toContain('No destructive schema removal is authorized by this ADR');
    expect(adr).toContain('keep legacy SaaS tables and fields');
  });

  it('makes subordinate scopes unable to weaken tenant isolation', () => {
    expect(adr).toContain(
      'Branch, department, team, self, and resource scopes are always subordinate to `tenantId`.',
    );
  });
});
