// app/api/v1/ai/lead-score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { leadId, note } = body;

    let score = 50;
    const textToAnalyze = note || "";

    const positiveCues = ["شراء", "عاجل", "تمويل", "دفعة", "مستعد", "استثمار", "توقيع", "حجز", "جاهز"];
    const negativeCues = ["سؤال", "استفسار", "تصفح", "بين فترة", "غالي", "خطأ", "غلط", "فضول"];

    positiveCues.forEach(cue => {
      if (textToAnalyze.includes(cue)) score += 15;
    });
    negativeCues.forEach(cue => {
      if (textToAnalyze.includes(cue)) score -= 15;
    });

    score = Math.max(0, Math.min(100, score));

    if (leadId) {
      await prisma.lead.updateMany({
        where: { id: leadId, tenantId },
        data: { leadScore: score, score },
      });
    }

    return NextResponse.json({ success: true, score, explanation: `تحليل النية العقارية أظهر درجة جدية تبلغ ${score}٪ بناءً على المحتوى.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
