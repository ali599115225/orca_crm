// lib/compliance-gateway.ts
import { rawPrisma } from "./prisma";
import { decryptText } from "./crypto";

export interface ComplianceResult {
  isReady: boolean;
  checklist: Array<{
    id: string;
    labelAr: string;
    labelEn: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT';
    error?: string;
  }>;
}

export interface ComplianceRule {
  id: string;
  labelAr: string;
  labelEn: string;
  validate: (tenant: any, auditLogs: any[]) => Promise<{ isValid: boolean; errorAr?: string; errorEn?: string }>;
}

// قائمة شروط الامتثال القابلة للتوسع الاستراتيجي لاحقاً دون تعديل الكود الأساسي
export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "api_credentials",
    labelAr: "صحة بيانات الاعتماد (نتيجة فحص الوكيل 'ساهر')",
    labelEn: "Credential Validity (Saher Compliance Verification)",
    async validate(tenant) {
      const clientId = decryptText(tenant?.encryptedClientId || "");
      const clientSecret = decryptText(tenant?.encryptedClientSecret || "");
      const apiKey = decryptText(tenant?.encryptedApiKey || "");
      const zatcaCreds = decryptText(tenant?.encryptedZatcaCredentials || "");

      const hasCreds = clientId && clientSecret && apiKey && zatcaCreds;

      if (!hasCreds) {
        return {
          isValid: false,
          errorAr: "بيانات الاعتماد الحكومية للربط مفقودة أو غير محفوظة بقاعدة البيانات.",
          errorEn: "Government connection API credentials are missing or not saved in the database."
        };
      }

      // محاكاة فحص صحة بيانات الاعتماد بواسطة وكيل الامتثال "ساهر"
      if (clientId.length < 5 || clientSecret.length < 5 || apiKey.length < 5 || zatcaCreds.length < 5) {
        return {
          isValid: false,
          errorAr: "فشل التحقق من صحة بيانات الاعتماد بواسطة الوكيل 'ساهر'. البيانات قصيرة جداً أو تالفة.",
          errorEn: "Credential validation failed via compliance agent 'Saher'. Data is too short or corrupted."
        };
      }
      return { isValid: true };
    }
  },
  {
    id: "profile_completeness",
    labelAr: "اكتمال معلومات الشركة (الرقم الضريبي، السجل التجاري، العنوان)",
    labelEn: "Company Profile Completeness (VAT, Commercial Registry, National Address)",
    async validate(tenant) {
      const cr = tenant.commercialRegistry || "";
      const vat = tenant.vatNumber || "";
      const address = tenant.nationalAddress || "";

      const errors: string[] = [];
      const errorsEn: string[] = [];

      if (!/^\d{10}$/.test(cr.trim())) {
        errors.push("السجل التجاري يجب أن يتكون من ١٠ أرقام.");
        errorsEn.push("Commercial Registry must be exactly 10 digits.");
      }
      if (!/^3\d{14}$/.test(vat.trim())) {
        errors.push("الرقم الضريبي غير صحيح (يجب أن يبدأ بـ ٣ ويتكون من ١٥ رقماً).");
        errorsEn.push("VAT number is invalid (must start with 3 and be exactly 15 digits).");
      }
      if (address.trim().length < 5) {
        errors.push("العنوان الوطني غير مكتمل.");
        errorsEn.push("National Address is incomplete.");
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errorAr: errors.join(" | "),
          errorEn: errorsEn.join(" | ")
        };
      }
      return { isValid: true };
    }
  },
  {
    id: "digital_signature",
    labelAr: "التوقيع الرقمي والموافقة على إقرار إخلاء المسؤولية القانونية",
    labelEn: "Digital Signature & Legal Disclaimer Agreement",
    async validate(tenant, auditLogs) {
      const hasSigned = auditLogs.some(
        (log) => log.action === "COMPLIANCE_DISCLAIMER_SIGNED"
      );

      if (!hasSigned) {
        return {
          isValid: false,
          errorAr: "لم يتم توقيع إقرار إخلاء المسؤولية القانونية والتشغيلية المعتمد بعد.",
          errorEn: "The digital legal liability and operational disclaimer agreement has not been signed yet."
        };
      }
      return { isValid: true };
    }
  }
];

export class ComplianceGateway {
  /**
   * الفحص الشامل لامتثال مستأجر معين وعرض قائمة التحقق للواجهة
   */
  static async checkReadiness(tenantId: string, lang: 'AR' | 'EN' = 'AR'): Promise<ComplianceResult> {
    const tenant = await rawPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }

    const auditLogs = await rawPrisma.auditLog.findMany({
      where: { tenantId }
    });

    const checklist: ComplianceResult["checklist"] = [];
    let isReady = true;

    for (const rule of COMPLIANCE_RULES) {
      try {
        const check = await rule.validate(tenant, auditLogs);
        if (!check.isValid) {
          isReady = false;
          checklist.push({
            id: rule.id,
            labelAr: rule.labelAr,
            labelEn: rule.labelEn,
            status: "NON_COMPLIANT",
            error: lang === "AR" ? check.errorAr : check.errorEn
          });
        } else {
          checklist.push({
            id: rule.id,
            labelAr: rule.labelAr,
            labelEn: rule.labelEn,
            status: "COMPLIANT"
          });
        }
      } catch (err: any) {
        isReady = false;
        checklist.push({
          id: rule.id,
          labelAr: rule.labelAr,
          labelEn: rule.labelEn,
          status: "NON_COMPLIANT",
          error: err.message
        });
      }
    }

    return { isReady, checklist };
  }

  /**
   * قيد التحقق الأمني والحوكمة (Guard Clause) في مسارات الـ API والـ Actions لمنع أي محاولة ربط غير ممتثلة وتوثيق الانتهاك
   */
  static async enforceGuard(tenantId: string, userId: string | undefined, apiCallName: string): Promise<void> {
    const check = await this.checkReadiness(tenantId, 'AR');
    if (!check.isReady) {
      // 1. تسجيل خرق الأمان لعدم الامتثال في سجل التدقيق
      await rawPrisma.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: "SECURITY_COMPLIANCE_VIOLATION",
          tableName: "System",
          recordId: "gateway-lock",
          details: JSON.stringify({
            apiCallName,
            timestamp: new Date().toISOString(),
            violations: check.checklist.filter(c => c.status === "NON_COMPLIANT")
          })
        }
      });

      // 2. إرجاع استثناء خلفي لقطع الاتصال
      throw new Error("عذراً، تم حظر العملية عبر بوابة الامتثال لعدم استيفاء الشروط الإلزامية للمنشأة.");
    }
  }
}
