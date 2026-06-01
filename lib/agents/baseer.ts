// lib/agents/baseer.ts
import { prisma, rawPrisma } from "../prisma";
import { tenantContext } from "../tenant-context";

export interface StrategyReport {
  timestamp: string;
  metrics: {
    totalActiveContractsSar: number;
    totalActiveContractsCount: number;
    totalCollectedSar: number;
    totalPendingSar: number;
    collectionRate: number;
  };
  projections: {
    days30Sar: number;
    days60Sar: number;
    days90Sar: number;
  };
  scenarios: {
    optimistic: { description: string; expectedCashflowSar: number };
    conservative: { description: string; expectedCashflowSar: number };
    pessimistic: { description: string; expectedCashflowSar: number };
  };
}

/**
 * 🤖 الوكيل بصير (وكيل الاستراتيجية) - تحليل التدفقات النقدية والمحاكاة المالية التنبؤية (What-If Scenarios)
 */
export async function runBaseerStrategyReport(
  tenantId: string,
  userId: string | undefined
): Promise<StrategyReport> {
  return tenantContext.run({ tenantId, userId }, async (): Promise<StrategyReport> => {
    const now = new Date();

    // 1. جلب كافة العقود والأقساط التابعة للمستأجر
    // نستخدم prisma المحدودة بالعزل للحفاظ على أمان البيانات
    const contracts = await prisma.contract.findMany({
      include: {
        installments: true,
        unit: {
          include: {
            project: true,
          },
        },
      },
    });

    let totalActiveContractsSar = 0;
    let totalCollectedSar = 0;
    let totalPendingSar = 0;
    let totalActiveContractsCount = contracts.length;

    // تجميع الأقساط لحساب التدفقات الحالية والمستقبلية
    const allInstallments: Array<{ amountSar: number; dueDate: Date; paymentStatus: string }> = [];

    for (const contract of contracts) {
      const contractVolume = parseFloat(contract.totalVolumeSar.toString());
      totalActiveContractsSar += contractVolume;

      for (const installment of contract.installments) {
        const amount = parseFloat(installment.amountSar.toString());
        const isPaid = installment.paymentStatus.toLowerCase() === "paid";
        
        allInstallments.push({
          amountSar: amount,
          dueDate: new Date(installment.dueDate),
          paymentStatus: installment.paymentStatus,
        });

        if (isPaid) {
          totalCollectedSar += amount;
        } else {
          totalPendingSar += amount;
        }
      }
    }

    const collectionRate = totalActiveContractsSar > 0 
      ? (totalCollectedSar / totalActiveContractsSar) * 100 
      : 0;

    // 2. حساب التدفقات المستقبلية المتوقعة لـ 30، 60، 90 يوماً
    const days30Limit = new Date();
    days30Limit.setDate(now.getDate() + 30);

    const days60Limit = new Date();
    days60Limit.setDate(now.getDate() + 60);

    const days90Limit = new Date();
    days90Limit.setDate(now.getDate() + 90);

    let days30Sar = 0;
    let days60Sar = 0;
    let days90Sar = 0;

    for (const inst of allInstallments) {
      if (inst.paymentStatus.toLowerCase() === "pending") {
        const time = inst.dueDate.getTime();
        if (time >= now.getTime() && time <= days30Limit.getTime()) {
          days30Sar += inst.amountSar;
        }
        if (time >= now.getTime() && time <= days60Limit.getTime()) {
          days60Sar += inst.amountSar;
        }
        if (time >= now.getTime() && time <= days90Limit.getTime()) {
          days90Sar += inst.amountSar;
        }
      }
    }

    // 3. محاكاة سيناريوهات "ماذا لو..." المالية الاستشرافية
    const totalForecast90Days = days90Sar;

    // سيناريو متفائل: تحصيل 100% من دفعات الأقساط + تسريع حجز الوحدات الشاغرة
    const optimisticCashflow = totalForecast90Days * 1.0;
    // سيناريو متحفظ: تحصيل 75% من الأقساط المطلوبة
    const conservativeCashflow = totalForecast90Days * 0.75;
    // سيناريو متشائم: تحصيل 45% فقط بسبب تعثر أو تأخر الدفعات
    const pessimisticCashflow = totalForecast90Days * 0.45;

    const report: StrategyReport = {
      timestamp: now.toISOString(),
      metrics: {
        totalActiveContractsSar,
        totalActiveContractsCount,
        totalCollectedSar,
        totalPendingSar,
        collectionRate,
      },
      projections: {
        days30Sar,
        days60Sar,
        days90Sar,
      },
      scenarios: {
        optimistic: {
          description: "سيناريو متفائل (التزام تحصيل كامل بنسبة 100%): تحصيل كافة مستحقات المنشأة العقارية دون تأخير.",
          expectedCashflowSar: optimisticCashflow,
        },
        conservative: {
          description: "سيناريو متحفظ (التزام تحصيل بنسبة 75%): معالجة بعض الدفعات المتأخرة عبر جدول دفعات بديلة.",
          expectedCashflowSar: conservativeCashflow,
        },
        pessimistic: {
          description: "سيناريو متشائم (التزام تحصيل بنسبة 45%): تأثر حاد في السيولة النقدية نتيجة تأخر المستأجرين، ويتطلب تدخلاً عاجلاً للوكيل سند.",
          expectedCashflowSar: pessimisticCashflow,
        },
      },
    };

    // 4. تسجيل تقرير الوكيل بصير وتخزين السجل الاستراتيجي
    const logMessageAr = `«[الوكيل بصير] تم بنجاح إجراء محاكاة استشرافية للسيولة النقدية للـ 90 يوماً القادمة. التدفق المتفائل المحاكي: ${optimisticCashflow.toLocaleString("ar-SA")} ر.س، والتدفق المتشائم: ${pessimisticCashflow.toLocaleString("ar-SA")} ر.س»`;
    
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId,
        agentId: "Baseer",
        actionType: "Payment_Confirmed",
        logMessageAr,
        severity: "Info",
      },
    });

    return report;
  });
}
