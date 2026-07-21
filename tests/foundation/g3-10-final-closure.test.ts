import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('G3-10 final repository closure', () => {
  it('passes the executable final repository verification', () => {
    const execution = spawnSync(
      process.execPath,
      ['scripts/g3-final-verification.mjs'],
      { encoding: 'utf8' },
    )

    expect(execution.stderr).toBe('')
    expect(execution.stdout.trim()).not.toBe('')
    const result = JSON.parse(execution.stdout)

    expect(execution.status).toBe(0)
    expect(result).toMatchObject({
      stage: 'G3-10',
      result: 'PASS',
      violations: [],
      requiredStageReportCount: 10,
      productionMigrationApplied: false,
      productionDataChanged: false,
      productionDeployPerformed: false,
    })
    expect(result.reviewedG3Migrations).toEqual([
      'prisma/migrations/20260721010000_g3_rbac_expand/migration.sql',
      'prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql',
    ])
    expect(result.reviewedPlatformTargets).toEqual([
      {
        path: 'app/api/admin/command-center/route.ts',
        ruleId: 'json-body-tenant-scope',
        classification: 'EXPLICIT_PLATFORM_TARGET',
        effectiveTenantContextSource: 'NONE',
        safeguards: [
          'platform-owner authentication',
          'UUID validation',
          'active Tenant database revalidation',
          'incident-only target binding',
        ],
      },
    ])
  })

  it('locks the final scanner to every untrusted Tenant input class', () => {
    const scanner = read('scripts/g3-final-verification.mjs')
    for (const rule of [
      'query-tenant-scope',
      'form-tenant-scope',
      'header-tenant-scope',
      'json-body-tenant-scope',
      'json-destructure-tenant-scope',
    ]) {
      expect(scanner).toContain(rule)
    }
    expect(scanner).toContain('destructive-g3-sql')
    expect(scanner).toContain('workflow-prisma-db-push')
    expect(scanner).toContain('workflow-production-migrate')
    expect(scanner).toContain('workflow-production-deploy')
    expect(scanner).toContain('workflow-force-push')
  })

  it('revalidates the explicit platform incident target before persistence', () => {
    const route = read('app/api/admin/command-center/route.ts')
    const incident = read('lib/sentinel/incident.ts')

    expect(route).toContain('authenticatePlatformOwner()')
    expect(route).toContain('Invalid tenantId UUID')
    const validation = incident.indexOf('prisma.tenant.findFirst')
    const persistence = incident.indexOf('prisma.sentinelIncident.create')
    expect(validation).toBeGreaterThanOrEqual(0)
    expect(persistence).toBeGreaterThan(validation)
    expect(incident).toContain('isActive: true')
    expect(incident).toContain('Target tenant is missing or inactive')
  })

  it('records every G3 stage and the repository-versus-Production boundary', () => {
    const report = read('docs/reports/foundation/ORCA_G3_FINAL_CLOSURE.md')
    for (let stage = 1; stage <= 10; stage += 1) {
      expect(report).toContain(`G3-${String(stage).padStart(2, '0')}`)
    }
    for (const statement of [
      'Production migration applied:** no',
      'Production backfill executed:** no',
      'Production RBAC flags changed:** no',
      'Production deploy performed:** no',
      'Production data changed:** no',
    ]) {
      expect(report).toContain(statement)
    }
    expect(report).toContain('Production activation is explicitly outside this closure')
  })

  it('provides isolated rehearsal, validation, rollout, and rollback instructions', () => {
    const runbook = read('docs/architecture/G3_RELEASE_RUNBOOK.md')
    expect(runbook).toContain('prisma db push')
    expect(runbook).toContain('total_integrity_violations = 0')
    expect(runbook).toContain('G3_BACKFILL_TARGET=isolated-test')
    expect(runbook).toContain('ALLOW_G3_BACKFILL_WRITE=true')
    expect(runbook).toContain('G3_RBAC_AUDIT_MODE=enabled')
    expect(runbook).toContain('G3_RBAC_ENFORCEMENT_ACK=G3-07-DUAL-ALLOW')
    expect(runbook).toContain('G3_RBAC_PRODUCTION_APPROVAL=approved')
    expect(runbook).toContain('g3-rbac-constraint-rollback.sql')
    expect(runbook).toContain('does not claim this gate has been completed')
  })

  it('runs Prisma validation and the final scanner before repository tests', () => {
    const workflow = read('.github/workflows/orca-ci.yml')
    const validate = workflow.indexOf('npx prisma validate')
    const scanner = workflow.indexOf('node scripts/g3-final-verification.mjs')
    const tests = workflow.indexOf('tests/foundation/g3-*.test.ts')

    expect(validate).toBeGreaterThanOrEqual(0)
    expect(scanner).toBeGreaterThan(validate)
    expect(tests).toBeGreaterThan(scanner)
    expect(workflow).not.toMatch(/prisma\s+db\s+push/i)
    expect(workflow).not.toMatch(/prisma\s+migrate\s+deploy/i)
    expect(workflow).not.toMatch(/vercel\s+(?:deploy\s+)?--prod/i)
  })
})
