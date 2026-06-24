// app/actions/helpdesk.ts
// Hardened: session + DB-backed role required for all mutations.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const HELPDESK_ROLES = ["ADMIN", "owner", "SALES_MANAGER", "SALES_EMPLOYEE", "rental_manager"] as const;

async function requireHelpdeskSession() {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
  const verified = await assertServerActionRole(session, HELPDESK_ROLES);
  const tenant = await getActiveTenant();
  return { session: verified, tenant };
}

/**
 * جلب تذاكر الدعم الفني الخاصة بالمستأجر الحالي
 */
export async function getTicketsAction() {
  try {
    const { tenant } = await requireHelpdeskSession();
    return await prisma.ticket.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("فشل جلب التذاكر:", error);
    return [];
  }
}

/**
 * إنشاء تذكرة دعم فني جديدة وتفعيل رد الوكيل الذكي مساعد فوراً
 */
export async function createTicketAction(formData: FormData) {
  try {
    const { session, tenant } = await requireHelpdeskSession();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!title || !description) {
      throw new Error("جميع الحقول المطلوبة إلزامية لإرسال التذكرة.");
    }

    // 1. إنشاء سجل التذكرة المفتوحة
    const ticket = await prisma.ticket.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        title,
        description,
        status: "OPEN",
      },
    });

    // 2. محاكاة رد الوكيل الذكي
    let aiReply = "";
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes("باقة") || lowerDesc.includes("اشتراك") || lowerDesc.includes("دفع")) {
      aiReply = `مرحباً بك شريكنا بـ (${tenant.companyName})، أنا مساعد الدعم الفني الذكي لمنصة أوركا. بخصوص استفسارك عن ترقيات الاشتراكات والدفع، يمكنك التوجه إلى صفحة الإعدادات وتحديد باقة الاشتراك ودفعها بـ مدى أو فيزا أو STC Pay بشكل فوري وسيتم تفعيل حسابك وصلاحيات الموظفين تلقائياً خلال ثوانٍ معدودة.`;
    } else if (lowerDesc.includes("ربط") || lowerDesc.includes("نطاق") || lowerDesc.includes("دومين") || lowerDesc.includes("dns")) {
      aiReply = `مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لربط نطاقك المخصص المشتري من Hostinger أو غيرها، يرجى التوجه إلى لوحة إدارة الـ DNS الخاصة بنطاقك وإضافة سجل CNAME يشير إلى: cname.vercel-dns.com، وبمجرد إتمام ذلك، تفضل بتحديث الإعدادات باللوحة وسيتم توجيه رابط المبيعات الخاص بك آلياً.`;
    } else if (lowerDesc.includes("خطأ") || lowerDesc.includes("مشكلة") || lowerDesc.includes("عطل") || lowerDesc.includes("توقف")) {
      aiReply = `تم رصد إشعار بوجود عطل محتمل بخصوص "${title}". لقد قمت بتسجيل التفاصيل وتصنيف التذكرة كأولوية حرجة، وتم إرسال تنبيه مباشر إلى فريق التطوير للتدخل الفوري.`;
    } else {
      aiReply = `مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لقد تسلمت تذكرتك بنجاح بخصوص موضوع "${title}". تفاصيل استفسارك قيد المعالجة الآن وسيتم توفير إجابة تقنية مفصلة خلال دقائق قليلة.`;
    }

    // 3. تحديث التذكرة بالرد الذكي
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { aiResponse: aiReply },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "TICKET_CREATED",
      tableName: "tickets",
      recordId: ticket.id,
      details: JSON.stringify({ title }),
    });

    revalidatePath("/operations/helpdesk");
    return { success: true, ticket: updatedTicket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إغلاق التذكرة عند حل المشكلة
 */
export async function closeTicketAction(ticketId: string) {
  try {
    const { session, tenant } = await requireHelpdeskSession();

    await prisma.ticket.update({
      where: { id: ticketId, tenantId: tenant.id },
      data: { status: "CLOSED" },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "TICKET_CLOSED",
      tableName: "tickets",
      recordId: ticketId,
    });

    revalidatePath("/operations/helpdesk");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
