'use server';
// app/actions/finance.ts
// Hardened: session + DB role check + audit on all financial mutations.
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getActiveTenant } from '@/lib/tenant';
import { assertServerActionRole } from '@/lib/api-auth-guard';
import { writeAuditLog } from '@/lib/audit';
import { recordPayment } from '@/lib/domain/transaction-spine';
import {
  postInvoiceEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from '@/lib/accounting';

const FINANCE_ROLES = ['ADMIN', 'SALES_MANAGER'] as const;
const COMMISSION_ROLES = ['ADMIN'] as const;

export async function processPayment(
  invoiceId: string,
  amount: number,
  method: string,
  idempotencyKey?: string,
) {
  try {
    const [tenant, session] = await Promise.all([getActiveTenant(), getSession()]);
    if (!session) throw new Error('Authentication required.');
    const verified = await assertServerActionRole(session, FINANCE_ROLES);

    const result = await recordPayment({
      tenantId: tenant.id,
      userId: verified.userId,
      actorId: verified.userId,
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

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: 'INVOICE_PAYMENT_RECORDED',
      tableName: 'receipts',
      recordId: receipt.id,
      details: JSON.stringify({ invoiceId, amount, method }),
    });

    return receipt;
  } catch (error) {
    console.error('[processPayment]', error);
    throw new Error('فشل معالجة الدفعة');
  }
}

export async function processCommissionPayment(commissionId: string) {
  try {
    // ── Auth: DB-backed — only ADMIN may pay commissions ─────────────────────
    const [tenant, session] = await Promise.all([getActiveTenant(), getSession()]);
    if (!session) throw new Error('Authentication required.');
    const verified = await assertServerActionRole(session, COMMISSION_ROLES);

    await seedChartOfAccounts(tenant.id);

    // FK: commission must belong to this tenant
    const commission = await prisma.payrollCommission.findFirst({
      where: { id: commissionId, tenantId: tenant.id },
    });
    if (!commission) throw new Error('العمولة غير موجودة');
    if (commission.status !== 'PENDING') throw new Error('العمولة ليست معلقة');

    const result = await prisma.$transaction(async (tx) => {
      // tenantId-scoped updateMany to prevent cross-tenant mutation
      await tx.payrollCommission.updateMany({
        where: { id: commissionId, tenantId: tenant.id },
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

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: 'COMMISSION_PAYMENT_PROCESSED',
      tableName: 'payroll_commissions',
      recordId: commissionId,
      details: JSON.stringify({ amount: String(commission.amount) }),
    });

    return result;
  } catch (error) {
    console.error('[processCommissionPayment]', error);
    throw new Error('فشل صرف العمولة');
  }
}
