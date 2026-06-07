// components/views/AgentManagementView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { getAgentLeasesAction, leaseAgentAction } from '@/app/actions/growth';
import { toArabicNumerals as toArabicNumeralsImport, formatCurrency as formatCurrencyImport } from '@/lib/formatters';

interface AgentLease {
  id: string;
  agentId: string;
  startDate: string;
  endDate: string;
  leasePrice: number;
  autoRenewal: boolean;
}

interface AgentManagementViewProps {
  tenantPlan?: string;
  totalLeads?: number;
  totalProjects?: number;
  totalUsers?: number;
}

export default function AgentManagementView({
  tenantPlan = 'basic',
  totalLeads = 0,
  totalProjects = 0,
  totalUsers = 0,
}: AgentManagementViewProps) {
  const { theme, lang } = useApp();
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';
  
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const agentIdParam = searchParams.get('agentId') || 'BASEER';

  const [leases, setLeases] = useState<AgentLease[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [leasingModal, setLeasingModal] = useState<{ isOpen: boolean; agentId: string } | null>(null);
  const [autoRenewalOption, setAutoRenewalOption] = useState(false);
  const [submittingLease, setSubmittingLease] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdownTicks, setCountdownTicks] = useState<Record<string, string>>({});

  const fetchLeases = async () => {
    setLoadingLeases(true);
    const res = await getAgentLeasesAction();
    setLoadingLeases(false);
    if (res.success && res.data) {
      setLeases(res.data as AgentLease[]);
    }
  };

  useEffect(() => {
    fetchLeases();
  }, []);

  useEffect(() => {
    if (actionParam === 'renew-lease' || actionParam === 'lease') {
      setLeasingModal({ isOpen: true, agentId: agentIdParam.toUpperCase() });
    }
  }, [actionParam, agentIdParam]);

  const updateCountdowns = (activeLeases: AgentLease[]) => {
    const ticks: Record<string, string> = {};
    const now = new Date().getTime();

    activeLeases.forEach(l => {
      const end = new Date(l.endDate).getTime();
      const diff = end - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 65));
        
        ticks[l.agentId] = isArabic 
          ? `متبقي ${days} يوم و ${hours} ساعة` 
          : `${days}d ${hours}h left`;
      } else {
        ticks[l.agentId] = isArabic ? "منتهي الصلاحية" : "Expired";
      }
    });

    setCountdownTicks(ticks);
  };

  useEffect(() => {
    if (leases.length === 0) return;
    updateCountdowns(leases);
    const interval = setInterval(() => {
      updateCountdowns(leases);
    }, 30000);
    return () => clearInterval(interval);
  }, [leases, lang]);

  const handleConfirmLease = async () => {
    if (!leasingModal) return;
    setSubmittingLease(true);
    setError(null);
    setSuccess(null);

    const res = await leaseAgentAction({
      agentId: leasingModal.agentId,
      autoRenewal: autoRenewalOption
    });

    setSubmittingLease(false);
    if (res.success) {
      setSuccess(
        isArabic 
          ? `تم تفعيل استئجار الوكيل ${leasingModal.agentId} بنجاح بقيمة ${res.data?.leasePrice} ر.س!` 
          : `Agent ${leasingModal.agentId} leased successfully for ${res.data?.leasePrice} SAR!`
      );
      setLeasingModal(null);
      fetchLeases();
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(res.error || 'Failed to lease agent.');
    }
  };

  // Resolve plan definitions
  const plan = tenantPlan.toLowerCase();

  const getAgentStatus = (agentId: string) => {
    const allowedMap: Record<string, string[]> = {
      enterprise: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      diamond: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      gold: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      professional: ["SAHER", "SANAD", "MANSOUR"],
      pro: ["SAHER", "SANAD", "MANSOUR"],
      silver: ["SAHER", "SANAD", "MANSOUR"],
      basic: ["MANSOUR"]
    };

    const allowed = allowedMap[plan] || allowedMap["basic"];
    if (allowed.includes(agentId)) {
      return { status: "ACTIVE", label: isArabic ? "متاح بالباقة" : "Included in Plan" };
    }

    const lease = leases.find(l => l.agentId === agentId);
    if (lease) {
      const isExpired = new Date(lease.endDate).getTime() < new Date().getTime();
      if (!isExpired) {
        return { status: "LEASED", label: isArabic ? "مستأجر نشط" : "Active Leased" };
      }
      return { status: "EXPIRED", label: isArabic ? "استئجار منتهي" : "Lease Expired" };
    }

    return { status: "LOCKED", label: isArabic ? "مغلق" : "Locked" };
  };

  // Convert numbers to Arabic Eastern numerals if Arabic language is active
  const toArabicNumerals = (num: string | number): string => {
    if (!isArabic) return num.toString();
    return toArabicNumeralsImport(num);
  };

  const formatCurrency = (amount: number): string => {
    return formatCurrencyImport(amount, isArabic ? 'AR' : 'EN');
  };

  // Calculate pricing calculator details
  const getComparisonCalculator = (agentId: string) => {
    const hasLeaseBefore = leases.some(l => l.agentId === agentId);
    const leasePrice = hasLeaseBefore ? 800 : 400;

    let currentPlanPrice = 450;
    let nextPlanPrice = 900;
    let currentPlanName = isArabic ? "الباقة الأساسية" : "Basic Plan";
    let nextPlanName = isArabic ? "الباقة الاحترافية" : "Professional Plan";
    let nextPlanBenefits = isArabic 
      ? "موظفين أكثر (حتى ١٠) ومشاريع أكثر (حتى ١٠) مع وكيلين مفعلين دائماً (ساهر وسند)." 
      : "More staff (up to 10), more projects (up to 10), and 2 permanent agents (Saher & Sanad).";

    if (plan === 'pro' || plan === 'professional' || plan === 'silver') {
      currentPlanPrice = 900;
      nextPlanPrice = 2400;
      currentPlanName = isArabic ? "الباقة الاحترافية" : "Professional Plan";
      nextPlanName = isArabic ? "الباقة الماسية" : "Diamond Plan";
      nextPlanBenefits = isArabic 
        ? "وصول كامل ودائم لجميع الوكلاء الخمسة وإلغاء كافة قيود سعة العمليات والموظفين." 
        : "Permanent access to all 5 virtual agents, and unlimited staff seats/operational limits.";
    }

    const totalCurrentCost = currentPlanPrice + leasePrice;
    const isCloseToUpgrade = totalCurrentCost >= nextPlanPrice;

    return {
      leasePrice,
      currentPlanPrice,
      nextPlanPrice,
      currentPlanName,
      nextPlanName,
      nextPlanBenefits,
      totalCurrentCost,
      isCloseToUpgrade
    };
  };

  return (
    <div className="nc-page nc-stack" dir={dir}>
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#151f32] to-slate-900 border border-[#A7C7E7]/20 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-interactive/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <i className="ph-bold ph-robot"></i> 
              {isArabic ? "مركز التحكم وإدارة الوكلاء" : "AI Agent Management Dashboard"}
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-wide">
              {isArabic ? "إدارة الوكلاء وعقود الاستئجار" : "Virtual Agents Console"}
            </h1>
            <p className="text-xs md:text-sm text-[#C4D8E5] font-medium mt-2 font-medium">
              {isArabic 
                ? "إدارة رخص تشغيل الوكلاء الأذكياء ومراقبة حالة عقود الاستئجار المؤقتة وتوسيع كفاءة المبيعات والحوكمة."
                : "Manage smart agent execution licenses, monitor temporary campaign leases, and scale productivity."}
            </p>
          </div>
          
          {plan !== 'gold' && plan !== 'enterprise' && plan !== 'diamond' && (
            <a
              href="/operations?tab=settings"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-interactive to-brand-interactive-hover hover:shadow-[0_0_20px_rgba(142,177,209,0.35)] text-brand-bg font-bold text-xs transition-all cursor-pointer border border-brand-interactive/45 shrink-0"
            >
              <i className="ph-bold ph-sparkle text-sm"></i>
              <span>{isArabic ? "الترقية للباقة الماسية 💎" : "Upgrade to Diamond Tier 💎"}</span>
            </a>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold shadow-sm">
          {error}
        </div>
      )}

      {/* Agents Grid (Universal layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          {
            id: "SAHER",
            nameAr: "ساهر (بوابة الفحص)",
            nameEn: "Saher (Compliance Gate)",
            descAr: "وكيل الحوكمة والتحقق من صحة العقود وهوية العملاء ومطابقتها للمعايير الحكومية (إيجار وزاتكا).",
            descEn: "Compliance check agent validating tenant credentials, CR database records, and active CSID signatures.",
            icon: "ph-shield-check",
            color: "from-blue-600/25 to-slate-900 border-blue-900/30"
          },
          {
            id: "SANAD",
            nameAr: "سند (طابور العمليات)",
            nameEn: "Sanad (Task Queue Manager)",
            descAr: "وكيل الفوترة والعمليات السحابية المسؤول عن ترحيل المهام، وتحديث الفواتير، والتحذيرات المالية اليومية.",
            descEn: "Background operations manager handling automated invoicing resets, payment checks, and audit logging.",
            icon: "ph-currency-circle-dollar",
            color: "from-emerald-600/25 to-slate-900 border-emerald-900/30"
          },
          {
            id: "BASEER",
            nameAr: "بصير (النمو والتسويق)",
            nameEn: "Baseer (Ad ROI Analytics)",
            descAr: "وكيل التحليل الاستباقي للنمو الذي يتنبأ بالعوائد التسويقية، ويحلل تكلفة الاستحواذ مقابل قيم العقود.",
            descEn: "Strategic analysis agent calculating ROI forecasts, CAC metrics, and multi-channel marketing spend.",
            icon: "ph-chart-pie",
            color: "from-indigo-600/25 to-slate-900 border-indigo-900/30"
          },
          {
            id: "KHABEER",
            nameAr: "خبير (الأتمتة القانونية)",
            nameEn: "Khabeer (Legal Support)",
            descAr: "وكيل صياغة ومراجعة العقود العقارية، وتقديم الدعم الآلي، وتأمين التوقيعات الرقمية للمفوضين.",
            descEn: "Support agent drafting lease contracts, matching properties, and confirming digital disclaimer compliance.",
            icon: "ph-file-text",
            color: "from-purple-600/25 to-slate-900 border-purple-900/30"
          },
          {
            id: "MANSOUR",
            nameAr: "منصور (مسؤول المحادثات)",
            nameEn: "Mansour (Lead Pipeline)",
            descAr: "وكيل التواصل المباشر مع العملاء عبر الواتساب لتأهيل الفرص وحجز مواعيد معاينة المشاريع على الطبيعة.",
            descEn: "Interactive CRM engine automating followups and welcome templates acrossMeta, Google, and TikTok.",
            icon: "ph-whatsapp-logo",
            color: "from-yellow-600/25 to-slate-900 border-yellow-900/30"
          }
        ].map(ag => {
          const statusInfo = getAgentStatus(ag.id);
          const tick = countdownTicks[ag.id];
          
          let badgeColor = "bg-slate-500/10 border-slate-500/20 text-[#C4D8E5] font-medium";
          if (statusInfo.status === 'ACTIVE') badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
          else if (statusInfo.status === 'LEASED') badgeColor = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse";
          else if (statusInfo.status === 'EXPIRED') badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";

          return (
            <div 
              key={ag.id} 
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${ag.color} border p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-[340px] transition-all duration-300 hover:scale-[1.02]`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1C2B48]/50 border border-[#A7C7E7]/20 flex items-center justify-center text-white text-lg">
                    <i className={`ph-fill ${ag.icon}`}></i>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black tracking-wide uppercase ${badgeColor}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <h3 className="text-white font-extrabold text-sm tracking-wide mb-2">
                  {isArabic ? ag.nameAr : ag.nameEn}
                </h3>
                
                <p className="text-[10px] md:text-xs text-[#C4D8E5] font-medium leading-relaxed font-sans">
                  {isArabic ? ag.descAr : ag.descEn}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-850 space-y-3">
                {tick && (
                  <p className="text-[9px] font-mono text-indigo-300 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    {tick}
                  </p>
                )}

                {statusInfo.status === 'ACTIVE' ? (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <i className="ph-bold ph-shield-check text-base"></i>
                    <span>{isArabic ? "مفعل ومتاح بالكامل" : "Fully Available"}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLeasingModal({ isOpen: true, agentId: ag.id })}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      {statusInfo.status === 'LEASED' || statusInfo.status === 'EXPIRED'
                        ? (isArabic ? "تجديد الاستئجار" : "Renew Lease")
                        : (isArabic ? "استئجار الوكيل" : "Lease Agent")
                      }
                    </button>
                    {(plan === 'basic' || plan === 'pro' || plan === 'professional' || plan === 'silver') && (
                      <a
                        href="/operations?tab=settings"
                        className="px-3 py-2 rounded-xl bg-[#1C2B48] hover:bg-slate-700 text-[#C4D8E5] font-medium font-bold text-[10px] text-center cursor-pointer transition-colors"
                      >
                        {isArabic ? "ترقية الباقة" : "Upgrade"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Leasing Config & Comparison Calculator Modal */}
      {leasingModal?.isOpen && (() => {
        const calc = getComparisonCalculator(leasingModal.agentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2B48]/80 backdrop-blur-md">
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-gradient-to-b from-[#151f32] to-[#1C2B48] border border-slate-850 p-6 shadow-2xl animate-scale-up">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <h3 className="text-white font-extrabold text-base flex items-center gap-2 border-b border-slate-850 pb-3 mb-4">
                <i className="ph-bold ph-hand-coins text-brand-interactive"></i>
                {isArabic 
                  ? `تفاصيل استئجار الوكيل ${leasingModal.agentId}` 
                  : `Lease Details for ${leasingModal.agentId}`}
              </h3>

              <div className="space-y-4">
                <p className="text-[#C4D8E5] font-medium text-xs leading-relaxed">
                  {isArabic 
                    ? `استئجار وكيل مخصص لتشغيل خدماتك وتجاوز قيود الباقة الحالية دون الحاجة لتحديث اشتراكك بالكامل.`
                    : `Lease this virtual agent to scale campaign throughput without committing to a full subscription tier change.`}
                </p>

                {/* Pricing summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-[#1C2B48]/60 border border-[#A7C7E7]/80">
                    <span className="block text-[9px] font-bold text-[#C4D8E5] font-medium uppercase">{isArabic ? "التكلفة (٣٠ يوماً)" : "Cost (30 Days)"}</span>
                    <span className="block text-white font-black text-base mt-1 price-tag">{formatCurrency(calc.leasePrice)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#1C2B48]/60 border border-[#A7C7E7]/80">
                    <span className="block text-[9px] font-bold text-[#C4D8E5] font-medium uppercase">{isArabic ? "حالة المعاملة" : "Transaction"}</span>
                    <span className="block text-indigo-400 font-bold text-xs mt-1">
                      {calc.leasePrice === 800 
                        ? (isArabic ? "تجديد / تمديد" : "Lease Renewal") 
                        : (isArabic ? "استئجار لأول مرة" : "New Lease")
                      }
                    </span>
                  </div>
                </div>

                {/* Comparison Calculator Panel (حاسبة مقارنة) */}
                <div className="p-4 rounded-xl border border-indigo-900/25 bg-indigo-950/15 space-y-3">
                  <h4 className="text-indigo-400 font-black text-[10px] tracking-wide uppercase flex items-center gap-1.5">
                    <i className="ph-bold ph-calculator text-xs"></i>
                    {isArabic ? "حاسبة الجدوى ومقارنة الترقيات" : "Investment Feasibility & Upgrade Comparison"}
                  </h4>
                  
                  <div className="space-y-2 text-xs font-medium text-slate-355 leading-relaxed">
                    <div className="flex justify-between text-[11px] border-b border-slate-850 pb-1.5">
                      <span>{isArabic ? `قيمة باقتك الحالية (${calc.currentPlanName}):` : `Current ${calc.currentPlanName} Cost:`}</span>
                      <span className="text-white font-bold price-tag">{formatCurrency(calc.currentPlanPrice)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] border-b border-slate-850 pb-1.5">
                      <span>{isArabic ? `تكلفة استئجار هذا الوكيل المضافة:` : `This Agent Lease Cost:`}</span>
                      <span className="text-indigo-300 font-bold price-tag">{formatCurrency(calc.leasePrice)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] border-b border-brand-interactive/10 pb-1.5 text-white">
                      <span>{isArabic ? `الإجمالي الفعلي بعد الاستئجار:` : `Total Combined Monthly Cost:`}</span>
                      <span className="text-brand-interactive font-black price-tag">{formatCurrency(calc.totalCurrentCost)}</span>
                    </div>
                    
                    <div className="flex justify-between text-[11px] font-bold text-emerald-400 pt-1">
                      <span>{isArabic ? `باقة الترقية الأعلى (${calc.nextPlanName}):` : `Upgrade Option (${calc.nextPlanName}):`}</span>
                      <span className="font-extrabold price-tag">{formatCurrency(calc.nextPlanPrice)}</span>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                      💡 {isArabic ? "ملاحظة: " : "Benefit: "} {calc.nextPlanBenefits}
                    </p>
                  </div>
                </div>

                {/* Auto Renewal */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1C2B48]/60 border border-slate-850">
                  <div>
                    <span className="block text-[10px] font-bold text-white">{isArabic ? "التجديد التلقائي للوكيل" : "Auto-Renewal"}</span>
                    <span className="block text-[9px] text-[#C4D8E5] font-medium mt-0.5">
                      {isArabic ? "تجديد العقد تلقائياً كل شهر بسعر التجديد." : "Lease will renew and charge automatically."}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRenewalOption}
                    onChange={(e) => setAutoRenewalOption(e.target.checked)}
                    className="w-4 h-4 rounded border-[#A7C7E7]/20 bg-[#1C2B48] text-brand-interactive focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setLeasingModal(null)}
                  className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-slate-700 text-[#C4D8E5] font-medium text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-750"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={submittingLease}
                  onClick={handleConfirmLease}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-500 hover:from-indigo-500 hover:to-indigo-450 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingLease ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <i className="ph-bold ph-check"></i>
                  )}
                  <span>{isArabic ? "تفعيل واستئجار" : "Confirm & Lease"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
