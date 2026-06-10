// lib/agents/khabeer.ts
// 🤖 وكيل خبير (Khabeer) — المساعدة القانونية والامتثال العقاري
// مبني على Gemini Flash — نفس نمط ساهر

import {
  KHABEER_SYSTEM_PROMPT,
  buildKhabeerSystemPrompt,
  type KhabeerOutput,
} from "./khabeerPrompt";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function callGeminiForKhabeer(
  systemPrompt: string,
  userQuestion: string,
  retryCount = 0
): Promise<KhabeerOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.error("[خبير] مفتاح Gemini API غير موجود");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `سؤال قانوني / امتثالي جديد يحتاج إجابة:\n\n${userQuestion}\n\nأعطني الإجابة بصيغة JSON نظيفة فقط دون أي نص إضافي. تأكد من تضمين إخلاء المسؤولية القانونية.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      const statusCode = response.status;

      if (retryCount < MAX_RETRIES && (statusCode >= 500 || statusCode === 429)) {
        console.warn(`[خبير] API غير متاح (${statusCode})، إعادة المحاولة ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
        return callGeminiForKhabeer(systemPrompt, userQuestion, retryCount + 1);
      }

      throw new Error(`Gemini API Error: ${statusCode} — ${err}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const cleanJson = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson) as KhabeerOutput;

    if (!parsed.disclaimer_included) {
      parsed.reply_ar =
        "تنبيه: هذه المعلومات استشارية عامة وليست استشارة قانونية ملزمة. يُنصح بمراجعة محامٍ مرخص.\n\n" +
        parsed.reply_ar;
      parsed.disclaimer_included = true;
    }

    return parsed;
  } catch (error: any) {
    if (retryCount < MAX_RETRIES && error.name === "AbortError") {
      console.warn(`[خبير] انتهت مهلة الطلب، إعادة المحاولة ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
      return callGeminiForKhabeer(systemPrompt, userQuestion, retryCount + 1);
    }

    console.error("[خبير] خطأ في استدعاء Gemini:", error);
    return null;
  }
}

const fallbackResponses: Record<string, string> = {
  zatca: "بحسب متطلبات هيئة الزكاة والضريبة والجمارك (زاتكا)، يجب أن تتضمن الفاتورة الإلكترونية: الرقم الضريبي، رمز QR، التوقيع الإلكتروني، وإرسالها لمنصة فاتورة. نسبة ضريبة القيمة المضافة 15% على العقارات التجارية. للمزيد من التفاصيل الدقيقة، أنصح بالتواصل مع مستشار ضريبي معتمد.",
  ejar: "نظام إيجار هو منصة إلكترونية تابعة لوزارة الإسكان لتوثيق عقود الإيجار. يجب تسجيل جميع عقود الإيجار السكنية والتجارية في شبكة إيجار. العقود المسجلة تعتبر سندات تنفيذية. للتفاصيل القانونية الدقيقة، يفضل استشارة محامٍ متخصص.",
  contract: "العقد العقاري يجب أن يتضمن: وصف العقار بدقة، الثمن، آلية الدفع، تاريخ التسليم، والضمانات. الضمان القانوني للعيوب الإنشائية في السعودية هو 10 سنوات. هذه معلومات عامة — للمسائل التعاقدية المحددة، استشر محامياً.",
  default: "شكراً لاستفسارك. هذا السؤال يتطلب معرفة قانونية متخصصة. أنصحك بالتواصل مع مستشار قانوني معتمد للحصول على إجابة دقيقة وملزمة. يمكنني مساعدتك في جوانب أخرى من منصة ORCA.",
};

function getFallbackResponse(question: string): KhabeerOutput {
  const q = question.toLowerCase();
  let topic: KhabeerOutput["topic"] = "GENERAL_LEGAL";
  let reply = fallbackResponses.default;

  if (q.includes("زكاة") || q.includes("زاتكا") || q.includes("ضريبة") || q.includes("فاتورة")) {
    topic = "ZATCA_COMPLIANCE";
    reply = fallbackResponses.zatca;
  } else if (q.includes("إيجار") || q.includes("تسجيل") || q.includes("وزارة الإسكان")) {
    topic = "LEASE_AGREEMENT";
    reply = fallbackResponses.ejar;
  } else if (q.includes("عقد") || q.includes("تعاقد") || q.includes("ضمان") || q.includes("بند")) {
    topic = "CONTRACT_TERMS";
    reply = fallbackResponses.contract;
  }

  return {
    reply_ar: reply,
    topic,
    references: [],
    disclaimer_included: true,
    needs_human_lawyer: true,
    confidence: 0.5,
  };
}

export async function askKhabeer(
  companyName: string,
  question: string
): Promise<{ output: KhabeerOutput; isAI: boolean }> {
  const systemPrompt = buildKhabeerSystemPrompt({ companyName });

  try {
    const aiResult = await callGeminiForKhabeer(systemPrompt, question);
    if (aiResult) {
      return { output: aiResult, isAI: true };
    }
  } catch (error) {
    console.error("[خبير] فشل استدعاء Gemini، استخدام الرد الاحتياطي:", error);
  }

  const fallback = getFallbackResponse(question);
  return { output: fallback, isAI: false };
}

export { KHABEER_SYSTEM_PROMPT };
