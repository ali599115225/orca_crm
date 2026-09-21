import { AsyncLocalStorage } from 'node:async_hooks'
import { rawPrisma } from '../prisma'
import { getSession } from '../session'
import {
  getTenantContext,
  runWithTenantContext,
} from '../tenant-context'
import {
  PERMISSION_BY_KEY,
  isPermissionKey,
  type PermissionKey,
  type PermissionScope,
} from './permission-registry'

export type AuthorizationReasonCode =
  | 'ALLOW'
  | 'SESSION_REQUIRED'
  | 'SESSION_INVALID'
  | 'TENANT_CONTEXT_MISMATCH'
  | 'USER_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_INACTIVE'
  | 'UNKNOWN_PERMISSION'
  | 'MISSING_PERMISSION'
  | 'SCOPE_NOT_ALLOWED'
  | 'SCOPE_MISMATCH'
  | 'CROSS_TENANT'
  | 'ACCESS_CONTEXT_REQUIRED'

export class AuthorizationError extends Error {
  readonly name = 'AuthorizationError'
  readonly reasonCode: AuthorizationReasonCode
  readonly status: 401 | 403
  readonly permissionKey?: string

  constructor(
    reasonCode: AuthorizationReasonCode,
    options: { permissionKey?: string; status?: 401 | 403 } = {},
  ) {
    super('Authorization denied')
    this.reasonCode = reasonCode
    this.permissionKey = options.permissionKey
    this.status = options.status ?? (reasonCode.startsWith('SESSION_') ? 401 : 403)
  }
}

export type AccessSessionIdentity = Readonly<{
  userId: string
  tenantId: string
  legacyRole: string
}>

export type ResolvedOrgAssignment = Readonly<{
  id: string
  orgUnitId: string
  isPrimary: boolean
  validFrom: Date
  validUntil: Date | null
}>

export type ResolvedRoleAssignment = Readonly<{
  id: string
  accessRoleId: string
  roleKey: string
  scopeType: PermissionScope
  scopeOrgUnitId: string | null
  resourceType: string | null
  resourceId: string | null
  validFrom: Date
  validUntil: Date | null
  permissionKeys: ReadonlySet<PermissionKey>
}>

export type AccessContext = Readonly<{
  tenantId: string
  userId: string
  tenantActive: true
  userActive: true
  legacyRole: string
  orgAssignments: readonly ResolvedOrgAssignment[]
  roleAssignments: readonly ResolvedRoleAssignment[]
  permissionKeys: ReadonlySet<PermissionKey>
  resolvedAt: Date
}>

export type ResourceAccessScope = Readonly<{
  tenantId: string
  branchId?: string | null
  departmentId?: string | null
  teamId?: string | null
  ownerUserId?: string | null
  assignedUserId?: string | null
  resourceType?: string | null
  resourceId?: string | null
}>

export type AuthorizationDecision = Readonly<{
  allowed: boolean
  permissionKey: string
  reasonCode: AuthorizationReasonCode
  matchedRoleAssignmentId: string | null
}>

type SnapshotOrgAssignment = {
  id: string
  tenantId: string
  userId: string
  orgUnitId: string
  status: string
  isPrimary: boolean
  validFrom: Date
  validUntil: Date | null
}

type SnapshotRoleAssignment = {
  id: string
  tenantId: string
  userId: string
  accessRoleId: string
  scopeType: string
  scopeOrgUnitId: string | null
  resourceType: string | null
  resourceId: string | null
  status: string
  validFrom: Date
  validUntil: Date | null
}

export type AccessStateSnapshot = Readonly<{
  user: { id: string; tenantId: string; isActive: boolean; role: string } | null
  tenant: { id: string; isActive: boolean } | null
  orgAssignments: readonly SnapshotOrgAssignment[]
  roleAssignments: readonly SnapshotRoleAssignment[]
  roles: readonly { id: string; tenantId: string; key: string; isActive: boolean }[]
  rolePermissionLinks: readonly {
    tenantId: string
    accessRoleId: string
    permissionId: string
  }[]
  permissions: readonly { id: string; key: string; isActive: boolean }[]
}>

export interface AccessStateLoader {
  load(identity: AccessSessionIdentity, now: Date): Promise<AccessStateSnapshot>
}

