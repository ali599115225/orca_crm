"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import {
  getCustomerBalances,
  getAgingReport,
  getTrialBalance,
  getGeneralLedgerReport,
  getAccountsReceivableReport,
  getVatReport,
  getOutstandingAmount,
  getOverdueAmount,
  getCollectionStatus,
  runAuditChecks,
  getAuditSummary,
  seedChartOfAccounts,
  getChartOfAccounts,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getSupplierBalances,
  getPayablesReport,
  getPayablesSummary,
} from "@/lib/accounting";

export async function getLedgerEntriesAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();

    const paidInstallments = await prisma.installment.findMany({
      where: {
        paymentStatus: "Paid",
        contract: {
          unit: { project: { tenantId: tenant.id } },
        },
      },
      include: {
        contract: { include: { unit: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const commissions = await prisma.payrollCommission.findMany({
      where: { tenantId: tenant.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const journalEntries = await prisma.journalEntry.findMany({
      where: { tenantId: tenant.id, status: "POSTED" },
      include: {
        lines: {
          include: { account: { select: { code: true, nameAr: true } } },
        },
      },
      orderBy: { postedAt: "desc" },
      take: 50,
    });

    const mappedInstallments = paidInstallments.map((i) => ({
      id: i.id,
      date: i.dueDate.toISOString().split("T")[0],
      desc: `تحصيل قسط ${i.installmentNumber} — وحدة ${i.contract.unit.unitNumber} (${i.contract.buyerName})`,
      type: "إيراد",
      amount: Number(i.amountSar),
      cat: "إيجار",
    }));

    const mappedCommissions = commissions.map((c) => ({
      id: c.id,
      date: c.createdAt.toISOString().split("T")[0],
      desc: `صرف عمولة مبيعات — العقد ${c.contractId} للمستشار (${c.user.name})`,
      type: "مصروف",
      amount: Number(c.amount),
      cat: "رواتب",
    }));

    const mappedEntries = journalEntries.map((e) => ({
      id: e.id,
      date: e.postedAt.toISOString().split("T")[0],
      desc: e.description,
      type: e.source,
      entryNumber: e.entryNumber,
      lines: e.lines.map((l) => ({
        account: `${l.account.code} ${l.account.nameAr}`,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
    }));

    const merged = [...mappedInstallments, ...mappedCommissions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { success: true, entries: merged, journalEntries: mappedEntries };
  } catch (error: any) {
    console.error("Error fetching ledger:", error);
    return { success: false, error: error.message };
  }
}

export async function getErpStatsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();

    const activeContractsCount = await prisma.contract.count({
      where: { unit: { project: { tenantId: tenant.id } } },
    });

    const paidSumRaw = await prisma.installment.aggregate({
      where: {
        paymentStatus: "Paid",
        contract: { unit: { project: { tenantId: tenant.id } } },
      },
      _sum: { amountSar: true },
    });
    const totalCollected = Number(paidSumRaw._sum.amountSar || 0);

    const pendingSumRaw = await prisma.installment.aggregate({
      where: {
        paymentStatus: "Pending",
        contract: { unit: { project: { tenantId: tenant.id } } },
      },
      _sum: { amountSar: true },
    });
    const totalArrears = Number(pendingSumRaw._sum.amountSar || 0);

    const outstanding = await getOutstandingAmount(tenant.id);
    const overdue = await getOverdueAmount(tenant.id);
    const collection = await getCollectionStatus(tenant.id);

    const totalLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id, agentId: "Sanad" },
    });
    const successLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id, agentId: "Sanad", severity: "Info" },
    });
    const complianceRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 98;

    return {
      success: true,
      stats: {
        activeContractsCount,
        totalCollected,
        totalArrears,
        totalRevenue: totalCollected + totalArrears,
        complianceRate,
        outstanding,
        overdue,
        collectionRate: collection.collectionRate,
      },
    };
  } catch (error: any) {
    console.error("Error fetching ERP stats:", error);
    return { success: false, error: error.message };
  }
}

export async function getArCustomersAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();
    const customers = await getCustomerBalances(tenant.id);
    return { success: true, customers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAgingReportAction() {
  try {
    const tenant = await getActiveTenant();
    const report = await getAgingReport(tenant.id);
    return { success: true, report };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTrialBalanceAction(period?: string) {
  try {
    const tenant = await getActiveTenant();
    const result = await getTrialBalance(tenant.id, period);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getArReportAction() {
  try {
    const tenant = await getActiveTenant();
    const rows = await getAccountsReceivableReport(tenant.id);
    return { success: true, rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getVatReportAction(fromDate?: string, toDate?: string) {
  try {
    const tenant = await getActiveTenant();
    const report = await getVatReport(tenant.id, fromDate, toDate);
    return { success: true, ...report };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runAccountingAuditAction() {
  try {
    const tenant = await getActiveTenant();
    const checks = await runAuditChecks(tenant.id);
    const summary = await getAuditSummary(tenant.id);
    const allPassed = checks.every((c) => c.status === "PASS");
    return { success: true, checks, summary, allPassed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedChartOfAccountsAction() {
  try {
    const tenant = await getActiveTenant();
    await seedChartOfAccounts(tenant.id);
    const accounts = await getChartOfAccounts(tenant.id);
    return { success: true, accounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGeneralLedgerAction(accountId?: string, fromDate?: string, toDate?: string) {
  try {
    const tenant = await getActiveTenant();
    const accounts = await prisma.account.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { code: "asc" },
    });
    const rows = await getGeneralLedgerReport(tenant.id, accountId, fromDate, toDate);
    return { success: true, accounts, rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getIncomeStatementAction(period?: string) {
  try {
    const tenant = await getActiveTenant();
    const result = await getIncomeStatement(tenant.id, period);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBalanceSheetAction(period?: string) {
  try {
    const tenant = await getActiveTenant();
    const result = await getBalanceSheet(tenant.id, period);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCashFlowAction(period?: string) {
  try {
    const tenant = await getActiveTenant();
    const result = await getCashFlowStatement(tenant.id, period);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPayablesAction(view?: string) {
  try {
    const tenant = await getActiveTenant();
    if (view === 'report') {
      const items = await getPayablesReport(tenant.id);
      return { success: true, items };
    }
    if (view === 'summary') {
      const summary = await getPayablesSummary(tenant.id);
      return { success: true, ...summary };
    }
    const suppliers = await getSupplierBalances(tenant.id);
    return { success: true, suppliers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
