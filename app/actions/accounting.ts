"use server";
 
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
 
export async function getLedgerEntriesAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();
 
    // Fetch paid installments
    const paidInstallments = await prisma.installment.findMany({
      where: {
        paymentStatus: "Paid",
        contract: {
          unit: {
            project: {
              tenantId: tenant.id
            }
          }
        }
      },
      include: {
        contract: {
          include: {
            unit: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
 
    // Fetch payroll commissions
    const commissions = await prisma.payrollCommission.findMany({
      where: {
        tenantId: tenant.id
      },
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
 
    // Map and merge
    const mappedInstallments = paidInstallments.map(i => ({
      id: i.id,
      date: i.dueDate.toISOString().split("T")[0],
      desc: `تحصيل قسط ${i.installmentNumber} — وحدة ${i.contract.unit.unitNumber} (${i.contract.buyerName})`,
      type: "إيراد",
      amount: Number(i.amountSar),
      cat: "إيجار"
    }));
 
    const mappedCommissions = commissions.map(c => ({
      id: c.id,
      date: c.createdAt.toISOString().split("T")[0],
      desc: `صرف عمولة مبيعات — العقد ${c.contractId} للمستشار (${c.user.name})`,
      type: "مصروف",
      amount: Number(c.amount),
      cat: "رواتب"
    }));
 
    const merged = [...mappedInstallments, ...mappedCommissions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
 
    return { success: true, entries: merged };
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

    // 1. count of contracts:
    const activeContractsCount = await prisma.contract.count({
      where: { unit: { project: { tenantId: tenant.id } } }
    });

    // 2. sum of paid installments (collected):
    const paidSumRaw = await prisma.installment.aggregate({
      where: {
        paymentStatus: "Paid",
        contract: { unit: { project: { tenantId: tenant.id } } }
      },
      _sum: { amountSar: true }
    });
    const totalCollected = Number(paidSumRaw._sum.amountSar || 0);

    // 3. sum of pending installments (arrears):
    const pendingSumRaw = await prisma.installment.aggregate({
      where: {
        paymentStatus: "Pending",
        contract: { unit: { project: { tenantId: tenant.id } } }
      },
      _sum: { amountSar: true }
    });
    const totalArrears = Number(pendingSumRaw._sum.amountSar || 0);

    // 4. compliance rate: percentage of Info/success logs vs total logs for agent "Sanad"
    const totalLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id, agentId: "Sanad" }
    });

    const successLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id, agentId: "Sanad", severity: "Info" }
    });

    const complianceRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 98; // default to 98%

    return {
      success: true,
      stats: {
        activeContractsCount,
        totalCollected,
        totalArrears,
        totalRevenue: totalCollected + totalArrears,
        complianceRate,
      }
    };
  } catch (error: any) {
    console.error("Error fetching ERP stats:", error);
    return { success: false, error: error.message };
  }
}

