'use server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getActiveTenant } from '@/lib/tenant';
import { recordPayment } from '@/lib/domain/transaction-spine';
import {
  postInvoiceEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from '@/lib/accounting';

export async function processPayment(
  invoiceId: string,
  amount: number,
  method: string,
  idempotencyKey?: string,
) {
  try {
    const [tenant, session] = await Promise.all([getActiveTenant(), getSession()]);
    const userId = session?.userId as string | undefined;
    if (!userId) throw new Error('Authentication required.');
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
      select: { role: true },
    });
    if (!user || !['ADMIN', 'SALES_MANAGER'].includes(String(user.role))) {
      throw new Error('Insufficient permissions.');
    }

    const result = await recordPayment({
      tenantId: tenant.id,
      userId,
      actorId: userId,
      invoiceId,
      amount,
      method,
      idempotencyKey: idempotencyKey?.trim() || `manual-action:${randomUUID()}`,
      correlationId: `manual-payment:${randomUUID()}`,
    });

    const receipt = await prisma.receipt.findFirst({
      where: {
        tenantId: tenant.id,
        paymentTransactionId: result.payment.id,
      },
    });
    if (!receipt) throw new Error('Payment receipt was not created.');
    return receipt;
  } catch (error) {
    console.error('[processPayment]', error);
    throw new Error('فشل معالجة الدفعة');
  }
}

export async function processCommissionPayment(commissionId: string) {
  try {
    const tenant = await getActiveTenant();
    await seedChartOfAccounts(tenant.id);

    const commission = await prisma.payrollCommission.findFirst({
      where: { id: commissionId, tenantId: tenant.id },
    });
    if (!commission) throw new Error('العمولة غير موجودة');
    if (commission.status !== 'PENDING') throw new Error('العمولة ليست معلقة');

    return await prisma.$transaction(async (tx) => {
      await tx.payrollCommission.update({
        where: { id: commissionId },
        data: { status: 'PAID' },
      });

      await tx.commissionPayment.create({
        data: {
          commissionId,
          tenantId: tenant.id,
          amount: commission.amount,
          method: 'BANK_TRANSFER',
          status: 'PAID',
        },
      });

      const expenseAccount = await findAccountByCode(tenant.id, '5.1');
      const cashAccount = await findAccountByCode(tenant.id, '1.1.1');
      if (expenseAccount && cashAccount) {
        const { postCommissionEntry } = await import('@/lib/accounting');
        await postCommissionEntry(
          tenant.id,
          commissionId,
          Number(commission.amount),
          expenseAccount.id,
          cashAccount.id
        );
      }

      return { success: true };
    });
  } catch (error) {
    console.error('[processCommissionPayment]', error);
    throw new Error('فشل صرف العمولة');
  }
}
