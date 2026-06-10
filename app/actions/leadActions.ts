'use server';
import { prisma } from "@/lib/prisma";
import { revalidatePath } from 'next/cache';
import { getActiveTenant } from "@/lib/tenant";
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Lead, LeadStatus } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function fetchLeads() {
  try {
    const tenant = await getActiveTenant();
    return await prisma.lead.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } });
  } catch { return []; }
}

export async function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'leadActivities' | 'tasks' | 'mansourChats'>) {
  try {
    const tenant = await getActiveTenant();
    const { tenantId: _, ...safeData } = data as any;
    const newLead = await prisma.lead.create({ data: { ...safeData, tenantId: tenant.id, leadScore: Math.floor(Math.random() * 40) + 40 } });
    revalidatePath('/leads');
    return { success: true, lead: newLead };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء العميل المحتمل";
    return { success: false, error: message };
  }
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  try {
    const tenant = await getActiveTenant();
    const updatedLead = await prisma.lead.update({ where: { id, tenantId: tenant.id }, data: { status } });
    revalidatePath('/leads');
    return { success: true, lead: updatedLead };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تحديث حالة العميل";
    return { success: false, error: message };
  }
}

interface AIInsightLead {
  firstName: string;
  city: string;
  source: string;
  leadScore: number;
  status: string;
}

export async function generateAIInsight(lead: AIInsightLead) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { insight: "مفتاح API غير متوفر في ملف .env", message: "لا يوجد اتصال." };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      أنت مستشار مبيعات عقارية محترف تعمل في منصة ORCA في السعودية.
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
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("لم يقم الذكاء الاصطناعي بإرجاع JSON صالح");
    }

    const cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
    const aiData = JSON.parse(cleanJson) as { insight: string; message: string };

    return { insight: aiData.insight, message: aiData.message };

  } catch (error: unknown) {
    console.error("AI Error:", error);
    return {
      insight: "حدث خطأ أثناء تحليل البيانات. يرجى التأكد من صحة مفتاح API أو المحاولة لاحقاً.",
      message: "أهلاً بك، كيف يمكنني مساعدتك؟"
    };
  }
}