const VALID_SCOPES = new Set<PermissionScope>([
  'TENANT',
  'BRANCH',
  'DEPARTMENT',
  'TEAM',
  'SELF',
  'RESOURCE',
])

function isActiveAt(
  status: string,
  validFrom: Date,
  validUntil: Date | null,
  now: Date,
): boolean {
  return status === 'ACTIVE' && validFrom <= now && (!validUntil || validUntil > now)
}

function normalizeSessionIdentity(value: unknown): AccessSessionIdentity {
  if (value == null) {
    throw new AuthorizationError('SESSION_REQUIRED', { status: 401 })
  }
  if (typeof value !== 'object') {
    throw new AuthorizationError('SESSION_INVALID', { status: 401 })
  }

  const session = value as Record<string, unknown>
  if (
    typeof session.userId !== 'string' ||
    session.userId.trim() === '' ||
    typeof session.tenantId !== 'string' ||
    session.tenantId.trim() === ''
  ) {
    throw new AuthorizationError('SESSION_INVALID', { status: 401 })
  }

  return Object.freeze({
    userId: session.userId,
    tenantId: session.tenantId,
    legacyRole: typeof session.role === 'string' ? session.role : '',
  })
}

export const prismaAccessStateLoader: AccessStateLoader = {
  async load(identity, now) {
    const [user, tenant, orgAssignments, roleAssignments] = await Promise.all([
      rawPrisma.user.findFirst({
        where: { id: identity.userId, tenantId: identity.tenantId },
        select: { id: true, tenantId: true, isActive: true, role: true },
      }),
      rawPrisma.tenant.findUnique({
        where: { id: identity.tenantId },
        select: { id: true, isActive: true },
      }),
      rawPrisma.orgAssignment.findMany({
        where: {
          tenantId: identity.tenantId,
          userId: identity.userId,
          status: 'ACTIVE',
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          orgUnitId: true,
          status: true,
          isPrimary: true,
          validFrom: true,
          validUntil: true,
        },
      }),
      rawPrisma.roleAssignment.findMany({
        where: {
          tenantId: identity.tenantId,
          userId: identity.userId,
          status: 'ACTIVE',
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          accessRoleId: true,
          scopeType: true,
          scopeOrgUnitId: true,
          resourceType: true,
          resourceId: true,
          status: true,
          validFrom: true,
          validUntil: true,
        },
      }),
    ])

    const roleIds = [...new Set(roleAssignments.map(({ accessRoleId }) => accessRoleId))]
    const roles = roleIds.length
      ? await rawPrisma.accessRole.findMany({
          where: { tenantId: identity.tenantId, id: { in: roleIds }, isActive: true },
          select: { id: true, tenantId: true, key: true, isActive: true },
        })
      : []

    const activeRoleIds = roles.map(({ id }) => id)
    const rolePermissionLinks = activeRoleIds.length
      ? await rawPrisma.accessRolePermission.findMany({
          where: {
            tenantId: identity.tenantId,
            accessRoleId: { in: activeRoleIds },
          },
          select: { tenantId: true, accessRoleId: true, permissionId: true },
        })
      : []

    const permissionIds = [
      ...new Set(rolePermissionLinks.map(({ permissionId }) => permissionId)),
    ]
    const permissions = permissionIds.length
      ? await rawPrisma.accessPermission.findMany({
          where: { id: { in: permissionIds }, isActive: true },
          select: { id: true, key: true, isActive: true },
        })
      : []

    return {
      user: user
        ? { ...user, role: String(user.role) }
        : null,
      tenant,
      orgAssignments,
      roleAssignments: roleAssignments.map((assignment) => ({
        ...assignment,
        scopeType: String(assignment.scopeType),
        status: String(assignment.status),
      })),
      roles,
      rolePermissionLinks,
      permissions,
    }
  },
}

