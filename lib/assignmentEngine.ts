// محرك التوزيع التلقائي (Enterprise Routing Rules)

// دالة تقييم العملاء الافتراضية
export const calculateLeadScore = (lead: any): number => {
  let score = 50;
  if (lead.city === 'الرياض') score += 15;
  if (Number(lead.budget) > 1000000) score += 20;
  return Math.min(score, 100);
};

// قائمة المندوبين الافتراضية
const currentAgents: any[] = [
  { name: "أحمد", specialty: "الرياض", status: "online", level: "senior", currentLeads: 5 },
  { name: "سارة", specialty: "جدة", status: "online", level: "junior", currentLeads: 2 }
];

export const assignLeadToAgent = (lead: any, agents: any[]) => {
  
  // 1. قاعدة: التوزيع حسب المدينة
  if (lead.city === 'الرياض') {
    return agents.find(agent => agent.specialty === 'الرياض' && agent.status === 'online');
  }

  // 2. قاعدة: التوزيع حسب الميزانية (High-Value Leads)
  if (Number(lead.budget) > 5000000) {
    return agents.find(agent => agent.level === 'senior');
  }

  // 3. قاعدة: التوزيع المتوازن (Round Robin) - في حال لم تطبق القواعد أعلاه
  return agents.sort((a, b) => a.currentLeads - b.currentLeads)[0];
};

// وظيفة الأتمتة عند وصول عميل جديد
export const handleNewLead = async (lead: any) => {
  console.log("🚀 جاري معالجة عميل جديد وتحليل البيانات...");
  
  // 1. تقييم العميل (AI Scoring)
  const score = calculateLeadScore(lead); 
  
  // 2. توزيع العميل تلقائياً
  const assignedAgent = assignLeadToAgent(lead, currentAgents);
  
  return { ...lead, assignedAgent, score };
};
