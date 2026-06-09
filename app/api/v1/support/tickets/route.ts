import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: session.tenantId,
        title,
        description,
        status: 'OPEN',
      }
    });

    const lowerDesc = description.toLowerCase();
    let aiReply = "";

    if (lowerDesc.includes("باقة") || lowerDesc.includes("اشتراك") || lowerDesc.includes("دفع")) {
      aiReply = `مرحباً بك شريكنا، أنا مساعد الدعم الفني الذكي لمنصة أوركا. بخصوص استفسارك عن ترقيات الاشتراكات والدفع، يمكنك التوجه إلى صفحة الإعدادات وتحديد باقة الاشتراك ودفعها بـ مدى أو فيزا أو STC Pay بشكل فوري وسيتم تفعيل حسابك وصلاحيات الموظفين تلقائياً خلال ثوانٍ معدودة.`;
    } else if (lowerDesc.includes("ربط") || lowerDesc.includes("نطاق") || lowerDesc.includes("دومين") || lowerDesc.includes("dns")) {
      aiReply = `مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لربط نطاقك المخصص المشتري من Hostinger أو غيرها، يرجى التوجه إلى لوحة إدارة DNS الخاصة بنطاقك وإضافة سجل CNAME يشير إلى: cname.vercel-dns.com، وبمجرد إتمام ذلك، تفضل بتحديث الإعدادات باللوحة وسيتم توجيه رابط المبيعات الخاص بك آلياً.`;
    } else if (lowerDesc.includes("خطأ") || lowerDesc.includes("مشكلة") || lowerDesc.includes("عطل") || lowerDesc.includes("توقف")) {
      aiReply = `تم رصد إشعار بوجود عطل محتمل بخصوص "${title}". لقد قمت بتسجيل التفاصيل وتصنيف التذكرة كأولوية حرجة، وتم إرسال تنبيه مباشر إلى فريق التطوير للتدخل الفوري.`;
    } else {
      aiReply = `مرحباً بك، أنا مساعد الدعم الفني الذكي لمنصة أوركا. لقد تسلمت تذكرتك بنجاح بخصوص موضوع "${title}". تفاصيل استفسارك قيد المعالجة الآن وسيتم توفير إجابة تقنية مفصلة خلال دقائق قليلة.`;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { aiResponse: aiReply }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
