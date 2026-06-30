import { ErrorCode, publicError, type PublicErrorResponse } from '@/lib/errors';

export type TenantScopedSession = {
  userId: string;
  tenantId: string;
  role: string;
};

export type TenantIsolationInput = {
  session: TenantScopedSession;
  routeTenantId?: string | null;
  queryTenantId?: string | null;
  bodyTenantId?: string | null;
  clientRole?: string | null;
  resourceTenantId?: string | null;
};

export type TenantIsolationDecision =
  | { allowed: true; tenantId: string; trustedRole: string }
  | { allowed: false; status: 403; publicError: PublicErrorResponse };

function conflictsWithSession(
  sessionTenantId: string,
  candidate?: string | null,
): boolean {
  return Boolean(candidate && candidate !== sessionTenantId);
}

export function evaluateTenantIsolation(
  input: TenantIsolationInput,
): TenantIsolationDecision {
  const { session } = input;

  const hasCrossTenantInput =
    conflictsWithSession(session.tenantId, input.routeTenantId) ||
    conflictsWithSession(session.tenantId, input.queryTenantId) ||
    conflictsWithSession(session.tenantId, input.bodyTenantId) ||
    conflictsWithSession(session.tenantId, input.resourceTenantId);

  if (hasCrossTenantInput) {
    return {
      allowed: false,
      status: 403,
      publicError: publicError(
        ErrorCode.FORBIDDEN,
        'tenant isolation violation',
      ),
    };
  }

  return {
    allowed: true,
    tenantId: session.tenantId,
    trustedRole: session.role,
  };
}

export function tenantScopedWhere<T extends Record<string, unknown>>(
  session: TenantScopedSession,
  where: T,
): T & { tenantId: string } {
  return { ...where, tenantId: session.tenantId };
}

