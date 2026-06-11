// app/actions/email.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function sendEmailAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    const session = await getSession();

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
        userId: session?.userId as string | undefined || null,
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
              userId: session?.userId as string | undefined || null,
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
  } catch (error: any) {
    console.error("[Email Action] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function getEmailMessagesAction(limit = 50) {
  try {
    const tenant = await getActiveTenant();

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
  } catch (error: any) {
    console.error("[Email Action] Get messages error:", error.message);
    return { success: false, error: error.message, messages: [] };
  }
}

export async function getLeadEmailMessagesAction(leadId: string) {
  try {
    const tenant = await getActiveTenant();

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
  } catch (error: any) {
    console.error("[Email Action] Get lead messages error:", error.message);
    return { success: false, error: error.message, messages: [] };
  }
}
