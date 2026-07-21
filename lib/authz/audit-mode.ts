import { rawPrisma } from '../prisma'
import {
  AuthorizationError,
  authorize,
  resolveAccessContext,
  type AccessContext,
  type AccessStateLoader,
  type ResourceAccessScope,
} from './authorization'

export type AuditNewDecision = 'ALLOW' | 'DENY' | 'ERROR'
export type AuditDifference =
  | 'MATCH_ALLOW'
  | 'MATCH_DENY'
  | 'LEGACY_ALLOW_RBAC_DENY'
  | 'LEGACY_DENY_RBAC_ALLOW'
  | 'EVALUATION_ERROR'

export type SafeAuthorizationAuditEvent = Readonly<{
  mode: 'AUDIT'
  tenantId: string
  userId: string
  permissionKey: string
  source: string
  requestId: string | null
  legacyDecision: 'ALLOW' | 'DENY'
  newDecision: AuditNewDecision
  legacyAllowed: boolean
  rbacAllowed: boolean
  wouldAllow: boolean
  wouldDeny: boolean
  reasonCode: string
  difference: AuditDifference
  scopeType: string | null
  scopeId: string | null
  resourceType: string | null
  resourceId: string | null
  evaluatedAt: Date
}>

export type AuthorizationAuditObservation = Readonly<{
  evaluated: boolean
  effectiveAllowed: boolean
  event: SafeAuthorizationAuditEvent | null
}>

export interface AuthorizationAuditSink {
  write(event: SafeAuthorizationAuditEvent): Promise<void>
}

export type LegacyAuthorizationAuditOptions = Readonly<{
  permissionKey: string
  source: string
  resource?: ResourceAccessScope
  requestId?: string | null
  enabled?: boolean
  now?: Date
  loader?: AccessStateLoader
  resolver?: (
    verifiedSession: unknown,
    options: { loader?: AccessStateLoader; now?: Date },
  ) => Promise<AccessContext>
  sink?: AuthorizationAuditSink
}>

function safeLabel(value: string, fallback: string): string {
  const normalized = value.trim().slice(0, 160)
  return /^[A-Za-z0-9_./:[\]-]+$/.test(normalized) ? normalized : fallback
}

function auditEnabled(options: LegacyAuthorizationAuditOptions): boolean {
  if (typeof options.enabled === 'boolean') return options.enabled
  return process.env.G3_RBAC_AUDIT_MODE === 'enabled'
}

function differenceFor(
  legacyAllowed: boolean,
  newDecision: AuditNewDecision,
): AuditDifference {
  if (newDecision === 'ERROR') return 'EVALUATION_ERROR'
  if (legacyAllowed && newDecision === 'ALLOW') return 'MATCH_ALLOW'
  if (!legacyAllowed && newDecision === 'DENY') return 'MATCH_DENY'
  if (legacyAllowed) return 'LEGACY_ALLOW_RBAC_DENY'
  return 'LEGACY_DENY_RBAC_ALLOW'
}

export const safeConsoleAuthorizationAuditSink: AuthorizationAuditSink = {
  async write(event) {
    console.info('[G3_RBAC_AUDIT]', {
      mode: event.mode,
      tenantId: event.tenantId,
      userId: event.userId,
      permissionKey: event.permissionKey,
      source: event.source,
      requestId: event.requestId,
      legacyDecision: event.legacyDecision,
      newDecision: event.newDecision,
      wouldAllow: event.wouldAllow,
      wouldDeny: event.wouldDeny,
      reasonCode: event.reasonCode,
      difference: event.difference,
      scopeType: event.scopeType,
      scopeId: event.scopeId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      evaluatedAt: event.evaluatedAt.toISOString(),
    })
  },
}

export const prismaAuthorizationAuditSink: AuthorizationAuditSink = {
  async write(event) {
    await rawPrisma.authorizationAudit.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        permissionKey: event.permissionKey,
        mode: 'AUDIT',
        decision:
          event.newDecision === 'ALLOW'
            ? 'SHADOW_ALLOW'
            : event.newDecision === 'DENY'
              ? 'SHADOW_DENY'
              : 'ERROR',
        legacyAllowed: event.legacyAllowed,
        rbacAllowed: event.rbacAllowed,
        scopeType: event.scopeType as
          | 'TENANT'
          | 'BRANCH'
          | 'DEPARTMENT'
          | 'TEAM'
          | 'SELF'
          | 'RESOURCE'
          | null,
        scopeId: event.scopeId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        reasonCode: event.reasonCode,
        source: event.source,
        requestId: event.requestId,
      },
    })
  },
}

