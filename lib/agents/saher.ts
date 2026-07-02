// lib/agents/saher.ts
import { prisma } from "../prisma";
import { runWithTenantContext } from "@/lib/tenant-context";

export interface CorrectionReport {
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  errors: string[];
  recommendations: string[];
}

/**
 * 🤖 الوكيل ساهر (وكيل الامتثال) - فحص استباقي لعقود وفواتير الجهات الحكومية
 */
export async function runSaherComplianceCheck(
  tenantId: string,
  userId: string | undefined,
  type: "CONTRACT" | "INVOICE",
  data: any
): Promise<CorrectionReport> {
  // تغليف التنفيذ بسياق المستأجر لضمان العزل التام للمخزن الخلفي وقواعد البيانات
  return runWithTenantContext({ tenantId, userId }, async (): Promise<CorrectionReport> => {
    const errors: string[] = [];
    const recommendations: string[] = [];

    // 1. فحص الامتثال حسب نوع العملية
    if (type === "CONTRACT") {
      // فحص معايير عقود شبكة "إيجار"
      if (!data.buyerName || data.buyerName.trim().length < 3) {
        errors.push("اسم المشتري/المستأجر غير مكتمل أو أقل من ٣ أحرف.");
        recommendations.push("تحديث الاسم الرباعي للمشتري ليتطابق مع الهوية الوطنية/الإقامة.");
      }
      if (!data.buyerPhone || !/^05\d{8}$/.test(data.buyerPhone.trim())) {
        errors.push("رقم الجوال غير صحيح أو لا يبدأ بـ ٠٥ أو لا يحتوي على ١٠ أرقام.");
        recommendations.push("إدخال صيغة جوال سعودي صحيحة تبدأ بـ 05 (مثال: 0500000000).");
      }
      if (!data.totalVolumeSar || parseFloat(data.totalVolumeSar.toString()) <= 0) {
        errors.push("القيمة الإجمالية للعقد يجب أن تكون أكبر من صفر.");
        recommendations.push("مراجعة وتوثيق سعر الوحدة وتوزيع الدفعات بشكل صحيح.");
      }
    } else if (type === "INVOICE") {
      // فحص معايير الفاتورة الإلكترونية لهيئة الزكاة والضريبة والجمارك (زاتكا) المرحلة الثانية
      if (!data.totalSar || parseFloat(data.totalSar.toString()) <= 0) {
        errors.push("قيمة الفاتورة الإجمالية غير صالحة.");
        recommendations.push("تحديد إجمالي مالي صحيح للفاتورة.");
      }
      if (data.taxSar === undefined || parseFloat(data.taxSar.toString()) < 0) {
        errors.push("قيمة ضريبة القيمة المضافة غير معلنة.");
        recommendations.push("إضافة حساب الضريبة بنسبة ١٥٪ للوحدات الخاضعة للضريبة.");
      }
      // التحقق من حساب الضريبة الحسابي (تطابق الحساب بنسبة 15% تقريباً)
      if (data.totalSar && data.taxSar) {
        const expectedTax = parseFloat(data.totalSar.toString()) * 0.15;
        const diff = Math.abs(parseFloat(data.taxSar.toString()) - expectedTax);
        if (diff > 5) {
          recommendations.push("تنبيه: يوجد تفاوت في حساب ضريبة القيمة المضافة (15%). يرجى التحقق من القيمة المحسوبة.");
        }
      }
    }

    const isCompliant = errors.length === 0;
    const report: CorrectionReport = {
      status: isCompliant ? "COMPLIANT" : "NON_COMPLIANT",
      errors,
      recommendations,
    };

    // 2. تسجيل سجلات الامتثال في قاعدة البيانات وتوقيع الوكيل رقمياً
    const logMessageAr = isCompliant
      ? `«[الوكيل ساهر] تم بنجاح فحص مطابقة مستند (${type === "CONTRACT" ? "العقد العقاري" : "الفاتورة الضريبية"}) للمستأجر وتمريره للتصدير الحكومي»`
      : `«[الوكيل ساهر] تنبيه عدم مطابقة في مستند (${type === "CONTRACT" ? "العقد العقاري" : "الفاتورة الضريبية"}). تم رصد عدد ${errors.length} أخطاء وإصدار تقرير تصحيح فوري»`;

    await prisma.agentTelemetryLog.create({
      data: {
        tenantId,
        agentId: "Saher",
        actionType: "Lead_Screening",
        logMessageAr,
        severity: isCompliant ? "Info" : "Warning",
      },
    });

    return report;
  });
}
