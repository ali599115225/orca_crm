'use server';
import { PrismaClient, LeadStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function fetchLeads(tenantId: string) {
  try { return await prisma.lead.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }); } 
  catch (error) { return []; }
}

export async function createLead(data: any) {
  try {
    const newLead = await prisma.lead.create({ data: { ...data, leadScore: Math.floor(Math.random() * 40) + 40 } });
    revalidatePath('/leads');
    return { success: true, lead: newLead };
  } catch (error) { return { success: false, error }; }
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  try {
    const updatedLead = await prisma.lead.update({ where: { id }, data: { status } });
    revalidatePath('/leads');
    return { success: true, lead: updatedLead };
  } catch (error) { return { success: false, error }; }
}

// 🧠 المحرك الذكي الحقيقي (المضاد للأخطاء)
export async function generateAIInsight(lead: any) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { insight: "مفتاح API غير متوفر في ملف .env", message: "لا يوجد اتصال." };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      أنت مستشار مبيعات عقارية محترف تعمل في منصة ORCA CRM في السعودية.
      لديك عميل محتمل بهذه البيانات:
      - الاسم: ${lead.firstName}
      - المدينة: ${lead.city}
      - مصدر العميل: ${lead.source}
      - نقاط التقييم (من 100): ${lead.leadScore}
      - المرحلة الحالية: ${lead.status}

      المطلوب منك شيئين فقط، ويجب أن يكون الرد بصيغة JSON حصراً بهذا التنسيق:
      {
        "insight": "نصيحة استراتيجية قصيرة (سطرين كحد أقصى) لمندوب المبيعات حول كيفية التعامل مع هذا العميل لإغلاق الصفقة بنجاح.",
        "message": "رسالة واتساب احترافية، ودودة، ومقنعة (بدون استخدام رموز تعبيرية كثيرة) جاهزة للإرسال للعميل، تعتمد على مدينته ومصدره."
      }
      يجب أن يكون الرد باللغة العربية.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // 🛡️ طريقة مضادة للرصاص: استخراج ما بين الأقواس فقط
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("لم يقم الذكاء الاصطناعي بإرجاع JSON صالح");
    }

    const cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
    const aiData = JSON.parse(cleanJson);

    return { insight: aiData.insight, message: aiData.message };

  } catch (error) {
    console.error("AI Error:", error);
    return {
      insight: "حدث خطأ أثناء تحليل البيانات. يرجى التأكد من صحة مفتاح API أو المحاولة لاحقاً.",
      message: "أهلاً بك، كيف يمكنني مساعدتك؟"
    };
  }
}
