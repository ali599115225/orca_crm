// محرك المتابعة التلقائية (Auto-Followup)

// محاكاة واجهة الواتساب
const mockWhatsAppAPI = {
  send: async (phone: string, message: string) => {
    console.log(`[Mock WhatsApp API] Sent to ${phone}: ${message}`);
    return { success: true };
  }
};

// محاكاة إضافة مهمة للمندوب
const addTaskToAgent = async (agentId: string, title: string, time: string) => {
  console.log(`[Mock Task System] Added task for agent ${agentId}: ${title} at ${time}`);
  return { success: true };
};

export const sendWelcomeMessage = async (lead: any, agent: any) => {
  const interestsText = Array.isArray(lead.interests) ? lead.interests.join(' و ') : 'العقارات';
  const message = `أهلاً ${lead.name}، معك ${agent.name} من ORCA. 
  لقد استلمت اهتمامك بخصوص عقارات ${interestsText}. 
  يسعدني جداً خدمتك. هل يناسبك الاتصال بك في تمام الساعة 5:00 مساءً؟`;

  // محاكاة إرسال رسالة عبر الـ API
  console.log(`📩 جاري إرسال رسالة واتساب للعميل ${lead.name}...`);
  await mockWhatsAppAPI.send(lead.phone, message);
  
  return { status: 'sent', timestamp: new Date() };
};

// تشغيل الأتمتة فور التوزيع
export const triggerAutoFollowup = async (assignedLead: any, agent: any) => {
  if (assignedLead && agent) {
    await sendWelcomeMessage(assignedLead, agent);
    // إضافة تذكير للوكيل في نظام المهام
    await addTaskToAgent(agent.id, `متابعة العميل ${assignedLead.name}`, '5:00 PM');
  }
};
