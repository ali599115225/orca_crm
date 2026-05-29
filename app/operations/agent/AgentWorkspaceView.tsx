// app/operations/agent/AgentWorkspaceView.tsx
'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';
import { updateLeadStatusAction } from '@/app/actions/leads';

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  city: string;
  source: string;
  status: string;
  leadScore: number;
  createdAt: string;
  project: { name: string } | null;
}

interface AgentWorkspaceViewProps {
  initialLeads: Lead[];
  userId: string;
  userName: string;
}

const STATUS_PIPELINE = [
  { key: 'NEW', labelAr: 'طلبات استثمارية واردة', labelEn: 'Incoming Investment Requests', next: 'CONTACTED', style: 'border-sky-500 bg-sky-500/5 text-sky-600' },
  { key: 'CONTACTED', labelAr: 'قيد التأهيل الدبلوماسي', labelEn: 'Diplomatic Qualification Phase', next: 'VISIT_SCHEDULED', style: 'border-indigo-500 bg-indigo-500/5 text-indigo-600' },
  { key: 'VISIT_SCHEDULED', labelAr: 'معاينة الموقع الميدانية', labelEn: 'Site Inspection Phase', next: 'RESERVED', style: 'border-amber-500 bg-amber-500/5 text-amber-600' },
  { key: 'RESERVED', labelAr: 'تخصيص الوحدة والعربون', labelEn: 'Asset Allocation & Deposit', next: 'CONTRACT_SIGNED', style: 'border-emerald-500 bg-emerald-500/5 text-emerald-600' },
  { key: 'CONTRACT_SIGNED', labelAr: 'إقفال الصفقة والتوثيق', labelEn: 'Deal Closure & Registration', next: null, style: 'border-teal-500 bg-teal-500/5 text-teal-600' },
];

const MOCK_AGENT_LEADS = (userId: string) => [
  {
    id: "mock-agent-lead-1",
    firstName: "أ. عبد الرحمن",
    lastName: "السديري",
    phone: "0505432109",
    city: "الرياض",
    source: "Snapchat Ads",
    status: "NEW",
    leadScore: 92,
    createdAt: new Date().toISOString(),
    project: { name: "برج النخبة السكني" }
  },
  {
    id: "mock-agent-lead-2",
    firstName: "أ. منيرة",
    lastName: "الماجد",
    phone: "0555234567",
    city: "جدة",
    source: "Google Ads",
    status: "CONTACTED",
    leadScore: 78,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    project: { name: "فلل الياسمين الفاخرة" }
  },
  {
    id: "mock-agent-lead-3",
    firstName: "م. عبد الله",
    lastName: "الفوزان",
    phone: "0566890123",
    city: "الرياض",
    source: "Meta Ads",
    status: "VISIT_SCHEDULED",
    leadScore: 85,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    project: { name: "برج النخبة السكني" }
  },
  {
    id: "mock-agent-lead-4",
    firstName: "أ. فيصل",
    lastName: "بن فهد",
    phone: "0544123456",
    city: "الدمام",
    source: "TikTok Ads",
    status: "RESERVED",
    leadScore: 64,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    project: { name: "مجمع النخبة العقاري" }
  }
];