export async function resolveAccessContext(
  verifiedSession: unknown,
  options: { loader?: AccessStateLoader; now?: Date } = {},
): Promise<AccessContext> {
  const identity = normalizeSessionIdentity(verifiedSession)
  const existingTenantContext = getTenantContext()
  if (
    existingTenantContext &&
    (existingTenantContext.tenantId !== identity.tenantId ||
      (existingTenantContext.userId && existingTenantContext.userId !== identity.userId))
  ) {
    throw new AuthorizationError('TENANT_CONTEXT_MISMATCH')
  }

  const now = options.now ?? new Date()
  const snapshot = await (options.loader ?? prismaAccessStateLoader).load(identity, now)

  if (!snapshot.user) throw new AuthorizationError('USER_NOT_FOUND')
  if (snapshot.user.tenantId !== identity.tenantId) {
    throw new AuthorizationError('TENANT_CONTEXT_MISMATCH')
  }
  if (!snapshot.user.isActive) throw new AuthorizationError('USER_INACTIVE')
  if (!snapshot.tenant) throw new AuthorizationError('TENANT_NOT_FOUND')
  if (snapshot.tenant.id !== identity.tenantId) {
    throw new AuthorizationError('TENANT_CONTEXT_MISMATCH')
  }
  if (!snapshot.tenant.isActive) throw new AuthorizationError('TENANT_INACTIVE')

  const activeRoles = new Map(
    snapshot.roles
      .filter(
        (role) => role.tenantId === identity.tenantId && role.isActive,
      )
      .map((role) => [role.id, role]),
  )
  const activePermissions = new Map(
    snapshot.permissions
      .filter((permission) => permission.isActive && isPermissionKey(permission.key))
      .map((permission) => [permission.id, permission.key as PermissionKey]),
  )
  const permissionsByRole = new Map<string, Set<PermissionKey>>()

  for (const link of snapshot.rolePermissionLinks) {
    if (link.tenantId !== identity.tenantId || !activeRoles.has(link.accessRoleId)) continue
    const permissionKey = activePermissions.get(link.permissionId)
    if (!permissionKey) continue
    const set = permissionsByRole.get(link.accessRoleId) ?? new Set<PermissionKey>()
    set.add(permissionKey)
    permissionsByRole.set(link.accessRoleId, set)
  }

  const roleAssignments: ResolvedRoleAssignment[] = []
  const permissionKeys = new Set<PermissionKey>()
  for (const assignment of snapshot.roleAssignments) {
    if (
      assignment.tenantId !== identity.tenantId ||
      assignment.userId !== identity.userId ||
      !isActiveAt(assignment.status, assignment.validFrom, assignment.validUntil, now) ||
      !VALID_SCOPES.has(assignment.scopeType as PermissionScope)
    ) {
      continue
    }
    const role = activeRoles.get(assignment.accessRoleId)
    if (!role) continue
    const rolePermissions = permissionsByRole.get(role.id) ?? new Set<PermissionKey>()
    for (const permissionKey of rolePermissions) permissionKeys.add(permissionKey)

    roleAssignments.push(
      Object.freeze({
        id: assignment.id,
        accessRoleId: role.id,
        roleKey: role.key,
        scopeType: assignment.scopeType as PermissionScope,
        scopeOrgUnitId: assignment.scopeOrgUnitId,
        resourceType: assignment.resourceType,
        resourceId: assignment.resourceId,
        validFrom: assignment.validFrom,
        validUntil: assignment.validUntil,
        permissionKeys: rolePermissions,
      }),
    )
  }

  const orgAssignments = snapshot.orgAssignments
    .filter(
      (assignment) =>
        assignment.tenantId === identity.tenantId &&
        assignment.userId === identity.userId &&
        isActiveAt(assignment.status, assignment.validFrom, assignment.validUntil, now),
    )
    .map((assignment) =>
      Object.freeze({
        id: assignment.id,
        orgUnitId: assignment.orgUnitId,
        isPrimary: assignment.isPrimary,
        validFrom: assignment.validFrom,
        validUntil: assignment.validUntil,
      }),
    )

  return Object.freeze({
    tenantId: identity.tenantId,
    userId: identity.userId,
    tenantActive: true as const,
    userActive: true as const,
    legacyRole: String(snapshot.user.role),
    orgAssignments: Object.freeze(orgAssignments),
    roleAssignments: Object.freeze(roleAssignments),
    permissionKeys,
    resolvedAt: now,
  })
}

export async function resolveCurrentAccessContext(
  options: { loader?: AccessStateLoader; now?: Date } = {},
): Promise<AccessContext> {
  return resolveAccessContext(await getSession(), options)
}

