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
import { getSession } from "@/lib/session";
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
  const progressiveRoles = exec003ProgressiveRolesForPermission(permissionKey);

  if (!progressiveRoles) return null;

  const progressive = new Set<string>(progressiveRoles);
  return legacyAllowedRoles.filter(
    (role): role is Exec003DatabaseRole => progressive.has(role),
  );
}

function normalizeExec003Session(value: unknown): SessionPayload | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Record<string, unknown>;
  if (
    typeof session.userId !== "string" ||
    !session.userId ||
    typeof session.tenantId !== "string" ||
    !session.tenantId
  ) {
    return null;
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId,
    role: typeof session.role === "string" ? session.role : "",
    tenantSubdomain:
      typeof session.tenantSubdomain === "string"
        ? session.tenantSubdomain
        : undefined,
    name: typeof session.name === "string" ? session.name : undefined,
  };
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

export async function requireExec003DatabasePermissionForSession(
  value: unknown,
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
): Promise<DatabaseSessionResult> {
  const session = normalizeExec003Session(value);
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

export async function requireExec003DatabasePermissionSession(
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
): Promise<DatabaseSessionResult> {
  return await requireExec003DatabasePermissionForSession(
    await requireAuth(request),
    request,
    legacyAllowedRoles,
    permissionKey,
  );
}

async function runAuthorizedOperation(
  auth: DatabaseSessionResult,
  operation: (session: SessionPayload) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  if (auth.error) return auth.error;

  const session = auth.session;
  return await runWithTenantContext(
    { tenantId: session.tenantId, userId: session.userId },
    () => operation(session),
  );
}

export async function runWithExec003DatabasePermission(
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
  operation: (session: SessionPayload) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  return await runAuthorizedOperation(
    await requireExec003DatabasePermissionSession(
      request,
      legacyAllowedRoles,
      permissionKey,
    ),
    operation,
  );
}

/**
 * Preserves legacy Cookie-only authentication. Using requireAuth(request) on
 * these contracts would also accept Bearer credentials and could expand the
 * legacy authentication channel before RBAC is evaluated.
 */
export async function runWithExec003CookiePermission(
  request: NextRequest,
  legacyAllowedRoles: readonly string[],
  permissionKey: Exec003PermissionKey,
  operation: (session: SessionPayload) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  return await runAuthorizedOperation(
    await requireExec003DatabasePermissionForSession(
      await getSession(),
      request,
      legacyAllowedRoles,
      permissionKey,
    ),
    operation,
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
