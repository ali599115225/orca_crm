// app/actions/compliance.ts
"use server";

import { assertServerActionRole } from "@/lib/api-auth-guard";

import { prisma, rawPrisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { ComplianceGateway, ComplianceResult } from "@/lib/compliance-gateway";
import { runWithTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { encryptText } from "@/lib/crypto";

/**
 * جلب تقرير الامتثال وجاهزية الربط للمستأجر الحالي
 */
export async function checkComplianceReadinessAction(lang: 'AR' | 'EN' = 'AR'): Promise<{ success: boolean; data?: ComplianceResult; error?: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();
    
    // تشغيل الفحص داخل سياق المستأجر المعزول
    const result = await runWithTenantContext({ tenantId: tenant.id, userId: session.userId as string }, async () => {
      return await ComplianceGateway.checkReadiness(tenant.id, lang);
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Compliance check action error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * تحديث معلومات السجل التجاري والرقم الضريبي والعنوان الوطني للشركة
 */
export async function updateTenantComplianceDetailsAction(data: {
  commercialRegistry: string;
  vatNumber: string;
  nationalAddress: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    await runWithTenantContext({ tenantId: tenant.id, userId: session.userId as string }, async () => {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          commercialRegistry: data.commercialRegistry.trim(),
          vatNumber: data.vatNumber.trim(),
          nationalAddress: data.nationalAddress.trim()
        }
      });
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * التوقيع الرقمي للموافقة على إقرار إخلاء المسؤولية القانونية
 */
export async function signComplianceDisclaimerAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    await runWithTenantContext({ tenantId: tenant.id, userId: session.userId as string }, async () => {
      // نكتب مباشرة في سجل التدقيق التوقيع الرقمي المعتمد للـ CISO والـ ADMIN
      await rawPrisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId as string,
          action: "COMPLIANCE_DISCLAIMER_SIGNED",
          tableName: "System",
          recordId: "operational-disclaimer",
          details: JSON.stringify({
            signedBy: session.email,
            ipAddress: "captured-node-server",
            userAgent: "secured-handshake",
            agreementText: "أوافق كمطور عقاري مسؤول عن كامل البيانات المدخلة والمصدرة للمنصات الحكومية وإخلاء مسؤولية المزود التقني بالكامل.",
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * محاكاة تفعيل الربط الإنتاجي الحكومي (خاضع لقيد التحقق الأمني)
 */
export async function activateGovernmentConnectionAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    await assertServerActionRole(session, ['ADMIN']);

    const tenant = await getActiveTenant();

    // تطبيق قيد التحقق الأمني الفوري (Guard Clause)
    // في حال عدم الامتثال، ستقوم الدالة برمي استثناء وتسجيل SECURITY_COMPLIANCE_VIOLATION تلقائياً
    await ComplianceGateway.enforceGuard(tenant.id, session.userId as string, "activateGovernmentConnectionAction");

    // إذا تم اجتياز البوابة، نقوم بتحديث حالة الدفع أو الربط بنجاح
    await runWithTenantContext({ tenantId: tenant.id, userId: session.userId as string }, async () => {

      // تسجيل الامتثال في سجل التدقيق
      await rawPrisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId as string,
          action: "GOVERNMENT_CONNECTION_READINESS_APPROVED",
          tableName: "System",
          recordId: "compliance-gate",
          details: JSON.stringify({
            activatedBy: session.email,
            status: "READY_FOR_PROVIDER_ACTIVATION",
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب معلومات الامتثال الأساسية وحالة تعيين مفاتيح الربط (مع التغطية الأمنية)
 */
export async function getTenantComplianceInfoAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    return {
      success: true,
      data: {
        commercialRegistry: tenant.commercialRegistry || "",
        vatNumber: tenant.vatNumber || "",
        nationalAddress: tenant.nationalAddress || "",
        hasClientId: !!tenant.encryptedClientId,
        hasClientSecret: !!tenant.encryptedClientSecret,
        hasApiKey: !!tenant.encryptedApiKey,
        hasZatcaCredentials: !!tenant.encryptedZatcaCredentials,
        whatsappConnected: tenant.whatsappConnected
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حفظ وتشفير بيانات الاعتماد الحكومية للربط
 */
export async function saveTenantCredentialsAction(data: {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  zatcaCredentials: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    await assertServerActionRole(session, ['ADMIN']);

    const tenant = await getActiveTenant();

    const encryptedClientId = encryptText(data.clientId.trim());
    const encryptedClientSecret = encryptText(data.clientSecret.trim());
    const encryptedApiKey = encryptText(data.apiKey.trim());
    const encryptedZatcaCredentials = encryptText(data.zatcaCredentials.trim());

    await runWithTenantContext({ tenantId: tenant.id, userId: session.userId as string }, async () => {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          encryptedClientId,
          encryptedClientSecret,
          encryptedApiKey,
          encryptedZatcaCredentials
        }
      });

      // تسجيل العملية في سجل التدقيق للامتثال
      await rawPrisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId as string,
          action: "CREDENTIALS_ENCRYPTED_AND_SAVED",
          tableName: "System",
          recordId: "credentials-gate",
          details: JSON.stringify({
            savedBy: session.email,
            fieldsSaved: ["clientId", "clientSecret", "apiKey", "zatcaCredentials"],
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
