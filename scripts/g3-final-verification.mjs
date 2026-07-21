import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const SERVER_ROOTS = ['app/api', 'app/actions', 'lib']
const SERVER_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs'])

const REQUIRED_STAGE_REPORTS = [
  'docs/reports/foundation/ORCA_G3_01_ARCHITECTURE_CONTRACT_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_02_PERMISSION_INVENTORY_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_03_SCHEMA_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_04_SEED_BACKFILL_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_05_AUTHORIZATION_LAYER_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_06_AUDIT_MODE_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_07_ENFORCEMENT_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_08_LEGACY_SAAS_DISABLEMENT_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_09_CONSTRAINTS_INDEXES_CLOSURE.md',
  'docs/reports/foundation/ORCA_G3_FINAL_CLOSURE.md',
]

const UNTRUSTED_TENANT_RULES = [
  {
    id: 'query-tenant-scope',
    pattern:
      /(?:searchParams|nextUrl\.searchParams)\s*\.\s*get\(\s*['"`](?:tenantId|companyId|tenant_id|company_id)['"`]\s*\)/,
  },
  {
    id: 'form-tenant-scope',
    pattern:
      /(?:formData|data)\s*\.\s*get\(\s*['"`](?:tenantId|companyId|tenant_id|company_id)['"`]\s*\)/,
  },
  {
    id: 'header-tenant-scope',
    pattern:
      /headers?\s*\.\s*get\(\s*['"`](?:x-tenant-id|x-company-id|tenant-id|company-id)['"`]\s*\)/i,
  },
  {
    id: 'json-body-tenant-scope',
    pattern: /\bbody\s*\.\s*(?:tenantId|companyId|tenant_id|company_id)\b/,
  },
  {
    id: 'json-destructure-tenant-scope',
    pattern:
      /const\s*\{[^}]*\b(?:tenantId|companyId|tenant_id|company_id)\b[^}]*\}\s*=\s*(?:body|await\s+request\.json\s*\(\s*\))/s,
  },
]

function extension(path) {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot)
}

function walk(path) {
  if (!existsSync(path)) return []
  const files = []
  for (const name of readdirSync(path)) {
    const absolute = resolve(path, name)
    const entry = statSync(absolute)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'generated', 'archive'].includes(name)) continue
      files.push(...walk(absolute))
    } else if (SERVER_EXTENSIONS.has(extension(name))) {
      files.push(absolute)
    }
  }
  return files
}

function lineFor(content, index) {
  return content.slice(0, index).split('\n').length
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '')
}

function reviewPlatformTenantTarget(path, ruleId, content) {
  if (
    path !== 'app/api/admin/command-center/route.ts' ||
    ruleId !== 'json-body-tenant-scope'
  ) {
    return null
  }

  const incidentService = readFileSync(
    resolve(ROOT, 'lib/sentinel/incident.ts'),
    'utf8',
  )
  const requiredRouteAnchors = [
    'authenticatePlatformOwner()',
    'ALLOWED_INCIDENT_ACTIONS.has(action)',
    'Invalid tenantId UUID',
    'createIncident({',
  ]
  const requiredServiceAnchors = [
    'prisma.tenant.findFirst',
    'where: { id: params.tenantId, isActive: true }',
    'Target tenant is missing or inactive',
  ]

  if (
    requiredRouteAnchors.every((anchor) => content.includes(anchor)) &&
    requiredServiceAnchors.every((anchor) => incidentService.includes(anchor))
  ) {
    return {
      path,
      ruleId,
      classification: 'EXPLICIT_PLATFORM_TARGET',
      effectiveTenantContextSource: 'NONE',
      safeguards: [
        'platform-owner authentication',
        'UUID validation',
        'active Tenant database revalidation',
        'incident-only target binding',
      ],
    }
  }

  return null
}

function scanUntrustedTenantSources() {
  const violations = []
  const reviewedPlatformTargets = []
  const seenReviewed = new Set()

  for (const root of SERVER_ROOTS) {
    for (const absolute of walk(resolve(ROOT, root))) {
      const path = relative(ROOT, absolute).replaceAll('\\', '/')
      const content = readFileSync(absolute, 'utf8')

      for (const rule of UNTRUSTED_TENANT_RULES) {
        const match = rule.pattern.exec(content)
        if (!match) continue

        const reviewed = reviewPlatformTenantTarget(path, rule.id, content)
        if (reviewed) {
          const key = `${reviewed.path}:${reviewed.ruleId}`
          if (!seenReviewed.has(key)) {
            seenReviewed.add(key)
            reviewedPlatformTargets.push(reviewed)
          }
          continue
        }

        violations.push({
          path,
          line: lineFor(content, match.index),
          ruleId: rule.id,
        })
      }
    }
  }

  return { violations, reviewedPlatformTargets }
}

