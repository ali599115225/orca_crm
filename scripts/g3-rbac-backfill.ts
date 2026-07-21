import { rawPrisma } from '../lib/prisma'
import { PERMISSION_REGISTRY } from '../lib/authz/permission-registry'
import {
  ACCESS_ROLE_BLUEPRINTS,
  DEFAULT_BRANCH_CODE,
  DEFAULT_DEPARTMENT_CODE,
  accessRoleKeyForLegacyRole,
} from '../lib/authz/backfill-plan'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const explicitDryRun = args.includes('--dry-run')

if (apply && explicitDryRun) {
  throw new Error('Choose either --dry-run or --apply, not both.')
}

const batchArgument = args.find((argument) => argument.startsWith('--batch-size='))
const batchSize = batchArgument ? Number(batchArgument.split('=')[1]) : 100

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
  throw new Error('G3 backfill batch size must be an integer from 1 to 1000.')
}

function assertIsolatedWriteGate(): void {
  if (!apply) return

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('G3 backfill writes are forbidden in Production.')
  }

  if (
    process.env.G3_BACKFILL_TARGET !== 'isolated-test' ||
    process.env.ALLOW_G3_BACKFILL_WRITE !== 'true'
  ) {
    throw new Error(
      'Apply mode requires G3_BACKFILL_TARGET=isolated-test and ALLOW_G3_BACKFILL_WRITE=true.',
    )
  }
}

assertIsolatedWriteGate()

type TenantSnapshot = {
  users: number
  orgUnits: number
  orgAssignments: number
  accessRoles: number
  rolePermissions: number
  roleAssignments: number
}

async function snapshotTenant(tenantId: string): Promise<TenantSnapshot> {
  const [users, orgUnits, orgAssignments, accessRoles, rolePermissions, roleAssignments] =
    await Promise.all([
      rawPrisma.user.count({ where: { tenantId } }),
      rawPrisma.orgUnit.count({ where: { tenantId } }),
      rawPrisma.orgAssignment.count({ where: { tenantId } }),
      rawPrisma.accessRole.count({ where: { tenantId } }),
      rawPrisma.accessRolePermission.count({ where: { tenantId } }),
      rawPrisma.roleAssignment.count({ where: { tenantId } }),
    ])

  return { users, orgUnits, orgAssignments, accessRoles, rolePermissions, roleAssignments }
}

async function seedPermissions(): Promise<{ before: number; after: number; planned: number }> {
  const before = await rawPrisma.accessPermission.count()

  if (apply) {
    for (const permission of PERMISSION_REGISTRY) {
      await rawPrisma.accessPermission.upsert({
        where: { key: permission.key },
        update: {
          resource: permission.resource,
          action: permission.action,
          risk: permission.risk,
          description: permission.description,
          isActive: true,
        },
        create: {
          key: permission.key,
          resource: permission.resource,
          action: permission.action,
          risk: permission.risk,
          description: permission.description,
          isActive: true,
        },
      })
    }
  }

  const after = apply ? await rawPrisma.accessPermission.count() : before
  return { before, after, planned: PERMISSION_REGISTRY.length }
}

