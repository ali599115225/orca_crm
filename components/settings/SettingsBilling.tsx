// components/settings/SettingsBilling.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { initiateSubscriptionPaymentAction, initiateAddonPaymentAction } from '@/app/actions/payment';
import { getAgentLeasesAction } from '@/app/actions/growth';
import { useApp } from '@/app/context/AppContext';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from '@/app/context/ToastContext';
import { SmartCard } from '@/components/ui/SmartCard';

interface SettingsBillingProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

const PLAN_LIMITS: Record<string, number> = {
  basic: 2,
  silver: 10,
  gold: 99999,
};

const PLAN_TITLES = {
  AR: {
    basic: "الباقة الأساسية",
    silver: "الباقة الفضية",
    gold: "الباقة الذهبية",
  },
  EN: {
    basic: "Basic Plan",
    silver: "Silver Plan",
    gold: "Gold Plan",
  }
};

const TRANSLATIONS = {
  AR: {
    title: "حوكمة النظام والربط الحكومي والعمليات السحابية (SaaS Settings)",
    desc: "تخصيص وإدارة اشتراكك العقاري، وإدارة حسابات موظفي المبيعات والوصول لعام ٢٠٢٦م.",
    currentPlan: "الباقة الحالية: ",
    tabBilling: "💳 باقة الاشتراك والترقيات",
    pricingTitle: "باقات وخطط الاشتراك لترقية النظام",
    planBasic: "الباقة الأساسية",
    planSilver: "الباقة الفضية",
    planGold: "الباقة الذهبية",
    activePlan: "نشطة حالياً",
    priceMonth: " ر.س / شهرياً",
    limitStaff: "✔ حد الموظفين: {count} موظفين",
    limitStaffGold: "✔ حد الموظفين: غير محدود",
    limitLeads: "✔ إدخال حتى {count} عميل محتمل",
    limitLeadsGold: "✔ عملاء ومشاريع استثمارية غير محدودة",
    limitProjects: "✔ إدارة حتى {count} مشاريع عقارية",
    limitProjectsGold: "✔ دعم فني كامل وتصميم عقود رسمي",
    limitAgents: "✔ {count} وكيل ذكاء اصطناعي",
    limitAgentsGold: "✔ {count} وكلاء أذكياء وتكامل واتساب كامل",
    limitAgentsGoldEnterprise: "✔ {count} وكلاء ذكاء اصطناعي وتكامل سحابي",
    limitWhatsApp: "✕ واتساب غير متاح",
    limitWhatsAppGold: "✔ واتساب متكامل",
    paylinkUnavailable: "بوابة الدفع الإلكتروني غير متاحة مؤقتًا. للتـرقية، يرجى التواصل مع الدعم الفني.",
    upgradeBtn: "تحويل للباقة (مدى / فيزا)",
    upgradeBtnSilver: "ترقية للباقة (مدى / فيزا)",
    upgradeBtnGold: "ترقية للباقة (مدى / فيزا)",
    currentPlanLabel: "باقتك الحالية",
    addonTitle: "زيادة سعة وكلاء الذكاء الاصطناعي",
    addonSub: "شراء وتوسيع سعة قنوات التحدث والرد التلقائي للفريق الآلي",
    addonAdded: "الوكلاء المضافون:",
    addonPrice: "السعر للوكيل الإضافي:",
    addonMax: "الحد الأقصى للطلب الواحد:",
    addonCountLabel: "العدد المطلوب:",
    addonCostTitle: "تفاصيل التكلفة الإضافية",
    addonCostTotal: " ر.س إجمالي القيمة",
    addonBuyBtn: "شراء وكلاء الآن (مدى / فيزا)",
    tenantTitle: "بيانات الشركة ومستأجر النظام",
    companyLabel: "اسم المنشأة العقارية",
    subdomainLabel: "النطاق الفرعي (Subdomain)",
    actionUpgradePrep: "جاري التحضير...",
    limitReachedAlert: "⚠️ لقد استنفدت كامل مقاعد الموظفين المتاحة لباقة {plan}. قم بترقية اشتراكك لفتح مقاعد إضافية.",
  },
  EN: {
    title: "System & SaaS Settings",
    desc: "Customize your real estate subscription and manage staff accounts and credentials for 2026.",
    currentPlan: "Current Plan: ",
    tabBilling: "💳 Subscription Plan & Upgrades",
    pricingTitle: "Subscription Plans & Upgrades",
    planBasic: "Basic Plan",
    planSilver: "Silver Plan",
    planGold: "Gold Plan",
    activePlan: "Active Plan",
    priceMonth: " SAR / month",
    limitStaff: "✔ Staff limit: {count} users",
    limitStaffGold: "✔ Staff limit: Unlimited",
    limitLeads: "✔ Leads: Up to {count} prospects",
    limitLeadsGold: "✔ Leads: Unlimited prospects and projects",
    limitProjects: "✔ Projects: Up to {count} developments",
    limitProjectsGold: "✔ Projects: Unlimited developments and support",
    limitAgents: "✔ {count} AI agents",
    limitAgentsGold: "✔ {count} AI agents & WhatsApp",
    limitAgentsGoldEnterprise: "✔ {count} AI agents & cloud setups",
    limitWhatsApp: "✕ WhatsApp unavailable",
    limitWhatsAppGold: "✔ WhatsApp included",
    paylinkUnavailable: "Online payment is temporarily unavailable. Please contact support to upgrade your plan.",
    upgradeBtn: "Switch Plan (Mada / Visa)",
    upgradeBtnSilver: "Upgrade Plan (Mada / Visa)",
    upgradeBtnGold: "Upgrade Plan (Mada / Visa)",
    currentPlanLabel: "Your Current Plan",
    addonTitle: "Expand AI Agent Slots",
    addonSub: "Purchase additional slots for automated conversation agents",
    addonAdded: "Added slots:",
    addonPrice: "Price per extra slot:",
    addonMax: "Maximum per order:",
    addonCountLabel: "Quantity Required:",
    addonCostTitle: "Additional Cost Details",
    addonCostTotal: " SAR Total Value",
    addonBuyBtn: "Purchase Slots Now (Mada / Visa)",
    tenantTitle: "Company Details & System Tenant",
    companyLabel: "Real Estate Company Name",
    subdomainLabel: "Subdomain",
    actionUpgradePrep: "Preparing...",
    limitReachedAlert: "⚠️ You have used all available seats for the {plan} plan. Please upgrade to unlock more slots.",
  }
};

