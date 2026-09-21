/**
 * ORCA CRM centralized API authentication and authorization guards.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { httpErrorResponse } from '@/lib/http-error-response';
import {
  authBootstrapFindUserEmail,
  authBootstrapFindUserRole,
  authBootstrapFindTenantActive,
} from '@/lib/system-prisma-boundary';
import { decrypt } from '@/lib/session';
import { runWithTenantContext, setTenantContext } from '@/lib/tenant-context';
import {
  ErrorCode,
  publicError,
  type PublicErrorResponse,
} from '@/lib/errors';
import {
  isConfiguredSuperAdminEmail as isConfiguredSuperAdminEmailFromEnv,
} from '@/lib/platform-identity';

export type SessionPayload = {
  userId: string;
  tenantId: string;
  role: string;
  tenantSubdomain?: string;
  name?: string;
};

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

function normalizeSessionPayload(value: unknown): SessionPayload | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as Record<string, unknown>;
  if (
    typeof payload.userId !== 'string' ||
    !payload.userId ||
    typeof payload.tenantId !== 'string' ||
    !payload.tenantId
  ) {
    return null;
  }

  return {
    userId: payload.userId,
    tenantId: payload.tenantId,
    role: typeof payload.role === 'string' ? payload.role : '',
    tenantSubdomain:
      typeof payload.tenantSubdomain === 'string'
        ? payload.tenantSubdomain
        : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}

export async function requireAuth(
  request?: NextRequest
): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (sessionToken) {
    try {
      const session = normalizeSessionPayload(await decrypt(sessionToken));
      if (session) return session;
    } catch {
      // Continue to Bearer authentication when a stale cookie is present.
    }
  }

  const authHeader = request?.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    if (token) {
      try {
        const session = normalizeSessionPayload(await decrypt(token));
        if (session) return session;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function isConfiguredSuperAdminEmail(email: string): boolean {
  return isConfiguredSuperAdminEmailFromEnv(email);
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await authBootstrapFindUserEmail(userId);

    return isConfiguredSuperAdminEmailFromEnv(user?.email);
  } catch {
    return false;
  }
}

/**
 * Verifies the current database role and active tenant.
 * This intentionally does not trust a potentially stale role claim alone.
 */
export async function hasDatabaseRole(
  session: SessionPayload,
  allowedRoles: readonly string[]
): Promise<boolean> {
  if (!allowedRoles.length) return false;

  try {
    const [user, tenant] = await Promise.all([
      authBootstrapFindUserRole(session.userId, session.tenantId),
      authBootstrapFindTenantActive(session.tenantId),
    ]);

    return Boolean(
      user &&
        tenant &&
        allowedRoles.includes(String(user.role))
    );
  } catch {
    return false;
  }
}

/**
 * All database tenant roles from the Prisma enum.
 * Shared across P1-A routes to preserve the previous authenticated-route
 * access behavior while adding database revalidation.
 */
export const TENANT_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const satisfies readonly string[];

export const TENANT_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const satisfies readonly string[];

export const FINANCE_WRITE_ROLES = ["ADMIN", "SALES_MANAGER"] as const satisfies readonly string[];
export const CONTRACT_WRITE_ROLES = FINANCE_WRITE_ROLES;
export const ACCOUNTING_WRITE_ROLES = ["ADMIN"] as const satisfies readonly string[];
export const SALES_WRITE_ROLES = TENANT_WRITE_ROLES;

export async function runWithDatabaseSession(
  request: NextRequest,
  allowedRoles: readonly string[],
  operation: (session: SessionPayload) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const auth = await requireDatabaseSession(request, allowedRoles);
  if (auth.error) return auth.error;

  const session = auth.session;
  return await runWithTenantContext(
    { tenantId: session.tenantId, userId: session.userId },
    () => operation(session),
  );
}

export type DatabaseSessionResult =
  | { session: SessionPayload; error: null }
  | { session: null; error: NextResponse };

/**
 * JWT verification + database-backed revalidation in one call.
 * Returns the session on success, or an HTTP error response when:
 * - the JWT is missing/invalid (401)
 * - the user no longer exists, the tenant is inactive, or the
 *   current database role is not in `allowedRoles` (403)
 *
 * Also initializes the AsyncLocalStorage tenant context so the
 * Prisma middleware can inject tenantId automatically.
 */
export async function requireDatabaseSession(
  request: NextRequest,
  allowedRoles: readonly string[],
): Promise<DatabaseSessionResult> {
  const session = await requireAuth(request);
  if (!session) return { session: null, error: unauthorizedResponse(request) };

  const roleOk = await hasDatabaseRole(session, allowedRoles);
  if (!roleOk) return { session: null, error: forbiddenResponse(request) };

  // @deprecated Transitional compatibility bridge — requireDatabaseSession cannot
  // wrap its downstream operation, so setTenantContext is used here as a bridge.
  // Callers should migrate to runWithTenantContext where possible.
  setTenantContext({
    tenantId: session.tenantId,
    userId: session.userId,
  });

  return { session, error: null };
}

/**
 * Database-backed authorization for sensitive Server Actions.
 * Accepts configured super admin or a verified active tenant role.
 */
export async function assertServerActionRole(
  value: unknown,
  allowedRoles: readonly string[]
): Promise<SessionPayload> {
  const session = normalizeSessionPayload(value);

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  // Establish the authenticated tenant scope before any database-backed
  // role or super-admin lookup. Downstream authorization still verifies
  // the active tenant and rejects cross-tenant access.
  setTenantContext({
    tenantId: session.tenantId,
    userId: session.userId,
  });

  if (await isSuperAdmin(session.userId)) {
    setTenantContext({
      tenantId: session.tenantId,
      userId: session.userId,
    });
    return session;
  }

  if (!(await hasDatabaseRole(session, allowedRoles))) {
    throw new Error('FORBIDDEN');
  }

  setTenantContext({
    tenantId: session.tenantId,
    userId: session.userId,
  });
  return session;
}
/**
 * Lightweight claim check for non-sensitive UI decisions.
 * Sensitive API routes should use hasDatabaseRole().
 */
export function requireRole(
  session: SessionPayload,
  allowedRoles: readonly string[]
): PublicErrorResponse | null {
  if (!allowedRoles.includes(session.role)) {
    return publicError(
      ErrorCode.FORBIDDEN,
      `role claim rejected: role=${session.role}`
    );
  }

  return null;
}

export function unauthorizedResponse(request?: NextRequest): NextResponse {
  return httpErrorResponse(
    request,
    ErrorCode.UNAUTHORIZED,
    "authentication required",
  );
}

export function forbiddenResponse(request?: NextRequest): NextResponse {
  return httpErrorResponse(
    request,
    ErrorCode.FORBIDDEN,
    "authorization failed",
  );
}

export function notFoundResponse(request?: NextRequest): NextResponse {
  return httpErrorResponse(
    request,
    ErrorCode.NOT_FOUND,
    "resource unavailable",
  );
}

/**
 * Debug/test routes: hidden in production and super-admin-only elsewhere.
 */
export async function requireSuperAdminInDev(
  request: NextRequest
): Promise<NextResponse | null> {
  if (isProductionRuntime()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse(request);

  if (!(await isSuperAdmin(session.userId))) {
    return forbiddenResponse(request);
  }

  return null;
}
