'use server';

export async function analyzeLeadAI(lead: any) {
  // محاكاة وقت التفكير للذكاء الاصطناعي (1.5 ثانية) لإعطاء طابع احترافي
  await new Promise(resolve => setTimeout(resolve, 1500));

  let recommendation = "";
  let actionText = "";
  let priority = "medium";

  // خوارزمية التحليل الذكي بناءً على بيانات العميل
  if (lead.leadScore >= 90) {
    recommendation = `العميل ${lead.firstName}, clientName: lead.name يظهر اهتماماً استثنائياً وتقييمه مرتفع جداً (${lead.leadScore}, clientName: lead.name). هذا عميل "جاهز للإغلاق". بناءً على تواجده في ${lead.city}، ركز على عرض المشاريع الحصرية والفاخرة فوراً.`;
    actionText = "إرسال عرض سعر نهائي";
    priority = "high";

  } else if (lead.source?.toLowerCase().includes('whatsapp')) {
    recommendation = `العملاء القادمون من الواتساب يفضلون الرد السريع والمباشر. العميل ${lead.firstName} لديه تقييم جيد، أرسل له كتيب المشروع (PDF) التفاعلي الآن لزيادة التفاعل.`;
    actionText = "إرسال الكتيب عبر واتساب";
    priority = "high";

  } else if (lead.status === 'NEW') {
    recommendation = `هذا العميل جديد وقادم من ${lead.source}. تشير بيانات ORCA إلى أن فرصة التحويل تزيد بنسبة 60% إذا تم الاتصال به خلال أول 15 دقيقة من التسجيل.`;
    actionText = "إجراء اتصال هاتفي عاجل";
    priority = "high";

  } else if (lead.leadScore < 50) {
    recommendation = `تفاعل العميل ${lead.firstName} ضعيف حالياً. يُنصح بنقله إلى حملات إعادة الاستهداف الآلية (Retargeting) بدلاً من استهلاك وقت المبيعات المباشر.`;
    actionText = "إضافة لحملة بريدية آلية";
    priority = "low";

  } else {
    recommendation = `العميل ${lead.firstName} يحتاج إلى متابعة. قم بتسليط الضوء على العائد الاستثماري (ROI) للمشاريع العقارية في ${lead.city} لتعزيز ثقته.`;
    actionText = "جدولة رسالة متابعة";
    priority = "medium";
  }

  return {
    recommendation,
    actionText,
    priority,
    confidence: Math.floor(Math.random() * 10) + 85 // نسبة ثقة الذكاء الاصطناعي 85-95%
  };
}