export default function SettingsBilling({ tenant, lang, isArabic }: SettingsBillingProps) {
  const searchParams = useSearchParams();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const dir = isArabic ? 'rtl' : 'ltr';

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(1);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [showUpgradeCompareModal, setShowUpgradeCompareModal] = useState<{ isOpen: boolean; targetPlan: "silver" | "gold" } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = (tenant.subscriptionPlan || "basic").toLowerCase() as "basic" | "silver" | "gold";
  const planTitles = PLAN_TITLES[lang] || PLAN_TITLES.AR;

  const fetchLeases = async () => {
    try {
      const res = await getAgentLeasesAction();
      if (res.success && res.data) {
        setLeases(res.data);
      }
    } catch (e) {
      console.error("Failed to load agent leases:", e);
    } finally {
      setLoadingLeases(false);
    }
  };

  useEffect(() => {
    fetchLeases();
  }, []);

  useEffect(() => {
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    if (successMsg) setSuccess(successMsg);
    if (errorMsg) setError(errorMsg);
  }, [searchParams]);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const formatCurrency = (amount: number): string => {
    return `${toArabicNumerals(amount)} ${isArabic ? 'ر.س' : 'SAR'}`;
  };

  const getLeaseCountdown = (agentId: string) => {
    const lease = leases.find(l => l.agentId === agentId);
    if (!lease) return null;
    const now = new Date().getTime();
    const end = new Date(lease.endDate).getTime();
    const diff = end - now;
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return isArabic ? `متبقي ${days} يوم و ${hours} ساعة` : `${days}d ${hours}h left`;
    }
    return isArabic ? "منتهي" : "Expired";
  };

  const getAgentStatus = (agentId: string) => {
    const planLower = plan.toLowerCase();

    const allowedMap: Record<string, string[]> = {
      gold: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      silver: ["SAHER", "MANSOUR"],
      basic: ["MANSOUR"]
    };

    const allowed = allowedMap[planLower] || allowedMap["basic"];
    if (allowed.includes(agentId)) {
      return { status: "ACTIVE", label: isArabic ? "نشط بالباقة" : "Active in Plan" };
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

  const handleUpgradeClick = (targetPlan: "silver" | "gold") => {
    setShowUpgradeCompareModal({ isOpen: true, targetPlan });
  };

  const handleUpgrade = async (plan: "basic" | "silver" | "gold") => {
    setSuccess(null);
    setError(null);
    setLoadingPlan(plan);

    const result = await initiateSubscriptionPaymentAction(plan);
    setLoadingPlan(null);

    if (result.success && (result as any).paymentUrl) {
      window.location.href = (result as any).paymentUrl;
    } else {
      setError((result as any).error || (isArabic ? "عذراً، فشل بدء عملية الدفع والاتصال بالبوابة." : "Sorry, payment initialization failed."));
    }
  };

  const handleAddonPurchase = async () => {
    setSuccess(null);
    setError(null);
    setLoadingAgent(true);

    const result = await initiateAddonPaymentAction(agentCount);
    setLoadingAgent(false);

    if (result.success && (result as any).paymentUrl) {
      window.location.href = (result as any).paymentUrl;
    } else {
      setError((result as any).error || (isArabic ? "عذراً، فشل بدء عملية الدفع لشراء الوكلاء." : "Sorry, payment initialization failed for purchasing agents."));
    }
  };

  const ADDON_PRICE_PER_AGENT = 250;
  const ADDON_MAX_PER_ORDER = 10;
  const addonTotalCost = agentCount * ADDON_PRICE_PER_AGENT;

  return (
    <div className="space-y-6 md:space-y-8" dir={dir}>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Tenant Details Card */}
      <SmartCard className="p-6 shadow-sm">
        <h3 className="text-[var(--nc-foreground)] font-bold text-base border-b border-[var(--nc-border)] pb-3 flex items-center gap-2">
          <i className="ph-bold ph-buildings text-[var(--nc-text-secondary)]"></i>
          {t.tenantTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
          <div className="space-y-1">
            <span className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.companyLabel}:</span>
            <p className="font-bold text-[var(--nc-foreground)] text-base">{tenant.companyName}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.subdomainLabel}:</span>
            <p className="font-bold text-indigo-500 text-base font-en">{tenant.subdomain}.orca.az-ez.pro</p>
          </div>
        </div>
      </SmartCard>

      {/* Current Plan Info */}
      <SmartCard className="p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center text-[var(--nc-text-secondary)] text-lg">
              <i className="ph-bold ph-credit-card"></i>
            </div>
            <div>
              <p className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.currentPlan}</p>
              <p className="font-bold text-[var(--nc-foreground)] text-base">{planTitles[plan]}</p>
            </div>
          </div>
          <span className="bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-[10px] font-bold px-3 py-1 rounded-full">
            {t.currentPlanLabel}
          </span>
        </div>
      </SmartCard>

      {/* Pricing cards grid */}
      <div className="space-y-4">
        <h3 className="text-[var(--nc-foreground)] font-bold text-base">{t.pricingTitle}</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Basic Plan */}
          <div className={`bg-[var(--nc-surface-strong)] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative ${
            plan === 'basic' ? 'border-[var(--nc-accent-border)] ring-1 ring-[var(--nc-accent-border)]' : 'border-[var(--nc-border)]'
          }`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[var(--nc-foreground)] font-bold text-base">{t.planBasic}</h4>
                {plan === 'basic' && <span className="bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
              </div>
              <h2 className="text-2xl font-black text-[var(--nc-foreground)] font-en"><span className="price-tag">{formatCurrency(450)}</span> <span className="text-xs text-[var(--nc-foreground-muted)] font-semibold">{t.priceMonth}</span></h2>

              <div className="border-t border-[var(--nc-border)] pt-4 space-y-2.5 text-xs text-[var(--nc-foreground-muted)] font-medium">
                <p>{t.limitStaff.replace('{count}', toArabicNumerals(2))}</p>
                <p>{t.limitLeads.replace('{count}', toArabicNumerals(100))}</p>
                <p>{t.limitProjects.replace('{count}', toArabicNumerals(2))}</p>
                <p>{t.limitAgents.replace('{count}', toArabicNumerals(1))}</p>
                <p className="text-rose-400 dark:text-rose-500">{t.limitWhatsApp}</p>
              </div>
            </div>

            {plan !== 'basic' && (
              <div className="space-y-2">
                <button disabled className="w-full py-3 rounded-xl bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border border-[var(--nc-border)] font-bold text-xs opacity-50 cursor-not-allowed">
                  {t.upgradeBtn}
                </button>
                <p className="text-[10px] text-amber-400 text-center font-semibold">{t.paylinkUnavailable}</p>
              </div>
            )}
          </div>

          {/* Silver Plan */}
          <div className={`bg-[var(--nc-surface-strong)] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative ${
            plan === 'silver' ? 'border-[var(--nc-accent-border)] ring-1 ring-[var(--nc-accent-border)]' : 'border-[var(--nc-border)]'
          }`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[var(--nc-foreground)] font-bold text-base">{t.planSilver}</h4>
                {plan === 'silver' && <span className="bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
              </div>
              <h2 className="text-2xl font-black text-[var(--nc-foreground)] font-en"><span className="price-tag">{formatCurrency(900)}</span> <span className="text-xs text-[var(--nc-foreground-muted)] font-semibold">{t.priceMonth}</span></h2>

              <div className="border-t border-[var(--nc-border)] pt-4 space-y-2.5 text-xs text-[var(--nc-foreground-muted)] font-medium">
                <p>{t.limitStaff.replace('{count}', toArabicNumerals(10))}</p>
                <p>{t.limitLeads.replace('{count}', toArabicNumerals(1000))}</p>
                <p>{t.limitProjects.replace('{count}', toArabicNumerals(10))}</p>
                <p>{t.limitAgents.replace('{count}', toArabicNumerals(2))}</p>
                <p className="text-rose-400 dark:text-rose-500">{t.limitWhatsApp}</p>
              </div>
            </div>

            {plan !== 'silver' && (
              <div className="space-y-2">
                <button disabled className="w-full py-3 rounded-xl bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border border-[var(--nc-border)] font-bold text-xs opacity-50 cursor-not-allowed">
                  {t.upgradeBtnSilver}
                </button>
                <p className="text-[10px] text-amber-400 text-center font-semibold">{t.paylinkUnavailable}</p>
              </div>
            )}
          </div>

          {/* Gold Plan */}
          <div className={`bg-[#0f172a] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative shadow-lg ${
            plan === 'gold' ? 'border-[var(--nc-accent-border)] ring-1 ring-[var(--nc-accent-border)]' : 'border-[var(--nc-border)]'
          }`}>
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[var(--nc-accent)] text-[var(--nc-foreground)] text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">POPULAR</div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[var(--nc-foreground)] font-bold text-base">{t.planGold}</h4>
                {plan === 'gold' && <span className="bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)]/35 text-[var(--nc-text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
              </div>
              <h2 className="text-2xl font-black text-[var(--nc-foreground)] font-en"><span className="price-tag">{formatCurrency(2400)}</span> <span className="text-xs text-[var(--nc-foreground-muted)] font-semibold">{t.priceMonth}</span></h2>

              <div className="border-t border-[var(--nc-border)] pt-4 space-y-2.5 text-xs text-[var(--nc-foreground-muted)] font-medium">
                <p>{t.limitStaffGold}</p>
                <p>{t.limitLeadsGold}</p>
                <p>{t.limitProjectsGold}</p>
                <p>{t.limitAgentsGold.replace('{count}', toArabicNumerals(5))}</p>
                <p className="text-emerald-400 dark:text-emerald-500">{t.limitWhatsAppGold}</p>
              </div>
            </div>

            {plan !== 'gold' && (
              <div className="space-y-2">
                <button disabled className="w-full py-3 rounded-xl bg-[var(--nc-accent)]/30 text-[var(--nc-foreground-muted)] font-bold text-xs opacity-50 cursor-not-allowed">
                  {t.upgradeBtnGold}
                </button>
                <p className="text-[10px] text-amber-400 text-center font-semibold">{t.paylinkUnavailable}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Status Widget (مؤشر حالة الوكلاء النشطين) */}
      {(() => {
        const allAgents = ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"];
        const activeCount = allAgents.filter(id => {
          const status = getAgentStatus(id).status;
          return status === 'ACTIVE' || status === 'LEASED';
        }).length;

        return (
          <SmartCard className="p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">
                <i className="ph-fill ph-robot"></i>
              </div>
              <div>
                <h4 className="text-[var(--nc-foreground)] font-bold text-base flex items-center gap-2">
                  {isArabic ? "مؤشر حالة الوكلاء الأذكياء" : "AI Agent Status Monitor"}
                </h4>
                <p className="text-xs text-[var(--nc-foreground-muted)] mt-1 font-semibold">
                  {isArabic
                    ? `لديك حالياً ${toArabicNumerals(activeCount)} من أصل ٥ وكلاء نشطين بباقتك.`
                    : `You currently have ${activeCount} out of 5 active agents in your plan.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                window.location.href = "/operations?tab=agents";
              }}
              className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-[var(--nc-foreground)] font-bold text-xs rounded-xl cursor-pointer transition-all border border-indigo-500/35 shadow-lg shadow-indigo-650/20 flex items-center gap-2"
            >
              <i className="ph-bold ph-gear-six animate-spin-slow"></i>
              <span>{isArabic ? "إدارة الوكلاء والاشتراكات" : "Manage AI Agents"}</span>
            </button>
          </SmartCard>
        );
      })()}

      {/* Agent Addon Purchasing Section */}
      <SmartCard className="p-6 shadow-sm">
        <div className="border-b border-[var(--nc-border)] pb-3 mb-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-base flex items-center gap-2">
            <i className="ph-bold ph-plus-circle text-[var(--nc-text-secondary)]"></i>
            {t.addonTitle}
          </h3>
          <p className="text-xs text-[var(--nc-foreground-muted)] mt-1 font-semibold">
            {t.addonSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.addonAdded}</span>
              <span className="font-bold text-[var(--nc-foreground)] font-en">{toArabicNumerals(tenant.extraAgents)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.addonPrice}</span>
              <span className="font-bold text-[var(--nc-foreground)] font-en">{formatCurrency(ADDON_PRICE_PER_AGENT)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.addonMax}</span>
              <span className="font-bold text-[var(--nc-foreground)] font-en">{toArabicNumerals(ADDON_MAX_PER_ORDER)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.addonCountLabel}</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAgentCount(Math.max(1, agentCount - 1))}
                  disabled={agentCount <= 1 || loadingAgent}
                  className="w-10 h-10 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] flex items-center justify-center text-[var(--nc-foreground)] font-bold text-lg cursor-pointer hover:bg-[var(--nc-accent-soft)] transition-all disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={ADDON_MAX_PER_ORDER}
                  value={agentCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setAgentCount(Math.min(Math.max(1, val), ADDON_MAX_PER_ORDER));
                  }}
                  className="w-20 text-center rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-sm text-[var(--nc-foreground)] font-bold font-en focus:outline-none focus:border-[var(--nc-accent-border)]"
                />
                <button
                  onClick={() => setAgentCount(Math.min(ADDON_MAX_PER_ORDER, agentCount + 1))}
                  disabled={agentCount >= ADDON_MAX_PER_ORDER || loadingAgent}
                  className="w-10 h-10 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] flex items-center justify-center text-[var(--nc-foreground)] font-bold text-lg cursor-pointer hover:bg-[var(--nc-accent-soft)] transition-all disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] space-y-2">
              <h5 className="text-[var(--nc-foreground-muted)] text-xs font-semibold">{t.addonCostTitle}</h5>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--nc-foreground-muted)]">{toArabicNumerals(agentCount)} × {formatCurrency(ADDON_PRICE_PER_AGENT)}</span>
                <span className="font-black text-[var(--nc-foreground)] text-lg font-en">{formatCurrency(addonTotalCost)}{t.addonCostTotal}</span>
              </div>
            </div>

            <button
              disabled
              className="w-full py-3 rounded-xl bg-[var(--nc-accent)]/30 text-[var(--nc-foreground-muted)] font-bold text-xs opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <i className="ph-bold ph-shopping-cart"></i>
              {t.addonBuyBtn}
            </button>
          </div>
        </div>
      </SmartCard>

      {/* Smart Upgrade & Leasing Options Comparison Modal */}
      {showUpgradeCompareModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative" dir={dir}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="border-b border-[var(--nc-border)] pb-3 flex justify-between items-center">
              <h3 className="text-[var(--nc-foreground)] font-extrabold text-base flex items-center gap-2">
                <i className="ph-bold ph-sparkle text-[var(--nc-text-secondary)]"></i>
                {isArabic ? "خيارات الترقية والنمو الذكية" : "Smart Upgrade & Leasing Options"}
              </h3>
              <button
                onClick={() => setShowUpgradeCompareModal(null)}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--nc-foreground-muted)] leading-relaxed">
              {isArabic
                ? "قبل إتمام عملية ترقية باقة الاشتراك، نود تقديم الخيار الأمثل والأنسب لمتطلبات عملك وميزانيتك:"
                : "Before completing your plan upgrade, choose the option that best fits your business needs and budget:"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Temporary leasing */}
              <div className="p-4 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-[var(--nc-text-secondary)] text-xs font-black mb-1.5 flex items-center gap-1.5">
                    <i className="ph-bold ph-hand-coins"></i>
                    {isArabic ? "استئجار وكيل عند الطلب" : "Lease On-Demand"}
                  </h4>
                  <p className="text-[10px] text-[var(--nc-foreground-muted)] leading-relaxed">
                    {isArabic
                      ? "استمر بباقتك الحالية وقم باستئجار وكلاء منفصلين (مثل بصير أو خبير) لحملاتك المؤقتة بقيمة 250 ر.س شهرياً للوكيل الواحد."
                      : "Stay on your current plan and lease individual agents (like Baseer or Khabeer) for temporary campaigns at 250 SAR/month."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUpgradeCompareModal(null);
                    window.location.href = '/operations?tab=agents';
                  }}
                  className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-[var(--nc-foreground)] font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                >
                  {isArabic ? "الذهاب للاستئجار مؤقتاً" : "Lease Agent Temporarily"}
                </button>
              </div>

              {/* Option 2: Full Upgrade */}
              <div className="p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/20 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-[var(--nc-foreground)] text-xs font-black mb-1.5 flex items-center gap-1.5">
                    <i className="ph-bold ph-sparkle text-indigo-400"></i>
                    {isArabic ? "الترقية للباقة الذهبية" : "Upgrade to Gold"}
                  </h4>
                  <p className="text-[10px] text-[var(--nc-foreground-muted)] leading-relaxed">
                    {isArabic
                      ? "احصل على وصول دائم وغير محدود لكافة الوكلاء الخمسة (ساهر، سند، بصير، خبير، منصور) مع تكامل واتساب كامل وإدارة غير محدودة."
                      : "Unlock permanent, unlimited access to all 5 agents (Saher, Sanad, Baseer, Khabeer, Mansour) with full WhatsApp integration."}
                  </p>
                </div>

                <button
                  disabled
                  className="w-full py-2 bg-gradient-to-r from-[var(--nc-accent)]/30 to-[var(--nc-accent-hover)]/30 text-[var(--nc-foreground-muted)] font-bold text-[10px] rounded-lg opacity-50 cursor-not-allowed"
                >
                  {isArabic ? "الترقية غير متاحة مؤقتاً" : "Upgrade Temporarily Unavailable"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--nc-border)]">
              <button
                onClick={() => setShowUpgradeCompareModal(null)}
                className="px-4 py-2 bg-[var(--nc-surface)] hover:bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] text-[10px] font-bold rounded-lg cursor-pointer"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
