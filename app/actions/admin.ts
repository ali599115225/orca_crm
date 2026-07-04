'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isSuperAdmin } from '@/lib/api-auth-guard';
import { ErrorCode, publicError } from '@/lib/errors';
import { isDedicatedCopyDeployment } from '@/lib/deployment-license';

class SuperAdminAuthorizationError extends Error {
  constructor() {
    super('SUPER_ADMIN_REQUIRED');
    this.name = 'SuperAdminAuthorizationError';
  }
}

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 100;
}

function validPlan(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]{1,50}$/.test(value)
  );
}

async function verifySuperAdmin(): Promise<{ userId: string }> {
  const session = await getSession();
  const userId =
    session && typeof session.userId === 'string' ? session.userId : '';

  if (!userId || !(await isSuperAdmin(userId))) {
    throw new SuperAdminAuthorizationError();
  }

  return { userId };
}

function actionFailure(context: string, error: unknown) {
  if (error instanceof SuperAdminAuthorizationError) {
    return publicError(ErrorCode.FORBIDDEN, context);
  }

  return publicError(ErrorCode.INTERNAL_ERROR, context, error);
}

export async function adminUpdateTicketAction(
  ticketId: string,
  status: 'OPEN' | 'CLOSED',
  responseText: string
) {
  try {
    await verifySuperAdmin();

    if (
      !validIdentifier(ticketId) ||
      !['OPEN', 'CLOSED'].includes(status) ||
      typeof responseText !== 'string' ||
      responseText.trim().length === 0 ||
      responseText.trim().length > 10_000
    ) {
      return publicError(
        ErrorCode.VALIDATION_ERROR,
        'adminUpdateTicketAction validation failed'
      );
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        aiResponse: responseText.trim(),
        updatedAt: new Date(),
      },
    });

    revalidatePath('/operations');
    return { success: true };
  } catch (error: unknown) {
    return actionFailure('adminUpdateTicketAction failed', error);
  }
}

export async function adminUpdateTenantPlanAction(
  tenantId: string,
  plan: string,
  isActive: boolean
) {
  try {
    await verifySuperAdmin();

    if (
      !validIdentifier(tenantId) ||
      !validPlan(plan) ||
      typeof isActive !== 'boolean'
    ) {
      return publicError(
        ErrorCode.VALIDATION_ERROR,
        'adminUpdateTenantPlanAction validation failed'
      );
    }

    if (isDedicatedCopyDeployment()) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive },
      });
      revalidatePath('/operations');
      return { success: true, planChangeSkipped: true, mode: "DEDICATED_COPY" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
        isActive,
      },
    });

    revalidatePath('/operations');
    return { success: true };
  } catch (error: unknown) {
    return actionFailure('adminUpdateTenantPlanAction failed', error);
  }
}

export async function getTenantsListAction() {
  try {
    await verifySuperAdmin();

    return await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            leads: true,
          },
        },
      },
    });
  } catch (error: unknown) {
    publicError(ErrorCode.INTERNAL_ERROR, 'getTenantsListAction failed', error);
    return [];
  }
}

export async function getTicketsListAction() {
  try {
    await verifySuperAdmin();

    return await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: {
            companyName: true,
            subdomain: true,
          },
        },
      },
    });
  } catch (error: unknown) {
    publicError(ErrorCode.INTERNAL_ERROR, 'getTicketsListAction failed', error);
    return [];
  }
}

export async function toggleTenantStatusAction(
  tenantId: string,
  currentStatus: boolean
) {
  try {
    await verifySuperAdmin();

    if (
      !validIdentifier(tenantId) ||
      typeof currentStatus !== 'boolean'
    ) {
      return publicError(
        ErrorCode.VALIDATION_ERROR,
        'toggleTenantStatusAction validation failed'
      );
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: !currentStatus },
    });

    revalidatePath('/operations');
    return { success: true };
  } catch (error: unknown) {
    return actionFailure('toggleTenantStatusAction failed', error);
  }
}

export async function updateTenantPlanAction(
  tenantId: string,
  plan: string
) {
  try {
    await verifySuperAdmin();

    if (!validIdentifier(tenantId) || !validPlan(plan)) {
      return publicError(
        ErrorCode.VALIDATION_ERROR,
        'updateTenantPlanAction validation failed'
      );
    }

    if (isDedicatedCopyDeployment()) {
      return {
        success: false,
        dedicatedCopyBlocked: true,
        error: 'خطة SaaS غير قابلة للتعديل في النسخة المستقلة. جميع الميزات مشمولة في الترخيص.',
      };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionPlan: plan },
    });

    revalidatePath('/operations');
    return { success: true };
  } catch (error: unknown) {
    return actionFailure('updateTenantPlanAction failed', error);
  }
}