export function scopeMatch(
  context: AccessContext,
  assignment: ResolvedRoleAssignment,
  resource: ResourceAccessScope,
): boolean {
  if (resource.tenantId !== context.tenantId) return false

  switch (assignment.scopeType) {
    case 'TENANT':
      return true
    case 'BRANCH':
      return Boolean(
        assignment.scopeOrgUnitId &&
          resource.branchId === assignment.scopeOrgUnitId,
      )
    case 'DEPARTMENT':
      return Boolean(
        assignment.scopeOrgUnitId &&
          resource.departmentId === assignment.scopeOrgUnitId,
      )
    case 'TEAM':
      return Boolean(
        assignment.scopeOrgUnitId &&
          resource.teamId === assignment.scopeOrgUnitId,
      )
    case 'SELF':
      return (
        resource.ownerUserId === context.userId ||
        resource.assignedUserId === context.userId
      )
    case 'RESOURCE':
      return Boolean(
        assignment.resourceType &&
          assignment.resourceId &&
          resource.resourceType === assignment.resourceType &&
          resource.resourceId === assignment.resourceId,
      )
    default:
      return false
  }
}

export function authorize(
  context: AccessContext,
  permissionKey: string,
  resource: ResourceAccessScope = { tenantId: context.tenantId },
): AuthorizationDecision {
  if (!isPermissionKey(permissionKey)) {
    return {
      allowed: false,
      permissionKey,
      reasonCode: 'UNKNOWN_PERMISSION',
      matchedRoleAssignmentId: null,
    }
  }
  if (resource.tenantId !== context.tenantId) {
    return {
      allowed: false,
      permissionKey,
      reasonCode: 'CROSS_TENANT',
      matchedRoleAssignmentId: null,
    }
  }

  const carryingAssignments = context.roleAssignments.filter((assignment) =>
    assignment.permissionKeys.has(permissionKey),
  )
  if (carryingAssignments.length === 0) {
    return {
      allowed: false,
      permissionKey,
      reasonCode: 'MISSING_PERMISSION',
      matchedRoleAssignmentId: null,
    }
  }

  const permittedScopeAssignments = carryingAssignments.filter((assignment) =>
    PERMISSION_BY_KEY[permissionKey].scopes.includes(assignment.scopeType),
  )
  if (permittedScopeAssignments.length === 0) {
    return {
      allowed: false,
      permissionKey,
      reasonCode: 'SCOPE_NOT_ALLOWED',
      matchedRoleAssignmentId: null,
    }
  }

  const match = permittedScopeAssignments.find((assignment) =>
    scopeMatch(context, assignment, resource),
  )
  if (!match) {
    return {
      allowed: false,
      permissionKey,
      reasonCode: 'SCOPE_MISMATCH',
      matchedRoleAssignmentId: null,
    }
  }

  return {
    allowed: true,
    permissionKey,
    reasonCode: 'ALLOW',
    matchedRoleAssignmentId: match.id,
  }
}

export function requirePermission(
  context: AccessContext,
  permissionKey: string,
  resource?: ResourceAccessScope,
): AuthorizationDecision {
  const decision = authorize(context, permissionKey, resource)
  if (!decision.allowed) {
    throw new AuthorizationError(decision.reasonCode, { permissionKey })
  }
  return decision
}

const globalForAccessContext = globalThis as typeof globalThis & {
  __orcaAccessContext?: AsyncLocalStorage<AccessContext>
}

export const accessContextStorage =
  globalForAccessContext.__orcaAccessContext ??
  new AsyncLocalStorage<AccessContext>()
globalForAccessContext.__orcaAccessContext = accessContextStorage

export function getAccessContext(): AccessContext | null {
  return accessContextStorage.getStore() ?? null
}

export function requireAccessContext(): AccessContext {
  const context = getAccessContext()
  if (!context) throw new AuthorizationError('ACCESS_CONTEXT_REQUIRED')
  return context
}

export function runWithAccessContext<T>(
  context: AccessContext,
  operation: () => T,
): T {
  return runWithTenantContext(
    { tenantId: context.tenantId, userId: context.userId },
    () => accessContextStorage.run(context, operation),
  )
}

export async function runWithResolvedAccessContext<T>(
  verifiedSession: unknown,
  operation: (context: AccessContext) => Promise<T> | T,
  options: { loader?: AccessStateLoader; now?: Date } = {},
): Promise<T> {
  const context = await resolveAccessContext(verifiedSession, options)
  return await runWithAccessContext(context, () => operation(context))
}
