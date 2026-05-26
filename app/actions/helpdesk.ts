// app/actions/helpdesk.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب تذاكر الدعم الفني الخاصة بالمستأجر الحالي
 */
export async function getTicketsAction() {
  try {
    const tenant = await getActiveTenant();
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
 * إنشاء تذكرة دعم فني جديدة وتفعيل رد الوكيل الذكي مساعد فوراً [2]
 */
export async function createTicketAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!title || !description) {
      throw new Error("جميع الحقول المطلوبة إلزامية لإرسال التذكرة.");
    }

    // 1. إنشاء سجل التذكرة المفتوحة بقاعدة البيانات بالصيغة العلائقية الآمنة
    const ticket = await prisma.ticket.create({
      data: {
        tenant: {
          connect: { id: tenant.id }
        },
        title,
        description,
        status: "OPEN",
      }
    });

    // 2. 🤖 محاكاة رد الوكيل الفني الذكي "مساعد" بشكل فوري بناءً على الكلمات المفتاحية
    let aiReply = "";
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes("باقة") || lowerDesc.includes("اشتراك") || lowerDesc.includes("دفع")) {
      aiReply = `🤖 مرحباً بك شريكنا بـ (${tenant.companyName})، أنا مساعد الدعم الفني الذكي لمنصة أوركا. بخصوص استفسارك عن ترقيات الاشتراكات والدفع، يمكنك التوجه إلى صفحة الإعدادات وتحديد باقة الاشتراك ودفعها بـ مدى أو فيزا أو STC Pay بشكل فوري وسيتم تفعيل حسابك وصلاحيات الموظفين تلقائياً خلال ثوانٍ معدودة.`;
    } else if (lowerDesc.includes("ربط") || lowerDesc.includes("نطاق") || lowerDesc.includes("دومين") || lowerDesc.includes("dns")) {
      aiReply = `🤖 مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لربط نطاقك المخصص المشتري من Hostinger أو غيرها، يرجى التوجه إلى لوحة إدارة الـ DNS الخاصة بنطاقك وإضافة سجل CNAME يشير إلى: cname.vercel-dns.com، وبمجرد إتمام ذلك، تفضل بتحديث الإعدادات باللوحة وسيتم توجيه رابط المبيعات الخاص بك آلياً.`;
    } else if (lowerDesc.includes("خطأ") || lowerDesc.includes("مشكلة") || lowerDesc.includes("عطل") || lowerDesc.includes("توقف")) {
      aiReply = `⚠️ مرحباً بك، أنا مساعد الدعم الفني. تم رصد إشعار بوجود عطل محتمل بخصوص "${title}". لقد قمت بتسجيل التفاصيل وتصنيف التذكرة كأولوية حرجة، وتم إرسال تنبيه مباشر إلى رئيس فريق التطوير (المهندس علي) للتدخل البشري الفوري ومراجعة سجلات الخادم (SRE Logs) لإصلاح الخلل بأقرب وقت.`;
    } else {
      aiReply = `🤖 مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لقد تسلمت تذكرتك بنجاح بخصوص موضوع "${title}". تفاصيل استفسارك قيد المعالجة الآن وسأقوم بتوفير إجابة تقنية مفصلة أو توجيه التذكرة للقسم المختص خلال دقائق قليلة. شكراً لاهتمامك.`;
    }

    // 3. تحديث التذكرة وحقن رد الوكيل مساعد في قاعدة البيانات
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        aiResponse: aiReply
      }
    });

    revalidatePath("/operations/helpdesk");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إغلاق التذكرة عند حل المشكلة من قبل المستخدم أو الوكيل
 */
export async function closeTicketAction(ticketId: string) {
  try {
    const tenant = await getActiveTenant();

    await prisma.ticket.update({
      where: {
        id: ticketId,
        tenantId: tenant.id,
      },
      data: {
        status: "CLOSED",
      }
    });

    revalidatePath("/operations/helpdesk");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
