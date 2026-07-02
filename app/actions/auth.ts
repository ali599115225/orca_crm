'use server';

import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { encrypt } from '@/lib/session';
import { checkRateLimit, clearRateLimit, rateLimit } from '@/lib/rate-limit';
import { ErrorCode, publicError } from '@/lib/errors';
import {
  authLoginFindUserByEmail,
  tenantResolutionFindFirstActive,
} from '@/lib/system-prisma-boundary';
import { getConfiguredPrivilegedRole } from '@/lib/platform-identity';

class SafeAuthError extends Error {
  constructor(readonly publicMessage: string) {
    super(publicMessage);
    this.name = 'SafeAuthError';
  }
}

function hashRateLimitIdentity(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

type LoginDiagnosticCode =
  | 'LOGIN_USER_NOT_FOUND'
  | 'LOGIN_USER_INACTIVE'
  | 'LOGIN_TENANT_MISSING'
  | 'LOGIN_TENANT_INACTIVE'
  | 'LOGIN_PASSWORD_HASH_MISSING'
  | 'LOGIN_PASSWORD_INVALID'
  | 'LOGIN_COOKIE_CREATED'
  | 'LOGIN_SUCCESS';

function logLoginDiagnostic(
  code: LoginDiagnosticCode,
  metadata?: {
    secure: boolean;
    sameSite: 'lax';
    path: '/';
    domainConfigured: boolean;
  },
) {
  console.info('[LoginDiagnostics]', { code, ...metadata });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');


  try {
    if (!email || !password) {
      throw new SafeAuthError('البريد الإلكتروني وكلمة المرور مطلوبان.');
    }

    const rateLimitKey = `login:${hashRateLimitIdentity(email)}`;
    const existingLock = await checkRateLimit(
      rateLimitKey,
      5,
      60_000
    );

    if (!existingLock.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(existingLock.resetIn / 1000)
      );

      return {
        success: false,
        error: `محاولات دخول كثيرة جداً. الرجاء الانتظار ${retryAfterSeconds} ثانية.`,
        errorEn: `Too many login attempts. Please wait ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      };
    }

    const user = await authLoginFindUserByEmail(email);
    const privilegedRole = getConfiguredPrivilegedRole(user?.email);

    let passwordMatches = false;
    if (!user) {
      logLoginDiagnostic('LOGIN_USER_NOT_FOUND');
    } else if (!user.isActive) {
      logLoginDiagnostic('LOGIN_USER_INACTIVE');
    } else if (!user.passwordHash) {
      logLoginDiagnostic('LOGIN_PASSWORD_HASH_MISSING');
    } else {
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        logLoginDiagnostic('LOGIN_PASSWORD_INVALID');
      }
    }

    let sessionTenant = user?.tenant?.isActive ? user.tenant : null;
    if (
      user &&
      user.isActive &&
      passwordMatches &&
      !sessionTenant &&
      privilegedRole
    ) {
      sessionTenant = await tenantResolutionFindFirstActive();
    }

    if (user && user.isActive && passwordMatches && !sessionTenant) {
      logLoginDiagnostic(user.tenant ? 'LOGIN_TENANT_INACTIVE' : 'LOGIN_TENANT_MISSING');
    }

    const validCredentials = Boolean(
      user &&
      user.isActive &&
      sessionTenant &&
      user.passwordHash &&
      passwordMatches
    );

    if (!validCredentials) {
      const failedAttempt = await rateLimit(
        rateLimitKey,
        5,
        60_000
      );

      if (!failedAttempt.allowed || failedAttempt.remaining === 0) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(failedAttempt.resetIn / 1000)
        );

        return {
          success: false,
          error: `محاولات دخول كثيرة جداً. الرجاء الانتظار ${retryAfterSeconds} ثانية.`,
          errorEn: `Too many login attempts. Please wait ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
        };
      }

      throw new SafeAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }

    await clearRateLimit(rateLimitKey);

    if (!user || !sessionTenant) {
      throw new SafeAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }

    if (!user || !sessionTenant) {
      throw new SafeAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }

    const requestHeaders = await headers();
    const forwardedHost = requestHeaders.get('x-forwarded-host');
    const host = (forwardedHost || requestHeaders.get('host') || 'orca.az-ez.pro')
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, '');
    const forwardedProto = requestHeaders
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();
    const secure =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      forwardedProto === 'https';

    const parts = host.split('.');
    const isVercelDomain = host.endsWith('.vercel.app');
    const currentSubdomain =
      parts.length > 2 && !isVercelDomain ? parts[0] : 'orca';
    const mainSubdomains = new Set([
      'orca',
      'www',
      'dar-al-amar',
      'orca-crm',
    ]);
    const tenantHost = !mainSubdomains.has(currentSubdomain);
    const privileged = Boolean(privilegedRole);

    if (
      !privileged &&
      tenantHost &&
      sessionTenant.subdomain !== currentSubdomain
    ) {
      throw new SafeAuthError('غير مصرح لك بدخول هذه الشركة من هذا الرابط.');
    }

    const platformArchitect = privilegedRole === 'PLATFORM_ARCHITECT';
    const token = await encrypt({
      userId: user.id,
      tenantId: sessionTenant.id,
      tenantSubdomain: sessionTenant.subdomain,
      role: privilegedRole ?? user.role,
      name: user.name,
      email: user.email,
    });

    const cookieStore = await cookies();
    const customDomain =
      host === 'orca.az-ez.pro' || host.endsWith('.orca.az-ez.pro');
    const sharedDomain = customDomain ? 'orca.az-ez.pro' : undefined;

    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
      domain: sharedDomain,
    });
    logLoginDiagnostic('LOGIN_COOKIE_CREATED', {
      secure,
      sameSite: 'lax',
      path: '/',
      domainConfigured: Boolean(sharedDomain),
    });

    if (!platformArchitect) {
      cookieStore.set('device_tenant_subdomain', sessionTenant.subdomain, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        domain: sharedDomain,
      });
    }

    let redirectUrl = '/operations';
    if (platformArchitect) {
      redirectUrl = '/operations?tab=monitor';
    } else if (customDomain && tenantHost) {
      redirectUrl = `https://${sessionTenant.subdomain}.orca.az-ez.pro/operations`;
    }

    logLoginDiagnostic('LOGIN_SUCCESS');
    return { success: true, redirectUrl };
  } catch (error: unknown) {
    if (error instanceof SafeAuthError) {
      return { success: false, error: error.publicMessage };
    }

    publicError(ErrorCode.INTERNAL_ERROR, 'login action failed', error);
    return {
      success: false,
      error: 'تعذر تسجيل الدخول حالياً. حاول مرة أخرى لاحقاً.',
    };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete('session_token');
  cookieStore.delete({ name: 'session_token', path: '/' });
  cookieStore.delete({
    name: 'session_token',
    domain: 'orca.az-ez.pro',
    path: '/',
  });
  cookieStore.delete({
    name: 'session_token',
    domain: '.orca.az-ez.pro',
    path: '/',
  });
  cookieStore.delete('device_tenant_subdomain');

  return { success: true };
}