function verifyG3Migrations() {
  const migrationDir = resolve(ROOT, 'prisma/migrations')
  const violations = []
  const reviewed = []
  if (!existsSync(migrationDir)) return { violations, reviewed }

  for (const directory of readdirSync(migrationDir)) {
    if (!directory.toLowerCase().includes('g3')) continue
    const path = resolve(migrationDir, directory, 'migration.sql')
    if (!existsSync(path)) continue
    const sql = stripSqlComments(readFileSync(path, 'utf8'))
    const repositoryPath = relative(ROOT, path).replaceAll('\\', '/')
    reviewed.push(repositoryPath)

    const destructivePatterns = [
      /^\s*DROP\s+TABLE\b/mi,
      /\bDROP\s+COLUMN\b/i,
      /^\s*TRUNCATE\b/mi,
      /^\s*DELETE\s+FROM\b/mi,
      /^\s*UPDATE\s+\S+\s+SET\b/mi,
      /ALTER\s+COLUMN[\s\S]*?SET\s+NOT\s+NULL/i,
    ]
    for (const pattern of destructivePatterns) {
      if (pattern.test(sql)) {
        violations.push({ path: repositoryPath, ruleId: 'destructive-g3-sql' })
      }
    }
  }
  return { violations, reviewed }
}

function verifyWorkflowSafety() {
  const workflowDir = resolve(ROOT, '.github/workflows')
  const violations = []
  const reviewed = []
  if (!existsSync(workflowDir)) return { violations, reviewed }

  for (const name of readdirSync(workflowDir)) {
    const path = resolve(workflowDir, name)
    if (!statSync(path).isFile()) continue
    const content = readFileSync(path, 'utf8')
    const repositoryPath = relative(ROOT, path).replaceAll('\\', '/')
    reviewed.push(repositoryPath)

    const forbidden = [
      { ruleId: 'workflow-prisma-db-push', pattern: /prisma\s+db\s+push/i },
      { ruleId: 'workflow-production-migrate', pattern: /prisma\s+migrate\s+deploy/i },
      { ruleId: 'workflow-production-deploy', pattern: /vercel\s+(?:deploy\s+)?--prod/i },
      { ruleId: 'workflow-force-push', pattern: /git\s+push[^\n]*--force/i },
    ]
    for (const item of forbidden) {
      if (item.pattern.test(content)) {
        violations.push({ path: repositoryPath, ruleId: item.ruleId })
      }
    }
  }
  return { violations, reviewed }
}

function verifyRequiredArtifacts() {
  return REQUIRED_STAGE_REPORTS.filter((path) => !existsSync(resolve(ROOT, path))).map(
    (path) => ({ path, ruleId: 'missing-stage-report' }),
  )
}

function verifySafeDefaults() {
  const violations = []
  const enforcement = readFileSync(resolve(ROOT, 'lib/authz/enforcement.ts'), 'utf8')
  const operatingModel = readFileSync(
    resolve(ROOT, 'lib/platform-operating-model.ts'),
    'utf8',
  )
  const backfill = readFileSync(resolve(ROOT, 'scripts/g3-rbac-backfill.ts'), 'utf8')

  const required = [
    {
      path: 'lib/authz/enforcement.ts',
      anchor: "G3_RBAC_ENFORCEMENT_ACK !== 'G3-07-DUAL-ALLOW'",
      content: enforcement,
      ruleId: 'unsafe-enforcement-default',
    },
    {
      path: 'lib/authz/enforcement.ts',
      anchor: "G3_RBAC_PRODUCTION_APPROVAL !== 'approved'",
      content: enforcement,
      ruleId: 'missing-production-enforcement-gate',
    },
    {
      path: 'lib/platform-operating-model.ts',
      anchor: 'legacySaasEnabled: false',
      content: operatingModel,
      ruleId: 'legacy-saas-enabled',
    },
    {
      path: 'scripts/g3-rbac-backfill.ts',
      anchor: "mode: apply ? 'APPLY_ISOLATED_TEST' : 'DRY_RUN'",
      content: backfill,
      ruleId: 'backfill-not-dry-run-default',
    },
    {
      path: 'scripts/g3-rbac-backfill.ts',
      anchor: 'G3 backfill writes are forbidden in Production',
      content: backfill,
      ruleId: 'missing-backfill-production-block',
    },
  ]

  for (const item of required) {
    if (!item.content.includes(item.anchor)) {
      violations.push({ path: item.path, ruleId: item.ruleId })
    }
  }
  return violations
}

export function runFinalVerification() {
  const tenantScan = scanUntrustedTenantSources()
  const migrationScan = verifyG3Migrations()
  const workflowScan = verifyWorkflowSafety()
  const violations = [
    ...tenantScan.violations,
    ...migrationScan.violations,
    ...workflowScan.violations,
    ...verifyRequiredArtifacts(),
    ...verifySafeDefaults(),
  ]

  return {
    stage: 'G3-10',
    result: violations.length === 0 ? 'PASS' : 'FAIL',
    checkedAt: new Date().toISOString(),
    violations,
    reviewedPlatformTargets: tenantScan.reviewedPlatformTargets,
    reviewedG3Migrations: migrationScan.reviewed,
    reviewedWorkflows: workflowScan.reviewed,
    requiredStageReportCount: REQUIRED_STAGE_REPORTS.length,
    productionMigrationApplied: false,
    productionDataChanged: false,
    productionDeployPerformed: false,
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  const result = runFinalVerification()
  console.log(JSON.stringify(result, null, 2))
  if (result.result !== 'PASS') process.exitCode = 1
}
