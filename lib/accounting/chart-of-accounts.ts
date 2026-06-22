import { prisma } from '@/lib/prisma';
import { AccountType } from '@prisma/client';

export interface AccountSeed {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  children?: AccountSeed[];
}

export const DEFAULT_CHART_OF_ACCOUNTS: AccountSeed[] = [
  {
    code: '1',
    nameAr: 'الأصول',
    nameEn: 'Assets',
    type: 'ASSET',
    children: [
      {
        code: '1.1',
        nameAr: 'الأصول المتداولة',
        nameEn: 'Current Assets',
        type: 'ASSET',
        children: [
          {
            code: '1.1.1',
            nameAr: 'النقدية',
            nameEn: 'Cash',
            type: 'ASSET',
          },
          {
            code: '1.1.2',
            nameAr: 'النقدية في البنك',
            nameEn: 'Cash at Bank',
            type: 'ASSET',
          },
          {
            code: '1.1.3',
            nameAr: 'حسابات القبض',
            nameEn: 'Accounts Receivable',
            type: 'ASSET',
          },
          {
            code: '1.1.4',
            nameAr: 'مصروفات مدفوعة مقدماً',
            nameEn: 'Prepaid Expenses',
            type: 'ASSET',
          },
        ],
      },
    ],
  },
  {
    code: '2',
    nameAr: 'الخصوم',
    nameEn: 'Liabilities',
    type: 'LIABILITY',
    children: [
      {
        code: '2.1',
        nameAr: 'الخصوم المتداولة',
        nameEn: 'Current Liabilities',
        type: 'LIABILITY',
        children: [
          {
            code: '2.1.1',
            nameAr: 'ضريبة القيمة المضافة المستحقة',
            nameEn: 'VAT Payable',
            type: 'LIABILITY',
          },
          {
            code: '2.1.2',
            nameAr: 'دائنون',
            nameEn: 'Accounts Payable',
            type: 'LIABILITY',
          },
          {
            code: '2.1.3',
            nameAr: 'إيرادات مؤجلة',
            nameEn: 'Deferred Revenue',
            type: 'LIABILITY',
          },
        ],
      },
    ],
  },
  {
    code: '3',
    nameAr: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'EQUITY',
    children: [
      {
        code: '3.1',
        nameAr: 'رأس المال',
        nameEn: 'Capital',
        type: 'EQUITY',
      },
      {
        code: '3.2',
        nameAr: 'الأرباح المحتجزة',
        nameEn: 'Retained Earnings',
        type: 'EQUITY',
      },
    ],
  },
  {
    code: '4',
    nameAr: 'الإيرادات',
    nameEn: 'Revenue',
    type: 'REVENUE',
    children: [
      {
        code: '4.1',
        nameAr: 'إيرادات الإيجار',
        nameEn: 'Rental Revenue',
        type: 'REVENUE',
        children: [
          {
            code: '4.1.1',
            nameAr: 'إيرادات الاشتراكات',
            nameEn: 'Subscription Revenue',
            type: 'REVENUE',
          },
        ],
      },
      {
        code: '4.2',
        nameAr: 'إيرادات المبيعات',
        nameEn: 'Sales Revenue',
        type: 'REVENUE',
      },
      {
        code: '4.3',
        nameAr: 'إيرادات أخرى',
        nameEn: 'Other Revenue',
        type: 'REVENUE',
      },
    ],
  },
  {
    code: '5',
    nameAr: 'المصروفات',
    nameEn: 'Expenses',
    type: 'EXPENSE',
    children: [
      {
        code: '5.1',
        nameAr: 'مصروفات عمولات المبيعات',
        nameEn: 'Commission Expense',
        type: 'EXPENSE',
      },
      {
        code: '5.2',
        nameAr: 'مصروفات الرواتب',
        nameEn: 'Salary Expense',
        type: 'EXPENSE',
      },
      {
        code: '5.3',
        nameAr: 'مصروفات تشغيلية',
        nameEn: 'Operating Expenses',
        type: 'EXPENSE',
      },
    ],
  },
];

/**
 * Ensures the complete default chart exists for a tenant.
 *
 * Older behavior returned as soon as any account existed, leaving partially
 * seeded tenants without mandatory receivable, sales-revenue, or VAT accounts.
 * Upserting every code keeps the operation idempotent and repairs partial charts.
 */
export async function seedChartOfAccounts(tenantId: string): Promise<void> {
  async function upsertSeed(seed: AccountSeed, parentId?: string) {
    const account = await prisma.account.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: seed.code,
        },
      },
      create: {
        tenantId,
        code: seed.code,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        type: seed.type,
        parentId: parentId || null,
        isActive: true,
      },
      update: {
        type: seed.type,
        parentId: parentId || null,
        isActive: true,
      },
    });

    for (const child of seed.children || []) {
      await upsertSeed(child, account.id);
    }

    return account;
  }

  for (const root of DEFAULT_CHART_OF_ACCOUNTS) {
    await upsertSeed(root);
  }
}

export async function findAccountByCode(tenantId: string, code: string) {
  return prisma.account.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
}

export async function getChartOfAccounts(tenantId: string) {
  return prisma.account.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: 'asc' },
  });
}
