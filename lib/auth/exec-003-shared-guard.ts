import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import {
  assertServerActionRole,
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
  type DatabaseSessionResult,
  type SessionPayload,
} from "@/lib/api-auth-guard";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  exec003ProgressiveRolesForPermission,
  type Exec003DatabaseRole,
  type Exec003PermissionKey,
} from "@/lib/auth/exec-003-permission-assignments";

/**
 * EXEC-003 v2 invariant:
 * effectiveAllow = legacyRoleAllows AND progressivePermissionAllows.
 *
 * The intersection is deliberate. A permission key can narrow a legacy role
 * set, but it can never add a role that the legacy guard rejected.
 */
export function effectiveRolesForExec003Permission(
  legacyAllowedRoles: readonly string[],
  permissionKey: string,
): readonly Exec003DatabaseRole[] | null {
  const progressiveRoles =
    exec003ProgressiveRolesForPermission(permissionKey);

  if (!progressiveRoles) return null;

  const progressive = new Set<string>(progressiveRoles);
  return legacyAllowedRoles.filter(
    (role): role is Exec003DatabaseRole => progressive.has(role),
  );
}

export async function hasExec003DatabasePermission(
  session: SessionPayload,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
): Promise<boolean> {
  const effectiveRoles = effectiveRolesForExec003Permission(
    legacyAllowedRoles,
    permissionKey,
  );

  if (!effectiveRoles || effectiveRoles.length === 0) return false;
  return await hasDatabaseRole(session, effectiveRoles);
}

export async function requireExec003DatabasePermissionSession(
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
): Promise<DatabaseSessionResult> {
  const session = await requireAuth(request);
  if (!session) {
    return {
      session: null,
      error: unauthorizedResponse(request),
    };
  }

  const allowed = await hasExec003DatabasePermission(
    session,
    legacyAllowedRoles,
    permissionKey,
  );
  if (!allowed) {
    return {
      session: null,
      error: forbiddenResponse(request),
    };
  }

  return { session, error: null };
}

export async function runWithExec003DatabasePermission(
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
  operation: (
    session: SessionPayload,
  ) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const auth = await requireExec003DatabasePermissionSession(
    request,
    legacyAllowedRoles,
    permissionKey,
  );
  if (auth.error) return auth.error;

  const session = auth.session;
  return await runWithTenantContext(
    { tenantId: session.tenantId, userId: session.userId },
    () => operation(session),
  );
}

/**
 * Server Action variant. It preserves assertServerActionRole's existing
 * configured-platform-owner behavior, but only for a known shared-guard
 * permission. Unknown, signed-boundary, delegated, and exact-claim keys fail
 * closed before the legacy guard is invoked.
 */
export async function assertExec003ServerActionPermission(
  value: unknown,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
): Promise<SessionPayload> {
  const effectiveRoles = effectiveRolesForExec003Permission(
    legacyAllowedRoles,
    permissionKey,
  );

  if (!effectiveRoles || effectiveRoles.length === 0) {
    throw new Error(`FORBIDDEN:${permissionKey}`);
  }

  return await assertServerActionRole(value, effectiveRoles);
}
