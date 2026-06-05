// app/api/v1/support/tickets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getActiveTenant();
    const tickets = await prisma.ticket.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getActiveTenant();
    const body = await request.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required' }, { status: 400 });
    }

    // 1. Create ticket in db
    const ticket = await prisma.ticket.create({
      data: {
        tenant: {
          connect: { id: tenant.id }
        },
        title,
        description,
        status: 'OPEN',
      }
    });

    // 2. Immediate assistant reply mock
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

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { aiResponse: aiReply }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 550 });
  }
}
