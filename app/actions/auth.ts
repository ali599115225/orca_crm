'use server';

import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { rawPrisma } from '@/lib/prisma';
import { encrypt } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { isConfiguredSuperAdminEmail } from '@/lib/api-auth-guard';
import { ErrorCode, publicError } from '@/lib/errors';

class SafeAuthError extends Error {
  constructor(readonly publicMessage: string) {
    super(publicMessage);
    this.name = 'SafeAuthError';
  }
}

function hashRateLimitIdentity(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

function configuredEmails(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const limit = await rateLimit(
    `login:${hashRateLimitIdentity(email || 'missing')}`,
    5,
    60_000,
    true
  );

  if (!limit.allowed) {
    const retryAfterSeconds = Math.ceil(limit.resetIn / 1000);
    return {
      success: false,
      error: `محاولات دخول كثيرة جداً. الرجاء الانتظار ${retryAfterSeconds} ثانية.`,
      errorEn: `Too many login attempts. Please wait ${retryAfterSeconds} seconds.`,
      retryAfterSeconds,
    };
  }

  try {
    if (!email || !password) {
      throw new SafeAuthError('البريد الإلكتروني وكلمة المرور مطلوبان.');
    }

    const user = await rawPrisma.user.findFirst({
      where: { email, isActive: true },
      include: { tenant: true },
    });

    if (
      !user ||
      !user.tenant ||
      !user.tenant.isActive ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
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
    const superAdmin = isConfiguredSuperAdminEmail(user.email);

    if (
      !superAdmin &&
      tenantHost &&
      user.tenant.subdomain !== currentSubdomain
    ) {
      throw new SafeAuthError('غير مصرح لك بدخول هذه الشركة من هذا الرابط.');
    }

    const architectEmails = configuredEmails('PLATFORM_ARCHITECT_EMAILS');
    const platformArchitect = architectEmails.has(user.email.toLowerCase());
    const token = await encrypt({
      userId: user.id,
      tenantId: user.tenant.id,
      tenantSubdomain: user.tenant.subdomain,
      role: platformArchitect ? 'PLATFORM_ARCHITECT' : user.role,
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

    if (!platformArchitect) {
      cookieStore.set('device_tenant_subdomain', user.tenant.subdomain, {
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
      redirectUrl = `https://${user.tenant.subdomain}.orca.az-ez.pro/operations`;
    }

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
