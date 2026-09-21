// lib/agents/baseer.ts
import { prisma } from "../prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  buildBaseerSystemPrompt,
  type BaseerAIOutput,
} from "./baseerPrompt";

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
  aiInterpretation?: BaseerAIOutput | null;
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/**
 * استدعاء Gemini لتفسير التقرير المالي بلغة عربية مفهومة
 */
async function callGeminiForFinancialInterpretation(
  systemPrompt: string,
  reportSummary: string,
  retryCount = 0
): Promise<BaseerAIOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.warn("[بصير] مفتاح Gemini API غير موجود، تخطي التفسير الذكي");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `تقرير مالي استشرافي للتحليل:\n\n${reportSummary}\n\nأعطني التفسير بصيغة JSON نظيفة فقط دون أي نص إضافي.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      const statusCode = response.status;

      if (retryCount < MAX_RETRIES && (statusCode >= 500 || statusCode === 429)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
        return callGeminiForFinancialInterpretation(systemPrompt, reportSummary, retryCount + 1);
      }

      throw new Error(`Gemini API Error: ${statusCode} — ${err}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const cleanJson = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanJson) as BaseerAIOutput;
  } catch (error: any) {
    if (retryCount < MAX_RETRIES && error.name === "AbortError") {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
      return callGeminiForFinancialInterpretation(systemPrompt, reportSummary, retryCount + 1);
    }

    console.error("[بصير] خطأ في استدعاء Gemini للتفسير المالي:", error);
    return null;
  }
}

/**
 * بناء ملخص التقرير المالي لتمريره للذكاء الاصطناعي
 */
function buildReportSummary(companyName: string, report: StrategyReport): string {
  return `
الشركة: ${companyName}

### المؤشرات المالية:
- إجمالي العقود النشطة: ${report.metrics.totalActiveContractsCount} عقد بقيمة ${report.metrics.totalActiveContractsSar.toLocaleString("ar-SA")} ر.س
- إجمالي المحصل: ${report.metrics.totalCollectedSar.toLocaleString("ar-SA")} ر.س
- إجمالي المعلق: ${report.metrics.totalPendingSar.toLocaleString("ar-SA")} ر.س
- معدل التحصيل: ${report.metrics.collectionRate.toFixed(1)}%

### التدفقات النقدية المتوقعة:
- خلال 30 يوماً: ${report.projections.days30Sar.toLocaleString("ar-SA")} ر.س
- خلال 60 يوماً: ${report.projections.days60Sar.toLocaleString("ar-SA")} ر.س
- خلال 90 يوماً: ${report.projections.days90Sar.toLocaleString("ar-SA")} ر.س

### السيناريوهات:
- متفائل (100%): ${report.scenarios.optimistic.expectedCashflowSar.toLocaleString("ar-SA")} ر.س
- متحفظ (75%): ${report.scenarios.conservative.expectedCashflowSar.toLocaleString("ar-SA")} ر.س
- متشائم (45%): ${report.scenarios.pessimistic.expectedCashflowSar.toLocaleString("ar-SA")} ر.س
  `.trim();
}

/**
 * 🤖 الوكيل بصير (وكيل الاستراتيجية) - تحليل التدفقات النقدية والمحاكاة المالية التنبؤية (What-If Scenarios)
 */
export async function runBaseerStrategyReport(
  tenantId: string,
  userId: string | undefined,
  companyName?: string
): Promise<StrategyReport> {
  return runWithTenantContext({ tenantId, userId }, async (): Promise<StrategyReport> => {
    const now = new Date();

    // 1. جلب كافة العقود والأقساط التابعة للمستأجر
    // نستخدم prisma المحدودة بالعزل للحفاظ على أمان البيانات
    const contracts = await prisma.contract.findMany({
      where: { tenantId },
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

    // 5. استدعاء Gemini لتفسير التقرير بالعربية (AI Interpretation)
    let aiInterpretation: BaseerAIOutput | null = null;
    try {
      const reportName = companyName || "الشركة";
      const systemPrompt = buildBaseerSystemPrompt({ companyName: reportName });
      const reportSummary = buildReportSummary(reportName, report);
      aiInterpretation = await callGeminiForFinancialInterpretation(systemPrompt, reportSummary);

      if (aiInterpretation) {
        await prisma.agentTelemetryLog.create({
          data: {
            tenantId,
            agentId: "Baseer",
            actionType: "AI_Interpretation",
            logMessageAr: `«[الوكيل بصير] تم إصدار تفسير ذكي للتقرير المالي — درجة الخطورة: ${aiInterpretation.risk_level} — درجة الثقة: ${(aiInterpretation.confidence * 100).toFixed(0)}%»`,
            severity: aiInterpretation.risk_level === "CRITICAL" || aiInterpretation.risk_level === "HIGH" ? "Warning" : "Info",
          },
        });
      }
    } catch (aiErr) {
      console.warn("[بصير] فشل التفسير الذكي للتقرير المالي:", aiErr);
    }

    return { ...report, aiInterpretation };
  });
}
