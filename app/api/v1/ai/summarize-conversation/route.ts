// app/api/v1/ai/summarize-conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { chatLog } = body;

    if (!chatLog) {
      return NextResponse.json({ error: "سجل المحادثة (chatLog) مطلوب." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        summaryAr: "ملخص المحادثة غير متاح حالياً — Gemini API غير مفعل.",
        summaryEn: "Conversation summary unavailable — Gemini API not configured.",
        status: "PARTIAL",
        extractedDetails: null,
      });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: "أنت مساعد تلخيص محادثات عقارية. لخص المحادثة بالعربية والإنجليزية وأعطني النتيجة بصيغة JSON تحتوي على: summaryAr, summaryEn, extractedDetails { interest, locationPreference, budgetMentioned }." }],
            },
            contents: [
              { role: "user", parts: [{ text: `لخص المحادثة التالية:\n\n${JSON.stringify(chatLog)}` }] },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: "application/json" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

      return NextResponse.json({
        success: true,
        summaryAr: parsed.summaryAr || "",
        summaryEn: parsed.summaryEn || "",
        status: "READY",
        extractedDetails: parsed.extractedDetails || null,
      });
    } catch {
      return NextResponse.json({
        success: true,
        summaryAr: "عذراً، تعذر تلخيص المحادثة حالياً. يرجى المحاولة لاحقاً.",
        summaryEn: "Sorry, unable to summarize conversation at this time.",
        status: "PARTIAL",
        extractedDetails: null,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