const TRANSLATIONS = {
  AR: {
    title: "مساحة العمل الاستشارية العقارية",
    subtitle: "متابعة صفقاتك النشطة وتصنيفات الملاءة المالية المدعومة بالذكاء الاصطناعي للمستشار {name}",
    rankTitle: "الترتيب الحالي في المنشأة",
    rankValue: "المركز الثاني (#٢)",
    activeLeadsTitle: "طلباتي النشطة قيد المتابعة",
    activeLeadsUnit: "عملاء",
    crTitle: "معدل إغلاق صفقاتي الشخصي (CR)",
    crValue: "٪٢٢.٥",
    responseTimeTitle: "متوسط سرعة استجابتي للعملاء",
    responseTimeValue: "١٢ دقيقة",
    copilotTitle: "مساعد ساهر الذكي (Saher Copilot Helper)",
    copilotRecommends: "توصية عاجلة من الوكيل ساهر:",
    copilotLead: "المستثمر المستهدف:",
    copilotHighScore: "الملاءة والاهتمام: عالية جداً ({score}٪)",
    copilotMsg: "«ساهر يوصي: اتصل بالعميل {name} الآن. تم فحص الملاءة المالية وهي عالية جداً ({score}٪)، ويبدي اهتماماً كبيراً بالحجز الفوري في {project}.»",
    callBtn: "اتصال هاتفي سريع 📞",
    whatsappBtn: "مراسلة فورية 💬",
    kanbanTitle: "مساري الاستثماري الخاضع للفرز (My Active Leads Pipeline)",
    awaitingLeads: "لا توجد طلبات جديدة معلقة حالياً ✨",
    nextBtn: "التالي ➔",
    processingBtn: "جاري...",
    scoreLabel: "درجة الجدية الاستثمارية:",
    cityLabel: "المدينة:"
  },
  EN: {
    title: "Real Estate Consultant Workspace",
    subtitle: "Track your active leads and AI-powered solvency assessments for consultant {name}",
    rankTitle: "Current Rank in Organization",
    rankValue: "Rank 2 (#2)",
    activeLeadsTitle: "My Active Leads Under Follow-up",
    activeLeadsUnit: "Leads",
    crTitle: "My Personal Deal Closure Rate (CR)",
    crValue: "22.5%",
    responseTimeTitle: "Avg Customer Response Time",
    responseTimeValue: "12 mins",
    copilotTitle: "Saher AI Copilot Helper",
    copilotRecommends: "Urgent action recommended by Agent Saher:",
    copilotLead: "Target Investor:",
    copilotHighScore: "Solvency & Intent: Very High ({score}%)",
    copilotMsg: "«Saher recommends: Call the client {name} now. Solvency check has been completed and is very high ({score}%), with a preference for cash payment for the unit in {project}.»",
    callBtn: "Quick Call 📞",
    whatsappBtn: "Send WhatsApp message 💬",
    kanbanTitle: "My Active Leads Pipeline",
    awaitingLeads: "No pending active leads at this moment ✨",
    nextBtn: "Next ➔",
    processingBtn: "Processing...",
    scoreLabel: "Investor Intent Score:",
    cityLabel: "City:"
  }
};

