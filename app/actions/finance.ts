'use server';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import {
  postPaymentEntry,
  postInvoiceEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from '@/lib/accounting';

export async function processPayment(invoiceId: string, amount: number, method: string) {
  try {
    const tenant = await getActiveTenant();
    await seedChartOfAccounts(tenant.id);

    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          tenantId: tenant.id,
          invoiceId,
          amount,
          paymentMethod: method,
          status: 'COMPLETED',
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId, tenantId: tenant.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: method,
          paymentRef: receipt.id,
        },
      });

      const cashAccount = await findAccountByCode(tenant.id, '1.1.1');
      const receivableAccount = await findAccountByCode(tenant.id, '1.1.3');
      if (cashAccount && receivableAccount) {
        await postPaymentEntry(tenant.id, receipt.id, amount, cashAccount.id, receivableAccount.id);
      }

      return receipt;
    });
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
