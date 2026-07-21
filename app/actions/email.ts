// app/actions/email.ts
// Hardened: session + role check before sending external emails.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRoleWithAudit } from "@/lib/authz/legacy-audit-guards";
import {
  EMAIL_PROVIDER_INVALID,
  EMAIL_PROVIDER_NOT_CONFIGURED,
  getTenantEmailProviderSummary,
  sendEmail,
} from "@/lib/email";
import { revalidatePath } from "next/cache";
import { runWithTenantContext } from "@/lib/tenant-context";

const EMAIL_SENDER_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const;

const PROVIDER_NOT_CONFIGURED_MESSAGE =
  "لم يتم ربط مزود بريد بهذه المنشأة. يمكنك إعداد مزود البريد من صفحة التكاملات قبل الإرسال.";

const PROVIDER_INVALID_MESSAGE =
  "إعدادات مزود البريد المرتبط غير مكتملة أو تعذر فك بيانات الاعتماد. راجع إعدادات التكاملات.";

function publicEmailError(value: unknown): string {
  const normalized = String(value || "").toLowerCase();

  if (
    value === EMAIL_PROVIDER_NOT_CONFIGURED ||
    normalized.includes("email_provider_not_configured")
  ) {
    return PROVIDER_NOT_CONFIGURED_MESSAGE;
  }

  if (
    value === EMAIL_PROVIDER_INVALID ||
    normalized.includes("email_provider_invalid")
  ) {
    return PROVIDER_INVALID_MESSAGE;
  }

  if (normalized.includes("smtp_auth_failed")) {
    return "تعذر التحقق من بيانات حساب البريد. راجع اسم المستخدم وكلمة المرور أو App Password من إعدادات التكاملات.";
  }

  if (
    normalized.includes("smtp_tls_failed") ||
    normalized.includes("smtp_starttls")
  ) {
    return "تعذر إنشاء اتصال مشفر بخادم البريد. راجع نوع التشفير والمنفذ.";
  }

  if (
    normalized.includes("smtp_timeout") ||
    normalized.includes("smtp_connection_failed")
  ) {
    return "تعذر الاتصال بخادم البريد. راجع اسم الخادم والمنفذ ثم اختبر الاتصال من صفحة التكاملات.";
  }

  if (
    normalized.includes("smtp_host_not_allowed") ||
    normalized.includes("smtp_host_invalid")
  ) {
    return "عنوان خادم البريد غير صالح أو غير مسموح بالاتصال به.";
  }

  if (normalized.includes("email_address_invalid")) {
    return "أحد عناوين البريد المدخلة غير صالح.";
  }

  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "تعذر إرسال البريد مؤقتًا بسبب حد الخدمة. حاول لاحقًا.";
  }

  return "تعذر إرسال البريد، حاول مرة أخرى.";
}

