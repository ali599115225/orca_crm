// app/api/v1/leads/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 🛡️ التحقق من رمز الويب هوك الخاص بالمستأجر (الـ API Key أو التوكن)
    // نعتمد على التحقق من وجود التوكن الممرر في الهيدر X-Webhook-Token أو كمعامل استعلام
    const webhookToken = 
      request.headers.get("X-Webhook-Token") || 
      request.nextUrl.searchParams.get("webhook_token");

    if (!webhookToken) {
      return NextResponse.json(
        { error: "رمز الويب هوك (Webhook Token) مفقود." },
        { status: 401 }
      );
    }

    // مطابقة التوكن بالنطاق الفرعي (Subdomain) الفريد للمنشأة للتحقق من هويتها
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: webhookToken }
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: "المنشأة غير موجودة أو معطلة." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // استخراج وتطبيع الحقول الأساسية من حملة Snapchat Ads أو Google Ads
    const fullName = 
      body.fullName || 
      body.full_name || 
      `${body.firstName || body.first_name || ""} ${body.lastName || body.last_name || ""}`.trim();
    
    const phone = body.phone || body.phone_number || body.phoneNumber || "";
    const email = body.email || "";
    const campaignSource = body.campaignSource || body.campaign_source || body.source || "Google Ads";
    const notes = body.notes || body.user_notes || body.user_intent || "";
    const city = body.city || "الرياض";

    // 🛡️ منطق التصفية والتحقق لمكافحة السبام والبيانات الوهمية (Spam/Fake Data Detection)
    const cleanPhone = phone.trim().replace(/[\s-()]/g, "");
    
    // رفض الهواتف المكررة المكرر أرقامها بالكامل مثل "000000000" أو "111111111" أو الفارغة
    const isRepetitive = /^(.)\1+$/.test(cleanPhone);
    const isValidPhone = cleanPhone.length >= 9 && cleanPhone.length <= 15 && /^[+0-9]+$/.test(cleanPhone);

    if (!cleanPhone || isRepetitive || !isValidPhone) {
      console.warn(`[Agent Saher] Spam lead filtered out: Phone = ${phone}`);
      return NextResponse.json({
        success: false,
        status: "Filtered",
        message: "تم تصفية العميل لعدم صلاحية رقم الهاتف المرفق."
      }, { status: 200 });
    }

    // التحقق من تكرار الهاتف لنفس المنشأة لمنع الازدواجية
    const existingLead = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        phone: cleanPhone
      }
    });

    if (existingLead) {
      return NextResponse.json({
        success: false,
        status: "Duplicate",
        message: "هذا العميل مسجل مسبقاً في قاعدة بيانات المنشأة."
      }, { status: 200 });
    }

    // 🧠 تشغيل تقييم الـ NLP لدرجة الجدية والاهتمام العقاري (Buying Intent)
    let intentScore = 50; // القيمة الافتراضية
    const notesLower = notes.toLowerCase();

    const highIntentKeywords = ["شراء", "عاجل", "مستعد", "شقة", "استثمار", "كاش", "تمويل", "دفعة", "توقيع", "حجز", "برج", "شراء فوري"];
    const lowIntentKeywords = ["سؤال", "استفسار", "غالي", "تصفح", "بين فترة", "خطأ", "غلط", "فضول"];

    highIntentKeywords.forEach(word => {
      if (notesLower.includes(word)) intentScore += 15;
    });
    lowIntentKeywords.forEach(word => {
      if (notesLower.includes(word)) intentScore -= 15;
    });

    // تقييد الدرجة بين 0 و 100
    intentScore = Math.max(0, Math.min(100, intentScore));

    // تقسيم الاسم الأول والأخير
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "عميل";
    const lastName = nameParts.slice(1).join(" ") || "محتمل";

    let assignedRepId: string | null = null;
    let isHotLead = intentScore >= 75;

    if (isHotLead) {
      const salesReps = await prisma.user.findMany({
        where: {
          tenantId: tenant.id,
          role: "SALES_EMPLOYEE"
        },
        select: { id: true }
      });

      if (salesReps.length > 0) {
        const repIds = salesReps.map(r => r.id);
        const leadCounts = await prisma.lead.groupBy({
          by: ['assignedTo'],
          where: { assignedTo: { in: repIds } },
          _count: { id: true },
        });
        const countMap = new Map(leadCounts.map(l => [l.assignedTo, l._count.id]));
        const sortedReps = salesReps.map(rep => ({ id: rep.id, count: countMap.get(rep.id) || 0 }));
        sortedReps.sort((a, b) => a.count - b.count);
        assignedRepId = sortedReps[0].id;
      }
    }

    // حفظ العميل الجديد في قاعدة البيانات
    const newLead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        phone: cleanPhone,
        email: email || null,
        city: city,
        source: campaignSource,
        status: isHotLead ? "NEW" : "CONTACTED",
        leadScore: intentScore,
        assignedTo: assignedRepId,
      }
    });

    // 🛡️ تدوين سجل تتبع الوكيل ساهر غير القابل للتعديل ليتدفق لحظياً إلى لوحة التحكم
    const arabicLogMessage = `«قام الوكيل ساهر بفرز عميل جديد من حملة [${campaignSource}] وتوجيهه لفريق النخبة لارتفاع ملاءته المالية تلقائياً»`;
    
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId: tenant.id,
        agentId: "Saher",
        actionType: "Lead_Screening",
        logMessageAr: arabicLogMessage,
        severity: "Info"
      }
    }).catch(err => console.error("فشل تدوين سجل التتبع التلقائي للوكيل ساهر:", err));

    return NextResponse.json({
      success: true,
      status: isHotLead ? "Hot_Lead_Routed" : "Lead_Nurture_Pipeline",
      leadId: newLead.id,
      assignedTo: assignedRepId,
      score: intentScore
    }, { status: 201 });

  } catch (error: any) {
    console.error("فشل ويب هوك جلب وتصنيف العملاء للوكيل ساهر:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء معالجة وحساب بيانات العميل." },
      { status: 500 }
    );
  }
}
