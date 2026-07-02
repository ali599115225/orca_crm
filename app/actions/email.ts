// app/actions/email.ts
// Hardened: session + role check before sending external emails.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { runWithTenantContext } from "@/lib/tenant-context";

const EMAIL_SENDER_ROLES = [
  "ADMIN",
  "owner",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "rental_manager",
] as const;

export async function sendEmailAction(formData: FormData) {
  try {
    // ── Auth: session + role required before sending external email ──────────
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, EMAIL_SENDER_ROLES);
    const tenant = await getActiveTenant();

    return runWithTenantContext(
      { tenantId: tenant.id, userId: verified.userId as string | undefined },
      async () => {
        const to = formData.get("to") as string;
        const cc = formData.get("cc") as string | null;
        const bcc = formData.get("bcc") as string | null;
        const subject = formData.get("subject") as string;
        const htmlBody = formData.get("htmlBody") as string | null;
        const textBody = formData.get("textBody") as string | null;
        const leadId = formData.get("leadId") as string | null;
        const contactId = formData.get("contactId") as string | null;

        if (!to || !subject) {
          return { success: false, error: "الحقول المطلوبة: to, subject" };
        }

        const from = process.env.EMAIL_FROM || "ORCA <onboarding@resend.dev>";

        // Create EmailMessage record first with PENDING status
        const emailMessage = await prisma.emailMessage.create({
          data: {
            tenantId: tenant.id,
            leadId: leadId || null,
            contactId: contactId || null,
            userId: verified.userId || null,
            direction: "outbound",
            provider: "resend",
            from,
            to,
            cc: cc || null,
            bcc: bcc || null,
            subject,
            htmlBody: htmlBody || null,
            textBody: textBody || null,
            status: "PENDING",
          },
        });

        // Send email via Resend
        const result = await sendEmail({
          from,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          htmlBody: htmlBody || undefined,
          textBody: textBody || undefined,
        });

        // Update EmailMessage status based on result
        if (result.success) {
          await prisma.emailMessage.update({
            where: { id: emailMessage.id },
            data: {
              status: "SENT",
              providerMessageId: result.providerMessageId,
              sentAt: new Date(),
            },
          });

          // Create LeadActivity if leadId exists
          if (leadId) {
            // Verify lead belongs to this tenant
            const lead = await prisma.lead.findFirst({
              where: { id: leadId, tenantId: tenant.id },
            });

            if (lead) {
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
          }

          revalidatePath("/operations/email");
          return {
            success: true,
            emailId: emailMessage.id,
            providerMessageId: result.providerMessageId,
          };
        } else {
          // Update status to FAILED
          await prisma.emailMessage.update({
            where: { id: emailMessage.id },
            data: {
              status: "FAILED",
              errorMessage: result.error || "فشل إرسال البريد",
            },
          });

          return {
            success: false,
            emailId: emailMessage.id,
            error: result.error || "فشل إرسال البريد",
          };
        }
      },
    );
  } catch (error: any) {
    console.error("[Email Action] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function getEmailMessagesAction(limit = 50) {
  try {
    const session = await getSession();
    if (!session)
      return { success: false, error: "يجب تسجيل الدخول.", messages: [] };
    await assertServerActionRole(session, EMAIL_SENDER_ROLES);
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
  } catch (error: any) {
    console.error("[Email Action] Get messages error:", error.message);
    return { success: false, error: error.message, messages: [] };
  }
}

export async function getLeadEmailMessagesAction(leadId: string) {
  try {
    const session = await getSession();
    if (!session)
      return { success: false, error: "يجب تسجيل الدخول.", messages: [] };
    await assertServerActionRole(session, EMAIL_SENDER_ROLES);
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
  } catch (error: any) {
    console.error("[Email Action] Get lead messages error:", error.message);
    return { success: false, error: error.message, messages: [] };
  }
}
