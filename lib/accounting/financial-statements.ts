import { prisma } from '@/lib/prisma';
import { getPeriod } from './utils';

export interface IncomeStatementRow {
  code: string;
  nameAr: string;
  amount: number;
}

export interface IncomeStatement {
  period: string;
  revenue: IncomeStatementRow[];
  totalRevenue: number;
  expenses: IncomeStatementRow[];
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  generatedAt: string;
}

export async function getIncomeStatement(tenantId: string, period?: string): Promise<IncomeStatement> {
  const wherePeriod = period || getPeriod();

  const balances = await prisma.accountBalance.findMany({
    where: { tenantId, period: wherePeriod },
    include: { account: true },
    orderBy: { account: { code: 'asc' } },
  });

  const revenue: IncomeStatementRow[] = [];
  const expenses: IncomeStatementRow[] = [];

  for (const b of balances) {
    const amount = Number(b.credit) - Number(b.debit);
    if (b.account.type === 'REVENUE') {
      revenue.push({ code: b.account.code, nameAr: b.account.nameAr, amount });
    } else if (b.account.type === 'EXPENSE') {
      expenses.push({ code: b.account.code, nameAr: b.account.nameAr, amount: Number(b.debit) - Number(b.credit) });
    }
  }

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  return {
    period: wherePeriod,
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    grossProfit: totalRevenue,
    netProfit: totalRevenue - totalExpenses,
    generatedAt: new Date().toISOString(),
  };
}

export interface BalanceSheetRow {
  code: string;
  nameAr: string;
  amount: number;
}

export interface BalanceSheet {
  period: string;
  assets: BalanceSheetRow[];
  totalAssets: number;
  liabilities: BalanceSheetRow[];
  totalLiabilities: number;
  equity: BalanceSheetRow[];
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  generatedAt: string;
}

export async function getBalanceSheet(tenantId: string, period?: string): Promise<BalanceSheet> {
  const wherePeriod = period || getPeriod();

  const balances = await prisma.accountBalance.findMany({
    where: { tenantId, period: wherePeriod },
    include: { account: true },
    orderBy: { account: { code: 'asc' } },
  });

  const assets: BalanceSheetRow[] = [];
  const liabilities: BalanceSheetRow[] = [];
  const equityAccounts: BalanceSheetRow[] = [];

  for (const b of balances) {
    const amount = Number(b.debit) - Number(b.credit);
    if (b.account.type === 'ASSET') {
      assets.push({ code: b.account.code, nameAr: b.account.nameAr, amount });
    } else if (b.account.type === 'LIABILITY') {
      liabilities.push({ code: b.account.code, nameAr: b.account.nameAr, amount: Number(b.credit) - Number(b.debit) });
    } else if (b.account.type === 'EQUITY') {
      equityAccounts.push({ code: b.account.code, nameAr: b.account.nameAr, amount: Number(b.credit) - Number(b.debit) });
    }
  }

  const incomeStmt = await getIncomeStatement(tenantId, wherePeriod);
  if (incomeStmt.netProfit !== 0) {
    equityAccounts.push({
      code: '3.2',
      nameAr: 'صافي الدخل للفترة',
      amount: incomeStmt.netProfit,
    });
  }

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equityAccounts.reduce((s, r) => s + r.amount, 0);

  return {
    period: wherePeriod,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity: equityAccounts,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    generatedAt: new Date().toISOString(),
  };
}

export interface CashFlowStatement {
  period: string;
  operatingActivities: IncomeStatementRow[];
  netOperatingCash: number;
  investingActivities: IncomeStatementRow[];
  netInvestingCash: number;
  financingActivities: IncomeStatementRow[];
  netFinancingCash: number;
  netChangeInCash: number;
  openingCash: number;
  closingCash: number;
  generatedAt: string;
}

export async function getCashFlowStatement(tenantId: string, period?: string): Promise<CashFlowStatement> {
  const wherePeriod = period || getPeriod();

  const balances = await prisma.accountBalance.findMany({
    where: { tenantId, period: wherePeriod },
    include: { account: true },
  });

  let openingCash = 0;
  let inflows = 0;
  let outflows = 0;

  for (const b of balances) {
    const amount = Number(b.debit) - Number(b.credit);
    if (b.account.code.startsWith('1.1.1') || b.account.code.startsWith('1.1.2')) {
      openingCash += amount;
    }
  }

  const receipts = await prisma.receipt.findMany({
    where: {
      tenantId,
      receivedDate: {
        gte: new Date(`${wherePeriod}-01`),
        lte: new Date(`${wherePeriod}-31`),
      },
    },
  });
  inflows = receipts.reduce((s, r) => s + Number(r.amount), 0);

  return {
    period: wherePeriod,
    operatingActivities: [
      { code: 'CF-OP-1', nameAr: 'متحصلات من العملاء', amount: inflows },
    ],
    netOperatingCash: inflows - outflows,
    investingActivities: [],
    netInvestingCash: 0,
    financingActivities: [],
    netFinancingCash: 0,
    netChangeInCash: inflows - outflows,
    openingCash,
    closingCash: openingCash + inflows - outflows,
    generatedAt: new Date().toISOString(),
  };
}