export async function sendEmailAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };

    const verified = await assertServerActionRoleWithAudit(
      session,
      EMAIL_SENDER_ROLES,
      {
        permissionKey: "email.send",
        source: "action:sendEmailAction",
        resource: { tenantId: String(session.tenantId || "") },
      },
    );
    const tenant = await getActiveTenant();

    return runWithTenantContext(
      {
        tenantId: tenant.id,
        userId: verified.userId as string | undefined,
      },
      async () => {
        const to = String(formData.get("to") || "").trim();
        const cc = String(formData.get("cc") || "").trim() || null;
        const bcc = String(formData.get("bcc") || "").trim() || null;
        const subject = String(formData.get("subject") || "").trim();
        const htmlBody =
          String(formData.get("htmlBody") || "").trim() || null;
        const textBody =
          String(formData.get("textBody") || "").trim() || null;
        const leadId =
          String(formData.get("leadId") || "").trim() || null;
        const contactId =
          String(formData.get("contactId") || "").trim() || null;

        if (!to || !subject) {
          return {
            success: false,
            error: "الحقول المطلوبة: to, subject",
          };
        }

        if (leadId) {
          const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId: tenant.id },
            select: { id: true },
          });

          if (!lead) {
            return { success: false, error: "العميل غير موجود." };
          }
        }

        if (contactId) {
          const contact = await prisma.contact.findFirst({
            where: { id: contactId, tenantId: tenant.id },
            select: { id: true },
          });

          if (!contact) {
            return {
              success: false,
              error: "جهة الاتصال غير موجودة.",
            };
          }
        }

        const provider = await getTenantEmailProviderSummary(tenant.id);
        const emailMessage = await prisma.emailMessage.create({
          data: {
            tenantId: tenant.id,
            leadId,
            contactId,
            userId: verified.userId || null,
            direction: "outbound",
            provider: provider.provider || "UNCONFIGURED",
            from: provider.fromEmail || "",
            to,
            cc,
            bcc,
            subject,
            htmlBody,
            textBody,
            status: provider.configured ? "PENDING" : "DRAFT",
          },
        });

        if (!provider.configured) {
          revalidatePath("/operations/email");
          return {
            success: false,
            draftSaved: true,
            emailId: emailMessage.id,
            code: provider.reason,
            error: publicEmailError(provider.reason),
          };
        }

        const result = await sendEmail({
          tenantId: tenant.id,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          htmlBody: htmlBody || undefined,
          textBody: textBody || undefined,
        });

        if (result.success) {
          await prisma.emailMessage.update({
            where: {
              id: emailMessage.id,
              tenantId: tenant.id,
            },
            data: {
              status: "SENT",
              provider:
                result.provider || provider.provider || "EMAIL_PROVIDER",
              from: result.fromEmail || provider.fromEmail || "",
              providerMessageId: result.providerMessageId,
              sentAt: new Date(),
              errorMessage: null,
            },
          });

          if (leadId) {
            await prisma.leadActivity.create({
              data: {
                tenantId: tenant.id,
                leadId,
                userId: verified.userId || null,
                activityType: "EMAIL_SENT",
                description: `أرسل بريد إلى ${to} — الموضوع: ${subject}`,
              },
            });
          }

          revalidatePath("/operations/email");
          return {
            success: true,
            emailId: emailMessage.id,
            providerMessageId: result.providerMessageId,
          };
        }

        if (
          result.code === EMAIL_PROVIDER_NOT_CONFIGURED ||
          result.code === EMAIL_PROVIDER_INVALID
        ) {
          await prisma.emailMessage.update({
            where: {
              id: emailMessage.id,
              tenantId: tenant.id,
            },
            data: {
              status: "DRAFT",
              errorMessage: null,
            },
          });

          revalidatePath("/operations/email");
          return {
            success: false,
            draftSaved: true,
            emailId: emailMessage.id,
            code: result.code,
            error: publicEmailError(result.code),
          };
        }

        await prisma.emailMessage.update({
          where: {
            id: emailMessage.id,
            tenantId: tenant.id,
          },
          data: {
            status: "FAILED",
            errorMessage: result.error || "فشل إرسال البريد",
          },
        });

        revalidatePath("/operations/email");
        return {
          success: false,
          emailId: emailMessage.id,
          error: publicEmailError(result.error),
        };
      },
    );
  } catch (error: unknown) {
    console.error("[Email Action] Error:", error);
    return {
      success: false,
      error: publicEmailError(error),
    };
  }
}

export async function getEmailMessagesAction(limit = 50) {
  try {
    const session = await getSession();
    if (!session)
      return { success: false, error: "يجب تسجيل الدخول.", messages: [] };
    await assertServerActionRoleWithAudit(session, EMAIL_SENDER_ROLES, {
      permissionKey: "email.read",
      source: "action:getEmailMessagesAction",
      resource: { tenantId: String(session.tenantId || "") },
    });
    const tenant = await getActiveTenant();

    return runWithTenantContext(
      { tenantId: tenant.id, userId: session.userId as string | undefined },
      async () => {
        const messages = await prisma.emailMessage.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            lead: {
              select: { firstName: true, lastName: true },
            },
            user: {
              select: { name: true },
            },
          },
        });

        return { success: true, messages };
      },
    );
  } catch (error: unknown) {
    console.error("[Email Action] Get messages error:", error);
    return { success: false, error: publicEmailError(error), messages: [] };
  }
}

export async function getLeadEmailMessagesAction(leadId: string) {
  try {
    const session = await getSession();
    if (!session)
      return { success: false, error: "يجب تسجيل الدخول.", messages: [] };
    await assertServerActionRoleWithAudit(session, EMAIL_SENDER_ROLES, {
      permissionKey: "email.read",
      source: "action:getLeadEmailMessagesAction",
      resource: {
        tenantId: String(session.tenantId || ""),
        resourceType: "Lead",
        resourceId: leadId,
      },
    });
    const tenant = await getActiveTenant();

    return runWithTenantContext(
      { tenantId: tenant.id, userId: session.userId as string | undefined },
      async () => {
        // Verify lead belongs to this tenant
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, tenantId: tenant.id },
        });

        if (!lead) {
          return { success: false, error: "العميل غير موجود", messages: [] };
        }

        const messages = await prisma.emailMessage.findMany({
          where: { tenantId: tenant.id, leadId },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true },
            },
          },
        });

        return { success: true, messages };
      },
    );
  } catch (error: unknown) {
    console.error("[Email Action] Get lead messages error:", error);
    return { success: false, error: publicEmailError(error), messages: [] };
  }
}