async function applyTenantBackfill(tenantId: string): Promise<void> {
  const branch = await rawPrisma.orgUnit.upsert({
    where: { tenantId_code: { tenantId, code: DEFAULT_BRANCH_CODE } },
    update: { name: 'Default Branch', type: 'BRANCH', isActive: true },
    create: {
      tenantId,
      code: DEFAULT_BRANCH_CODE,
      name: 'Default Branch',
      type: 'BRANCH',
      isActive: true,
      metadata: { source: 'g3-04-backfill' },
    },
  })

  const department = await rawPrisma.orgUnit.upsert({
    where: { tenantId_code: { tenantId, code: DEFAULT_DEPARTMENT_CODE } },
    update: {
      name: 'Default Department',
      type: 'DEPARTMENT',
      parentId: branch.id,
      isActive: true,
    },
    create: {
      tenantId,
      parentId: branch.id,
      code: DEFAULT_DEPARTMENT_CODE,
      name: 'Default Department',
      type: 'DEPARTMENT',
      isActive: true,
      metadata: { source: 'g3-04-backfill' },
    },
  })

  const permissionRows = await rawPrisma.accessPermission.findMany({
    where: { key: { in: [...PERMISSION_REGISTRY.map(({ key }) => key)] } },
    select: { id: true, key: true },
  })
  const permissionIdByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]))

  const roleIdByKey = new Map<string, string>()
  for (const blueprint of ACCESS_ROLE_BLUEPRINTS) {
    const role = await rawPrisma.accessRole.upsert({
      where: { tenantId_key: { tenantId, key: blueprint.key } },
      update: {
        name: blueprint.name,
        description: blueprint.description,
        isSystem: true,
        isActive: true,
      },
      create: {
        tenantId,
        key: blueprint.key,
        name: blueprint.name,
        description: blueprint.description,
        isSystem: true,
        isActive: true,
      },
    })
    roleIdByKey.set(blueprint.key, role.id)

    const mappings = blueprint.permissionKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey)
      if (!permissionId) {
        throw new Error(`Permission was not seeded before role mapping: ${permissionKey}`)
      }
      return { tenantId, accessRoleId: role.id, permissionId }
    })

    await rawPrisma.accessRolePermission.createMany({ data: mappings, skipDuplicates: true })
  }

  let cursor: string | undefined
  for (;;) {
    const users = await rawPrisma.user.findMany({
      where: { tenantId },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, role: true },
    })

    if (users.length === 0) break

    await rawPrisma.orgAssignment.createMany({
      data: users.map((user) => ({
        tenantId,
        userId: user.id,
        orgUnitId: department.id,
        status: 'ACTIVE',
        isPrimary: true,
        metadata: { source: 'g3-04-backfill' },
      })),
      skipDuplicates: true,
    })

    for (const user of users) {
      const roleKey = accessRoleKeyForLegacyRole(user.role)
      const accessRoleId = roleIdByKey.get(roleKey)
      if (!accessRoleId) throw new Error(`Access role was not seeded: ${roleKey}`)

      const existing = await rawPrisma.roleAssignment.findFirst({
        where: {
          tenantId,
          userId: user.id,
          accessRoleId,
          scopeType: 'TENANT',
          status: 'ACTIVE',
          resourceType: null,
          resourceId: null,
        },
        select: { id: true },
      })

      if (!existing) {
        await rawPrisma.roleAssignment.create({
          data: {
            tenantId,
            userId: user.id,
            accessRoleId,
            scopeType: 'TENANT',
            status: 'ACTIVE',
            metadata: { source: 'g3-04-backfill', legacyRole: user.role },
          },
        })
      }
    }

    cursor = users.at(-1)?.id
  }
}

async function main(): Promise<void> {
  const permissionSummary = await seedPermissions()
  const tenants = await rawPrisma.tenant.findMany({
    orderBy: { id: 'asc' },
    select: { id: true },
  })

  const tenantSummaries = []
  for (const tenant of tenants) {
    const before = await snapshotTenant(tenant.id)
    if (apply) await applyTenantBackfill(tenant.id)
    const after = apply ? await snapshotTenant(tenant.id) : before

    tenantSummaries.push({
      tenantId: tenant.id,
      before,
      after,
      expected: {
        minimumOrgUnits: 2,
        roles: ACCESS_ROLE_BLUEPRINTS.length,
        orgAssignments: before.users,
        roleAssignments: before.users,
        rolePermissionMappings: ACCESS_ROLE_BLUEPRINTS.reduce(
          (total, role) => total + role.permissionKeys.length,
          0,
        ),
      },
    })
  }

  console.log(
    JSON.stringify(
      {
        stage: 'G3-04',
        mode: apply ? 'APPLY_ISOLATED_TEST' : 'DRY_RUN',
        batchSize,
        permissionSummary,
        tenantCount: tenants.length,
        tenantSummaries,
        containsSensitivePayloads: false,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown G3 backfill failure'
    console.error(`[G3-04] ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await rawPrisma.$disconnect()
  })
