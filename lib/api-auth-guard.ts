/**
 * ORCA CRM centralized API authentication and authorization guards.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import {
  ErrorCode,
  publicError,
  type PublicErrorResponse,
} from '@/lib/errors';

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

const SUPER_ADMIN_EMAILS = new Set(
  (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export function isConfiguredSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!userId || SUPER_ADMIN_EMAILS.size === 0) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return SUPER_ADMIN_EMAILS.has((user?.email ?? '').trim().toLowerCase());
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
      prisma.user.findFirst({
        where: {
          id: session.userId,
          tenantId: session.tenantId,
        },
        select: { role: true },
      }),
      prisma.tenant.findFirst({
        where: {
          id: session.tenantId,
          isActive: true,
        },
        select: { id: true },
      }),
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

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    publicError(ErrorCode.UNAUTHORIZED, 'authentication required'),
    { status: 401 }
  );
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    publicError(ErrorCode.FORBIDDEN, 'authorization failed'),
    { status: 403 }
  );
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json(
    publicError(ErrorCode.NOT_FOUND, 'resource unavailable'),
    { status: 404 }
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
  if (!session) return unauthorizedResponse();

  if (!(await isSuperAdmin(session.userId))) {
    return forbiddenResponse();
  }

  return null;
}