export default function AgentWorkspaceView({ initialLeads, userId, userName }: AgentWorkspaceViewProps) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [leads, setLeads] = useState<Lead[]>(initialLeads.length > 0 ? initialLeads : MOCK_AGENT_LEADS(userId));
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // تطبيق قناع حماية الجوال للأرقام السيادية
  const formatPhoneMask = (phone: string): string => {
    if (!phone) return "";
    let clean = phone.replace(/\s+/g, "");
    if (lang === 'EN') {
      if (clean.startsWith("05")) {
        return "05" + "x".repeat(8);
      }
      if (clean.startsWith("+9665")) {
        return "+9665" + "x".repeat(8);
      }
      return clean.substring(0, 2) + "x".repeat(Math.max(4, clean.length - 2));
    }
    let converted = toArabicNumerals(clean);
    if (converted.startsWith("٠٥") || converted.startsWith("05")) {
      return "٠٥" + "×".repeat(8);
    }
    if (converted.startsWith("+٩٦٦٥") || converted.startsWith("+9665")) {
      return "+٩٦٦٥" + "×".repeat(8);
    }
    return converted.substring(0, 2) + "×".repeat(Math.max(4, converted.length - 2));
  };

  const handleMoveToNextStep = async (leadId: string, currentStatus: string, nextStatus: string) => {
    setUpdatingId(leadId);
    const result = await updateLeadStatusAction(leadId, nextStatus);
    setUpdatingId(null);
    if (result.success) {
      setLeads(prevLeads => 
        prevLeads.map(lead => lead.id === leadId ? { ...lead, status: nextStatus } : lead)
      );
    }
  };

  // تحديد العميل الأهم بناء على درجة اهتمامه الأعلى وساهر
  const activeFollowUps = leads.filter(l => l.status !== 'CONTRACT_SIGNED');
  const topLead = activeFollowUps.length > 0 
    ? [...activeFollowUps].sort((a, b) => b.leadScore - a.leadScore)[0]
    : leads[0];

  const topLeadName = topLead ? `${topLead.firstName} ${topLead.lastName || ''}`.trim() : '';
  const topLeadProject = topLead?.project?.name || (lang === 'AR' ? 'برج النخبة' : 'Elite Tower');

  const isDark = theme === 'dark';

  return (
    <div className={`agent-workspace-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* خط Cairo/Inter وتنسيق السمة والـ layout */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          letter-spacing: normal !important;
        }
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          letter-spacing: normal !important;
        }
        
        .agent-workspace-wrapper {
          margin: -1.5rem -1.5rem -2rem -1.5rem;
          padding: 1.5rem 1.5rem 2rem 1.5rem;
          min-height: calc(100vh - 4rem);
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        @media (min-width: 768px) {
          .agent-workspace-wrapper {
            margin: -2rem -2rem -2rem -2rem;
            padding: 2rem 2rem 2rem 2rem;
          }
        }

        .dark-canvas {
          background-color: #0b0f19 !important;
          color: #ffffff !important;
        }
        
        .light-canvas {
          background-color: #f9f9fb !important;
          color: #0b0f19 !important;
        }

        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
      `}} />

      {/* ترويسة الصفحة */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      }`}>
        <div className={lang === 'AR' ? 'text-right' : 'text-left'}>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.subtitle.replace('{name}', userName)}
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 text-center border ${
          isDark 
            ? 'bg-[#735334]/20 text-[#E6C687] border-[#735334]/40 shadow-[0_0_15px_rgba(115,83,52,0.2)]' 
            : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20 shadow-sm'
        }`}>
          {lang === 'AR' ? 'حساب مستشار عقاري نشط' : 'Active Real Estate Agent Workspace'}
        </div>
      </div>

      {/* 1. لوحة الكفاءة الفردية (Personalized Performance Strip) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* كارت 1: الترتيب الحالي في المنشأة */}
        <div className={`border p-5 rounded-2xl transition-all duration-300 ${
          isDark ? 'frosted-glass-dark border-[#735334]/30' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-bold text-gray-500`}>{t.rankTitle}</p>
          <p className={`text-xl font-black mt-2 ${isDark ? 'text-white' : 'text-[#735334]'}`}>
            {lang === 'AR' ? t.rankValue : 'Rank 2 (#2)'}
          </p>
        </div>

        {/* كارت 2: طلباتي النشطة قيد المتابعة */}
        <div className={`border p-5 rounded-2xl transition-all duration-300 ${
          isDark ? 'frosted-glass-dark border-[#735334]/30' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-bold text-gray-500`}>{t.activeLeadsTitle}</p>
          <p className={`text-xl font-black mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {toArabicNumerals(leads.length)} {t.activeLeadsUnit}
          </p>
        </div>

        {/* كارت 3: معدل إغلاق صفقاتي الشخصي */}
        <div className={`border p-5 rounded-2xl transition-all duration-300 ${
          isDark ? 'frosted-glass-dark border-[#735334]/30' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-bold text-gray-500`}>{t.crTitle}</p>
          <p className={`text-xl font-black mt-2 ${isDark ? 'text-amber-400' : 'text-[#735334]'}`}>
            {toArabicNumerals(t.crValue)}
          </p>
        </div>

        {/* كارت 4: متوسط سرعة استجابتي للعملاء */}
        <div className={`border p-5 rounded-2xl transition-all duration-300 ${
          isDark ? 'frosted-glass-dark border-[#735334]/30' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-bold text-gray-500`}>{t.responseTimeTitle}</p>
          <p className={`text-xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {lang === 'AR' ? t.responseTimeValue : '12 mins'}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* لوحة الكانبان المقيدة للمستشار */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          }`}>
            <h3 className={`font-black text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {t.kanbanTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-4">
            {STATUS_PIPELINE.map((column) => {
              const columnLeads = leads.filter((l) => l.status === column.key);
              const columnLabel = lang === 'AR' ? column.labelAr : column.labelEn;
              return (
                <div 
                  key={column.key} 
                  className={`rounded-xl p-3 flex flex-col space-y-3 min-w-[180px] border ${
                    isDark ? 'bg-black/30 border-white/5 shadow-inner' : 'bg-slate-100 border-slate-200 shadow-sm'
                  }`}
                >
                  {/* هيدر العمود */}
                  <div className={`p-2 rounded-lg border shadow-sm flex items-center justify-between text-[10px] font-black ${
                    isDark ? 'bg-[#111726]/85 border-white/5 text-[#E6C687]' : 'bg-white border-slate-200 text-[#735334]'
                  }`}>
                    <span className="truncate">{columnLabel}</span>
                    <span className="bg-slate-900/40 text-slate-300 px-1.5 py-0.5 rounded text-[8px]">
                      {toArabicNumerals(columnLeads.length)}
                    </span>
                  </div>

                  {/* بطاقات العملاء */}
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[380px] min-h-[150px]">
                    {columnLeads.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-3 text-center text-slate-500 font-bold text-[9px] border border-dashed border-slate-800/20 rounded-lg">
                        {t.awaitingLeads}
                      </div>
                    ) : (
                      columnLeads.map((lead) => {
                        let badgeStyle = "";
                        if (lead.leadScore >= 75) {
                          badgeStyle = "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400";
                        } else if (lead.leadScore >= 40) {
                          badgeStyle = "bg-blue-500/20 border border-blue-500/30 text-blue-400";
                        } else {
                          badgeStyle = "bg-rose-500/20 border border-rose-500/30 text-rose-400";
                        }

                        return (
                          <div 
                            key={lead.id} 
                            className={`p-3 rounded-lg border space-y-2 text-xs transition-all ${
                              isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                            } ${lang === 'AR' ? 'text-right' : 'text-left'}`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-extrabold text-[11px] truncate">
                                {lead.firstName} {lead.lastName || ''}
                              </h4>
                              <span className={`px-1 rounded text-[8px] tracking-wide shrink-0 ${badgeStyle}`}>
                                {toArabicNumerals(lead.leadScore)}٪
                              </span>
                            </div>

                            <p className="text-[9px] text-slate-400 font-semibold" dir="ltr">
                              {formatPhoneMask(lead.phone)}
                            </p>

                            {lead.project && (
                              <div className="text-[9px] border p-1 rounded font-bold truncate bg-slate-950/20 border-white/5">
                                🎯 {lead.project.name}
                              </div>
                            )}

                            <div className="flex justify-between text-[8px] text-slate-500 pt-1 border-t border-white/5">
                              <span>{t.cityLabel} {lead.city}</span>
                            </div>

                            {column.next && (
                              <button 
                                disabled={updatingId === lead.id}
                                onClick={() => handleMoveToNextStep(lead.id, column.key, column.next!)}
                                className={`w-full text-[9px] font-bold p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                                  isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                }`}
                              >
                                {updatingId === lead.id ? t.processingBtn : t.nextBtn}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* لوحة ساهر للمساعدة والذكاء الاصطناعي (AI Copilot Integration Layout) */}
        <div className="space-y-4">
          
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          }`}>
            <h3 className={`font-black text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {t.copilotTitle}
            </h3>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          </div>

          {topLead ? (
            <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-300 ${
              isDark ? 'frosted-glass-dark border-[#735334]/40' : 'milky-glass-light'
            } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
              
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                  {t.copilotRecommends}
                </p>
                <h4 className="text-sm font-black mt-1.5">
                  {t.copilotLead} {topLeadName}
                </h4>
                <span className="text-[9px] font-bold bg-[#735334]/20 text-[#E6C687] border border-[#735334]/30 px-2 py-0.5 rounded-full inline-block mt-1">
                  {t.copilotHighScore.replace('{score}', toArabicNumerals(topLead.leadScore))}
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border leading-relaxed text-[11px] font-semibold ${
                isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {t.copilotMsg.replace('{name}', topLeadName).replace('{score}', toArabicNumerals(topLead.leadScore)).replace('{project}', topLeadProject)}
              </div>

              <div className="space-y-2">
                <a 
                  href={`tel:${topLead.phone}`}
                  className={`w-full text-[10px] font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] text-white ${
                    isDark ? 'bg-[#735334] hover:bg-[#5f4229]' : 'bg-[#735334] hover:bg-[#4a3520]'
                  }`}
                >
                  {t.callBtn}
                </a>

                <a 
                  href={`https://wa.me/${topLead.phone}`}
                  target="_blank"
                  className={`w-full text-[10px] font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] bg-emerald-600 hover:bg-emerald-700 text-white`}
                >
                  {t.whatsappBtn}
                </a>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-bold text-xs">
              {t.awaitingLeads}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