function selectedSink(options: LegacyAuthorizationAuditOptions): AuthorizationAuditSink {
  if (options.sink) return options.sink
  if (process.env.G3_RBAC_AUDIT_PERSIST === 'true') {
    return prismaAuthorizationAuditSink
  }
  return safeConsoleAuthorizationAuditSink
}

async function writeSafely(
  sink: AuthorizationAuditSink,
  event: SafeAuthorizationAuditEvent,
): Promise<void> {
  try {
    await sink.write(event)
  } catch {
    console.warn('[G3_RBAC_AUDIT]', { code: 'AUDIT_SINK_FAILED' })
  }
}

function safeRequestId(value: string | null | undefined): string | null {
  if (!value) return null
  return safeLabel(value, 'invalid-request-id')
}

/**
 * Computes and records a shadow RBAC decision while preserving the legacy
 * decision as the only effective decision. This function never enforces RBAC.
 */
export async function observeLegacyAuthorization(
  verifiedSession: Readonly<{ userId: string; tenantId: string; role?: string }>,
  legacyAllowed: boolean,
  options: LegacyAuthorizationAuditOptions,
): Promise<AuthorizationAuditObservation> {
  if (!auditEnabled(options)) {
    return Object.freeze({
      evaluated: false,
      effectiveAllowed: legacyAllowed,
      event: null,
    })
  }

  const now = options.now ?? new Date()
  const permissionKey = safeLabel(options.permissionKey, 'invalid.permission')
  const source = safeLabel(options.source, 'unknown-source')
  const requestId = safeRequestId(options.requestId)
  const resource = options.resource ?? { tenantId: verifiedSession.tenantId }
  const sink = selectedSink(options)

  let event: SafeAuthorizationAuditEvent
  try {
    const resolver = options.resolver ?? resolveAccessContext
    const context = await resolver(verifiedSession, {
      loader: options.loader,
      now,
    })
    const decision = authorize(context, permissionKey, resource)
    const matchedAssignment = decision.matchedRoleAssignmentId
      ? context.roleAssignments.find(
          ({ id }) => id === decision.matchedRoleAssignmentId,
        ) ?? null
      : null
    const newDecision: AuditNewDecision = decision.allowed ? 'ALLOW' : 'DENY'

    event = Object.freeze({
      mode: 'AUDIT' as const,
      tenantId: verifiedSession.tenantId,
      userId: verifiedSession.userId,
      permissionKey,
      source,
      requestId,
      legacyDecision: legacyAllowed ? ('ALLOW' as const) : ('DENY' as const),
      newDecision,
      legacyAllowed,
      rbacAllowed: decision.allowed,
      wouldAllow: decision.allowed,
      wouldDeny: !decision.allowed,
      reasonCode: decision.reasonCode,
      difference: differenceFor(legacyAllowed, newDecision),
      scopeType: matchedAssignment?.scopeType ?? null,
      scopeId:
        matchedAssignment?.scopeOrgUnitId ??
        matchedAssignment?.resourceId ??
        null,
      resourceType: resource.resourceType ?? null,
      resourceId: resource.resourceId ?? null,
      evaluatedAt: now,
    })
  } catch (error: unknown) {
    const reasonCode =
      error instanceof AuthorizationError
        ? error.reasonCode
        : 'AUDIT_EVALUATION_ERROR'

    event = Object.freeze({
      mode: 'AUDIT' as const,
      tenantId: verifiedSession.tenantId,
      userId: verifiedSession.userId,
      permissionKey,
      source,
      requestId,
      legacyDecision: legacyAllowed ? ('ALLOW' as const) : ('DENY' as const),
      newDecision: 'ERROR' as const,
      legacyAllowed,
      rbacAllowed: false,
      wouldAllow: false,
      wouldDeny: true,
      reasonCode,
      difference: 'EVALUATION_ERROR' as const,
      scopeType: null,
      scopeId: null,
      resourceType: resource.resourceType ?? null,
      resourceId: resource.resourceId ?? null,
      evaluatedAt: now,
    })
  }

  await writeSafely(sink, event)
  return Object.freeze({
    evaluated: true,
    effectiveAllowed: legacyAllowed,
    event,
  })
}
