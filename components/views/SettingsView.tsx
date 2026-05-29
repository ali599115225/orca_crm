'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initiateSubscriptionPaymentAction, initiateAddonPaymentAction } from '@/app/actions/payment';
import { createTenantUserAction, updateTenantUserAction, deleteTenantUserAction } from '@/app/actions/users';
import { useApp } from '@/app/context/AppContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsViewProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  users?: User[];
  currentUserRole?: string;
}

const PLAN_LIMITS: Record<string, number> = {
  trial: 1,
  basic: 5,
  silver: 10,
  gold: 99999, // لا محدود
};

const PLAN_TITLES = {
  AR: {
    trial: "نسخة التجربة الحرة (٣ أيام)",
    basic: "الباقة الأساسية — Essential",
    silver: "الباقة الاحترافية — Elite",
    gold: "الباقة الماسية — Bespoke",
  },
  EN: {
    trial: "Free Trial (3 Days)",
    basic: "Essential Plan",
    silver: "Elite Plan",
    gold: "Bespoke Plan",
  }
};

const ROLE_TRANSLATIONS = {
  AR: {
    ADMIN: "المدير العام (Admin)",
    SALES_MANAGER: "مدير المبيعات",
    SALES_EMPLOYEE: "مستشار عقاري",
    MARKETING: "إدارة التسويق",
    READ_ONLY: "مشاهدة فقط",
  },
  EN: {
    ADMIN: "General Manager (Admin)",
    SALES_MANAGER: "Sales Manager",
    SALES_EMPLOYEE: "Real Estate Consultant",
    MARKETING: "Marketing Department",
    READ_ONLY: "Read Only",
  }
};

const TRANSLATIONS = {
  AR: {
    title: "إعدادات النظام والعمليات السحابية",
    desc: "تخصيص وإدارة اشتراكك العقاري، وإدارة حسابات مستشاري المبيعات وفريق العمل لعام {year}م.",
    currentPlan: "الباقة الحالية: ",
    tabBilling: "💳 باقات الاشتراك والترقيات العقارية",
    tabStaff: "👥 إدارة فريق العمل ({count} مستشار)",
    successMsg: "تم إضافة الحساب الجديد بنجاح وتفعيل نفاذه بالنظام.",
    tenantTitle: "بيانات منشأتك ومستأجر النظام السحابي",
    companyLabel: "اسم المنشأة العقارية",
    subdomainLabel: "النطاق العقاري المخصص (Subdomain)",
    pricingTitle: "منظومة الباقات والخطط العقارية المعتمدة",
    planTrial: "نسخة التجربة الحرة",
    planBasic: "الباقة الأساسية — Essential",
    planSilver: "الباقة الاحترافية — Elite",
    planGold: "الباقة الماسية — Bespoke",
    activePlan: "نشطة حالياً",
    priceMonth: " ر.س / شهرياً",
    priceYearlyLabel: " ر.س / شهرياً عند الدفع السنوي",
    limitStaff: "✔ حد فريق العمل: {count} مستشارين عقاريين",
    limitStaffGold: "✔ حد فريق العمل: لا محدود واشتراك مفتوح",
    limitLeads: "✔ إدارة مدخلات حتى {count} عميل محتمل",
    limitLeadsGold: "✔ عملاء ومشاريع ومخططات استثمارية غير محدودة",
    limitProjects: "✔ إدارة حتى {count} مشاريع ومخططات عقارية",
    limitProjectsGold: "✔ نظام محاسبي وعقود وساطة وتسويق رسمية كاملة",
    limitAgents: "✔ {count} وكيل رقمي ذكي ونظام حماية بيانات معتمد",
    limitAgentsGold: "✔ طاقم الوكلاء بالكامل ({count} وكلاء) وتكامل واتساب لرسائل غير محدودة عبر رقمك الخاص",
    limitAgentsGoldEnterprise: "✔ وكلاء رقميون غير محدودين وحماية بيانات مستقرة بمعايير مصرفية فائقة",
    upgradeBtn: "تحويل للباقة (مدى / فيزا)",
    upgradeBtnSilver: "ترقية للباقة الاحترافية ➔",
    upgradeBtnGold: "ترقية للباقة الماسية ➔",
    currentPlanLabel: "باقتك الحالية",
    addonTitle: "تفعيل وتمديد محرك وكيل الحملات المؤقت (ساهر)",
    addonSub: "نظام الترقية والتنشيط المؤقت لوكلاء الحملات التسويقية والمبيعات المتقدمة لتلبية ذروة الطلب العقاري.",
    addonAdded: "الأشهر المفعلة سابقاً للوكيل:",
    addonPrice: "تكلفة تفعيل المحرك الحالية:",
    addonMax: "حالة تفعيل الوكيل الحالية:",
    addonCostTitle: "تفاصيل تكلفة بوابة السداد الآمنة",
    addonCostTotal: " ر.س القيمة الإجمالية",
    addonBuyBtn: "تأكيد وتفعيل الوكيل الآن ➔",
    staffCapacityTitle: "حالة سعة المقاعد المتاحة بالباقة",
    staffActiveSeats: "المقاعد والخطوط النشطة:",
    unlimited: "لا محدود",
    limitReachedAlert: "⚠️ لقد استنفدت كامل مقاعد المستشارين المتاحة لباقة {plan}. يرجى ترقية اشتراكك لفتح خطوط إضافية لفريقك.",
    addStaffTitle: "إضافة مستشار عقاري جديد للفريق",
    staffName: "الاسم الكامل *",
    staffEmail: "البريد الإلكتروني المعتمد *",
    staffRole: "دور الصلاحية والنفاذ *",
    roleEmployee: "مستشار عقاري (مبيعات)",
    roleManager: "مدير مبيعات",
    roleMarketing: "إدارة تسويق",
    roleReadOnly: "مشاهدة فقط",
    roleAdmin: "المدير العام (Admin)",
    staffPassword: "كلمة المرور الافتراضية *",
    staffSubmit: "إنشاء حساب المستشار ➔",
    editStaffTitle: "تعديل صلاحيات الموظف: ",
    editStaffSave: "حفظ التغييرات",
    editStaffCancel: "✕ إلغاء",
    editStaffName: "الاسم الكامل",
    editStaffRole: "دور الصلاحية العقارية",
    actionUpgradePrep: "جاري التحضير لبوابة السداد...",
    actionCreatePrep: "جاري إنشاء الحساب والمقعد...",
    staffTableTitle: "سجل مستشاري المبيعات النشطين بالمنشأة",
    staffTableId: "المستشار",
    staffTableEmail: "البريد وتاريخ الانضمام",
    staffTableStatus: "حالة النفاذ",
    staffTableActions: "الإجراءات والتحكم",
    statusActive: "نشط وصلاحية كاملة",
    statusInactive: "معطل مؤقتاً",
    btnToggleDeactivate: "تعطيل خطه",
    btnToggleActivate: "تفعيل خطه",
    btnEdit: "تعديل الصلاحية",
    btnDelete: "حذف نهائي",
    confirmDelete: "هل أنت متأكد من رغبتك في حذف حساب هذا المستشار نهائياً وتحرير مقعد في باقتك؟",
    loadingAction: "جاري المعالجة..."
  },
  EN: {
    title: "System & Subscription Settings",
    desc: "Customize your real estate subscription and manage staff accounts and credentials for {year}.",
    currentPlan: "Current Plan: ",
    tabBilling: "💳 Plans & Subscription Upgrades",
    tabStaff: "👥 Staff Management ({count} users)",
    successMsg: "New real estate consultant added successfully.",
    tenantTitle: "Company Details & System Tenant",
    companyLabel: "Real Estate Company Name",
    subdomainLabel: "Custom Subdomain",
    pricingTitle: "Real Estate Subscription Matrix",
    planTrial: "Free Trial",
    planBasic: "Essential Plan",
    planSilver: "Elite Plan",
    planGold: "Bespoke Plan",
    activePlan: "Active Plan",
    priceMonth: " SAR / month",
    priceYearlyLabel: " SAR / mo billed annually",
    limitStaff: "✔ Staff limit: {count} consultants",
    limitStaffGold: "✔ Staff limit: Unlimited open access",
    limitLeads: "✔ Leads: Up to {count} prospects",
    limitLeadsGold: "✔ Leads: Unlimited prospects, projects & developments",
    limitProjects: "✔ Projects: Up to {count} properties",
    limitProjectsGold: "✔ Includes full ERP general ledger & unified mediation contracts",
    limitAgents: "✔ {count} AI assistant & secured database",
    limitAgentsGold: "✔ Full crew ({count} AI agents) & unlimited WhatsApp via your phone plan",
    limitAgentsGoldEnterprise: "✔ Unlimited AI capacity & top-tier corporate banking-grade data protection",
    upgradeBtn: "Switch Plan (Mada / Visa)",
    upgradeBtnSilver: "Upgrade to Elite Plan ➔",
    upgradeBtnGold: "Upgrade to Bespoke Plan ➔",
    currentPlanLabel: "Your Current Plan",
    addonTitle: "Activate Temporary Campaign AI Agent (Saher)",
    addonSub: "Upgrade system for temporary independent automated campaign and advanced sales agents.",
    addonAdded: "Activated months counter:",
    addonPrice: "Activation cost:",
    addonMax: "Current activation status:",
    addonCountLabel: "Extend status:",
    addonCostTitle: "Secure Payment Gateway Cost Details",
    addonCostTotal: " SAR Total Value",
    addonBuyBtn: "Confirm & Activate Agent Now ➔",
    staffCapacityTitle: "Staff Seat Allocation",
    staffActiveSeats: "Active line seats:",
    unlimited: "Unlimited",
    limitReachedAlert: "⚠️ You have used all available seats for the {plan} plan. Please upgrade to unlock more slots.",
    addStaffTitle: "Add New Consultant",
    staffName: "Full Name *",
    staffEmail: "Verified Email *",
    staffRole: "Role & Permissions *",
    roleEmployee: "Real Estate Consultant (Sales)",
    roleManager: "Sales Manager",
    roleMarketing: "Marketing Department",
    roleReadOnly: "Read Only",
    roleAdmin: "General Manager (Admin)",
    staffPassword: "Default Password *",
    staffSubmit: "Create Staff Account ➔",
    editStaffTitle: "Edit Employee Permissions: ",
    editStaffSave: "Save Changes",
    editStaffCancel: "✕ Cancel",
    editStaffName: "Full Name",
    editStaffRole: "Role",
    actionUpgradePrep: "Preparing...",
    actionCreatePrep: "Creating account...",
    staffTableTitle: "Active Company Employee Ledger",
    staffTableId: "Consultant",
    staffTableEmail: "Email & Registration Date",
    staffTableStatus: "Status",
    staffTableActions: "Actions",
    statusActive: "Active",
    statusInactive: "Inactive",
    btnToggleDeactivate: "Deactivate line",
    btnToggleActivate: "Activate line",
    btnEdit: "Edit Role",
    btnDelete: "Delete Account",
    confirmDelete: "Are you sure you want to permanently delete this employee from your workspace?",
    loadingAction: "Loading..."
  }
};

export default function SettingsView({ tenant, users = [], currentUserRole = "READ_ONLY" }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [activeTab, setActiveTab] = useState<'billing' | 'staff'>('billing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // تتبع تفعيلات وكيل الحملات لتشغيل نموذج هندسة النمو (PLG Upselling)
  const [extraAgentsUsed, setExtraAgentsUsed] = useState(tenant.extraAgents || 0);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // حالات إدارة طاقم العمل
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    if (successMsg) setSuccess(successMsg);
    if (errorMsg) setError(errorMsg);
  }, [searchParams]);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const handleUpgrade = async (plan: "basic" | "silver" | "gold") => {
    setSuccess(null);
    setError(null);
    setLoadingPlan(plan);

    const paymentPlan = plan === 'silver' ? 'professional' : plan === 'gold' ? 'enterprise' : plan;

    const result = await initiateSubscriptionPaymentAction(paymentPlan as any);
    setLoadingPlan(null);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || (lang === 'AR' ? "عذراً، فشل بدء الاتصال بـ بوابة السداد الإلكترونية." : "Sorry, payment initialization failed."));
    }
  };

  // محرك احتساب تمديد وكيل الحملات المؤقت "ساهر" (سيكولوجية الاستعجال والإدمان الرقمي)
  const getUpsellingEngineStatus = (currentPlan: string, linesCount: number) => {
    const planNormalized = currentPlan.toLowerCase();
    
    if (planNormalized === "basic" || planNormalized === "essential" || planNormalized === "silver" || planNormalized === "professional") {
      if (linesCount === 0) {
        return {
          allowed: true,
          price: 399,
          buttonText: lang === 'AR' ? "تفعيل وكيل حملات مؤقت (٣٩٩ ر.س)" : "Activate Campaign Agent (399 SAR)",
          message: lang === 'AR' 
            ? `📨 تقرير المنظومة: وكيلك ساهر أنجز محادثات عقارية مكثفة هذا الشهر وحجز للشركة عملاء جادين مهتمين بالشراء. يمكنك تمديد خط الوكيل المؤقت لشهر واحد بـ ٣٩٩ ريال فقط لاستيعاب حملاتك.` 
            : `📨 System Notice: Your AI Agent Saher managed customer chats and locked warm property buyers. Extend your temporary agent slot for 1 month for only 399 SAR.`,
        };
      } else if (linesCount === 1) {
        return {
          allowed: true,
          price: 499,
          buttonText: lang === 'AR' ? "تمديد ثانٍ للوكيل (٤٩٩ ر.س)" : "Second Extension (499 SAR)",
          message: lang === 'AR'
            ? "⚠️ تمديد المحرك للشهر الثاني متاح بقيمة ٤٩٩ ريال. يرجى الملاحظة أن الترقية المباشرة للباقة الاحترافية (Elite) تمنحك طاقم الوكلاء الدائمين بتكلفة مبيعات أكثر جدوى وعقوداً رسمية متكاملة."
            : "⚠️ Second month extension is available for 499 SAR. Upgrading to Elite Plan gives you full permanent agents at a much higher value.",
        };
      } else {
        return {
          allowed: false,
          price: null,
          buttonText: lang === 'AR' ? "🔒 يتطلب ترقية الباقة للاستمرار" : "🔒 Upgrade Required to Proceed",
          message: lang === 'AR'
            ? "❌ حد التمديد المؤقت استُنفد! يرجى ترقية منشأتك إلى الباقة الاحترافية الشاملة لفتح صلاحيات الوكلاء الرسميين (ساهر + سند) بشكل دائم ומستقر دون انقطاع مبيعاتك."
            : "❌ Temporary extension limits reached! Please upgrade to Elite Plan to restore full automated agent channels permanently.",
        };
      }
    }

    return {
      allowed: true,
      price: 0,
      buttonText: lang === 'AR' ? "طاقم الوكلاء نشط بالكامل" : "All Agents Active",
      message: lang === 'AR' ? "🔒 الباقة الماسية تتضمن خطوط الوكلاء والربط السحابي المفتوح بشكل دائم." : "🔒 Your current Bespoke plan includes all automated agent configurations natively.",
    };
  };

  const currentPlanName = (tenant.subscriptionPlan || "basic").toLowerCase();
  const upselling = getUpsellingEngineStatus(currentPlanName, extraAgentsUsed);

  const handleBuyAgents = async () => {
    if (!upselling.allowed) return;
    setSuccess(null);
    setError(null);
    setLoadingAgent(true);

    const result = await initiateAddonPaymentAction(1);
    setLoadingAgent(false);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || (lang === 'AR' ? "عذراً، فشل ترحيل طلب السداد لتفعيل الوكلاء." : "Sorry, payment initialization failed."));
    }
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoadingCreate(true);

    const formData = new FormData(e.currentTarget);
    const result = await createTenantUserAction(formData);
    setLoadingCreate(false);

    if (result.success) {
      setSuccess(t.successMsg);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setError(result.error || (lang === 'AR' ? "عذراً، فشل حجز المقعد وإضافة المستشار." : "Sorry, failed to create account."));
    }
  };

  const handleToggleStatus = async (user: User) => {
    setSuccess(null);
    setError(null);
    setLoadingActionId(user.id);

    const formData = new FormData();
    formData.append("name", user.name);
    formData.append("role", user.role);
    formData.append("isActive", (!user.isActive).toString());

    const result = await updateTenantUserAction(user.id, formData);
    setLoadingActionId(null);

    if (result.success) {
      setSuccess(lang === 'AR' ? "تم تعديل حالة نفاذ حساب المستشار العقاري بنجاح." : "Account status updated.");
      router.refresh();
    } else {
      setError(result.error || "Failed to toggle status.");
    }
  };

  const handleEditRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setSuccess(null);
    setError(null);
    setLoadingActionId(editingUser.id);

    const formData = new FormData(e.currentTarget);
    formData.append("isActive", editingUser.isActive.toString());

    const result = await updateTenantUserAction(editingUser.id, formData);
    setLoadingActionId(null);
    setEditingUser(null);

    if (result.success) {
      setSuccess(lang === 'AR' ? "تم تحديث الصلاحيات العقارية بنجاح." : "Permissions updated.");
      router.refresh();
    } else {
      setError(result.error || "Failed to save updates.");
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!confirm(t.confirmDelete)) return;

    setSuccess(null);
    setError(null);
    setLoadingActionId(userId);

    const result = await deleteTenantUserAction(userId);
    setLoadingActionId(null);

    if (result.success) {
      setSuccess(lang === 'AR' ? "تم حذف الحساب بالكامل وتحرير مقعد شاغر في المنشأة." : "Account deleted.");
      router.refresh();
    } else {
      setError(result.error || "Failed to complete account deletion.");
    }
  };

  const plan = currentPlanName === 'professional' ? 'silver' : currentPlanName === 'enterprise' ? 'gold' : currentPlanName;
  const limit = PLAN_LIMITS[plan] || 5;
  const currentUsersCount = users.length;
  const isLimitReached = currentUsersCount >= limit;

  const isDark = theme === 'dark';
  const planTitles = PLAN_TITLES[lang] || PLAN_TITLES.AR;

  return (
    <div className={`settings-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>

      {/* الهيدر الإستراتيجي النظيف وبوابة النفاذ */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.desc.replace('{year}', toArabicNumerals(2026))}
          </p>
        </div>

        <div className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 text-center border ${
          isDark 
            ? 'bg-blue-950/20 text-blue-400 border-blue-900/40 shadow-[0_0_15px_rgba(0,123,255,0.15)]' 
            : 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm'
        }`}>
          {t.currentPlan}{planTitles[plan] || tenant.subscriptionPlan}
        </div>
      </div>

      {/* شريط علامات التبويب وعقد الملاحة السحابية */}
      <div className={`flex border-b gap-2 mb-6 ${isDark ? 'border-slate-800' : 'border-slate-200'} ${lang === 'AR' ? 'justify-start' : 'justify-end'}`}>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          {t.tabBilling}
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'staff' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          {t.tabStaff.replace('{count}', toArabicNumerals(currentUsersCount))}
        </button>
      </div>

      {/* لوحة ظهور التنبيهات الحية */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl font-bold mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl font-bold mb-6">
          {error}
        </div>
      )}

      {/* التبويب الأول: باقات ومنظومة الفوترة وترقيات العقود */}
      {activeTab === 'billing' && (
        <div className="space-y-6">

          {/* صندوق بيانات مستأجر النظام والشركة */}
          <div className={`p-6 rounded-2xl space-y-6 transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
            <div>
              <h2 className={`text-xs font-black border-b pb-2 mb-4 ${isDark ? 'text-blue-400 border-slate-800' : 'text-blue-700 border-slate-200'}`}>
                {t.tenantTitle}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 text-slate-450">{t.companyLabel}</label>
                  <input 
                    type="text" 
                    disabled 
                    className={`w-full border rounded-lg p-2.5 text-xs font-bold ${
                      isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`} 
                    value={tenant.companyName} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 text-slate-450">{t.subdomainLabel}</label>
                  <div className="flex" dir="ltr">
                    <span className={`border border-r-0 rounded-l-lg px-3.5 py-2.5 text-[10px] font-bold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      .orca.az-ez.pro
                    </span>
                    <input 
                      type="text" 
                      disabled 
                      className={`flex-1 border rounded-r-lg p-2.5 text-xs font-bold text-left ${
                        isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`} 
                      value={tenant.subdomain} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* مصفوفة جرافيك باقات الاشتراك مع الـ Toggle Switch للتحويل السنوي والشهري */}
            <div className="pt-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6 gap-4">
                <h2 className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  {t.pricingTitle}
                </h2>
                
                {/* مفتاح التبديل الجغرافي للمصداقية السنوية والشهرية */}
                <div className={`p-1 rounded-xl border flex gap-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {lang === 'AR' ? "سداد شهري" : "Monthly"}
                  </button>
                  <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'yearly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span>{lang === 'AR' ? "اشتراك سنوي مسبق" : "Annually"}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[8px] px-1 rounded">خصم يصل لـ ٢٣٪</span>
                  </button>
                </div>
              </div>

              {/* شبكة الباقات العقارية الأربعة المعتمدة */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* 1️⃣ كرت: نسخة التجربة الحرة (٣ أيام) */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all ${
                  plan === 'trial' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-white')
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-black text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.planTrial}</h3>
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                        {lang === 'AR' ? "٣ أيام مجاناً" : "3 DAYS FREE"}
                      </span>
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black font-inter ${isDark ? 'text-white' : 'text-slate-900'}`}>{toArabicNumerals(0)}</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.priceMonth}</span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 text-slate-400 font-bold ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
                      <li>✔ {lang === 'AR' ? "تجربة حاسبة الملاءة المالية DSR" : "Try DSR Calculator"}</li>
                      <li>✔ {lang === 'AR' ? "إدخال حتى ٥٠ عميل محتمل مجاناً" : "Up to 50 test leads"}</li>
                      <li>✔ {lang === 'AR' ? "تجربة وكيل حملات مبيعات محدود" : "Limited campaign agent access"}</li>
                      <li>✔ {lang === 'AR' ? "لوحة تتبع عقارية وإدارية مبسطة" : "Basic real estate dashboard"}</li>
                    </ul>
                  </div>
                  <button disabled className="w-full mt-6 p-2.5 rounded-xl text-xs font-bold bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed text-center">
                    {lang === 'AR' ? "بوابة استكشاف حرة" : "Trial Portal"}
                  </button>
                </div>

                {/* 2️⃣ كرت: الباقة الأساسية — Essential */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all ${
                  plan === 'basic' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-slate-800 bg-slate-900/20 hover:border-blue-900' : 'border-slate-200 bg-white hover:border-blue-400')
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planBasic}</h3>
                      {plan === 'basic' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">{t.activePlan}</span>}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black font-inter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {billingCycle === 'yearly' ? toArabicNumerals(999) : toArabicNumerals(1299)}
                      </span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {billingCycle === 'yearly' ? t.priceYearlyLabel : t.priceMonth}
                      </span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 text-slate-400 font-bold ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <li>✔ {t.limitStaff.replace('{count}', toArabicNumerals(5))}</li>
                      <li>✔ {t.limitLeads.replace('{count}', toArabicNumerals(500))}</li>
                      <li>✔ {t.limitProjects.replace('{count}', toArabicNumerals(3))}</li>
                      <li>✔ {lang === 'AR' ? "ربط فوري بـ منصة إيجار ووزارة الفوترة زاتكا" : "Unified Ejar & Zatka linkage"}</li>
                      <li>✔ {t.limitAgents.replace('{count}', toArabicNumerals(1))}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('basic')}
                    disabled={loadingPlan !== null || plan === 'basic'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-black ${
                      plan === 'basic' ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {loadingPlan === 'basic' ? t.loadingAction : plan === 'basic' ? t.currentPlanLabel : t.upgradeBtn}
                  </button>
                </div>

                {/* 3️⃣ كرت: الباقة الاحترافية — Elite (الأكثر طلباً وتوهجاً جرافيكياً) */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden transition-all ${
                  plan === 'silver' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-blue-900 bg-blue-950/5 hover:border-blue-600' : 'border-blue-200 bg-white hover:border-blue-500')
                }`}>
                  {plan !== 'silver' && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-white font-black text-[8px] px-3 py-1 rounded-bl-lg tracking-wider">
                      {lang === 'AR' ? "الأكثر مبيعاً" : "MOST POPULAR"}
                    </span>
                  )}
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planSilver}</h3>
                      {plan === 'silver' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">{t.activePlan}</span>}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black font-inter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {billingCycle === 'yearly' ? toArabicNumerals("2,799") : toArabicNumerals("3,499")}
                      </span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {billingCycle === 'yearly' ? t.priceYearlyLabel : t.priceMonth}
                      </span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 text-slate-300 font-bold ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <li className="text-blue-400">✔ {t.limitStaff.replace('{count}', toArabicNumerals(10))}</li>
                      <li>✔ {t.limitLeadsGold}</li>
                      <li>✔ {t.limitAgentsGold.replace('{count}', toArabicNumerals(3))} <span className="text-blue-400 font-black">(ساهر للتسويق + سند للتحصيل)</span></li>
                      <li>✔ {lang === 'AR' ? "نظام محاسبي كامل (ERP) لسندات القبض والسعي" : "Complete integrated accounting ERP engine"}</li>
                      <li>✔ {lang === 'AR' ? "عقود تسويق ووساطة رسمية معتمدة حياً" : "Official digital mediation contracts handles"}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('silver')}
                    disabled={loadingPlan !== null || plan === 'silver'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(0,123,255,0.2)] ${
                      plan === 'silver' ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer hover:scale-[1.01]'
                    }`}
                  >
                    {loadingPlan === 'silver' ? t.loadingAction : plan === 'silver' ? t.currentPlanLabel : t.upgradeBtnSilver}
                  </button>
                </div>

                {/* 4️⃣ كرت: الباقة الماسية — Bespoke */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all ${
                  plan === 'gold' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-slate-800 bg-slate-900/20 hover:border-blue-900' : 'border-slate-200 bg-white hover:border-blue-400')
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planGold}</h3>
                      {plan === 'gold' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">{t.activePlan}</span>}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black font-inter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {billingCycle === 'yearly' ? toArabicNumerals("6,499") : toArabicNumerals("7,999")}
                      </span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {billingCycle === 'yearly' ? t.priceYearlyLabel : t.priceMonth}
                      </span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 text-slate-400 font-bold ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <li className="text-emerald-500">✔ {t.limitStaffGold}</li>
                      <li>✔ {t.limitLeadsGold}</li>
                      <li>✔ {t.limitProjectsGold}</li>
                      <li>✔ {t.limitAgentsGoldEnterprise}</li>
                      <li>✔ {lang === 'AR' ? "تقارير وتحليلات تنبؤية لحركة السوق العقاري" : "Predictive AI property market reports"}</li>
                      <li>✔ {lang === 'AR' ? "مدير حساب مخصص متوفر على مدار ٢٤ ساعة" : "Dedicated account support 24/7 manager"}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('gold')}
                    disabled={loadingPlan !== null || plan === 'gold'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-black ${
                      plan === 'gold' ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {loadingPlan === 'gold' ? t.loadingAction : plan === 'gold' ? t.currentPlanLabel : t.upgradeBtnGold}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* محرك تنشيط وتمديد وكيل الحملات المؤقت "ساهر" — التكلفة الثابتة الصفرية */}
          <div className={`p-6 rounded-2xl transition-all space-y-6 ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
            <div className={`border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
              isDark ? 'border-slate-800' : 'border-slate-205'
            }`}>
              <div>
                <h2 className="text-xs font-black metallic-text-gradient">{t.addonTitle}</h2>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.addonSub}
                </p>
              </div>
              <div className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-350' : 'bg-slate-50 border-slate-200 text-slate-750'
              }`}>
                <span>{t.addonAdded}</span>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-xs font-black">
                  {toArabicNumerals(extraAgentsUsed)} {lang === 'AR' ? "تفعيلات سابقة" : "slots"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                {/* صندوق الرسالة العقارية التسويقية المستجيبة للأداء والأرقام */}
                <div className={`p-4 border rounded-xl space-y-2.5 transition-all duration-300 ${
                  upselling.allowed 
                    ? (isDark ? 'bg-blue-950/20 border-blue-900/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-800') 
                    : 'bg-rose-950/30 border-rose-800/50 text-rose-400'
                }`}>
                  <p className="text-xs font-bold leading-relaxed">
                    {upselling.message}
                  </p>
                </div>

                <div className={`p-4 border rounded-xl space-y-2.5 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-205'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t.addonPrice}</span>
                    <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {upselling.price ? `${toArabicNumerals(upselling.price)} ر.س` : (lang === 'AR' ? "مغلق تلقائياً" : "Locked")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t.addonMax}</span>
                    <span className={`font-bold ${upselling.allowed ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {upselling.allowed ? (lang === 'AR' ? "خط التمديد متاح" : "Extension Allowed") : (lang === 'AR' ? "🔒 يتطلب ترقية الباقة الكاملة" : "🔒 Action Locked")}
                    </span>
                  </div>
                </div>
              </div>

              {/* بطاقة الدفع المباشر (تأكيد السداد والترحيل الآمن) */}
              <div className={`p-6 rounded-2xl flex flex-col justify-between h-full border ${
                isDark ? 'bg-slate-950/90 border-slate-850 text-white' : 'bg-[#0f172a] text-white border-slate-800'
              }`}>
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">{t.addonCostTitle}</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-2xl font-black text-blue-500 font-inter">
                      {upselling.price ? toArabicNumerals(upselling.price) : toArabicNumerals(0)}
                    </span>
                    <span className="text-[10px] text-slate-300">{t.addonCostTotal}</span>
                  </div>
                </div>
                <button
                  onClick={handleBuyAgents}
                  disabled={loadingAgent || !upselling.allowed}
                  className={`w-full mt-5 p-3 rounded-xl text-xs font-black transition-all ${
                    upselling.allowed
                      ? 'bg-gradient-to-r from-[#C0C0C0] via-[#007BFF] to-[#C0C0C0] text-slate-950 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,123,255,0.25)] cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {loadingAgent ? t.loadingAction : upselling.buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* التبويب الثاني: إدارة مقاعد مستشاري مبيعات المنشأة العقارية */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* لوحة التحكم الجانبية وأدوات الإضافة */}
          <div className="lg:col-span-1 space-y-6">

            {/* عداد سعة مقاعد المستشارين بالباقة */}
            <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
              isDark ? 'frosted-glass-dark' : 'milky-glass-light'
            } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-xs font-extrabold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                {t.staffCapacityTitle}
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t.staffActiveSeats}</span>
                  <span className={`font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {toArabicNumerals(currentUsersCount)} / {plan === 'gold' ? t.unlimited : toArabicNumerals(limit)}
                  </span>
                </div>

                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <div 
                    className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${plan === 'gold' ? 25 : Math.min(100, (currentUsersCount / limit) * 100)}%` }}
                  />
                </div>
                {isLimitReached && (
                  <p className="text-[10px] text-rose-500 font-bold leading-relaxed pt-1">
                    {t.limitReachedAlert.replace('{plan}', planTitles[plan] || plan)}
                  </p>
                )}
              </div>
            </div>

            {/* نموذج إضافة حساب مستشار عقاري جديد للشركة */}
            {currentUserRole === "ADMIN" && (
              <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
                isDark ? 'frosted-glass-dark' : 'milky-glass-light'
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <h3 className={`text-xs font-extrabold border-b pb-2 ${isDark ? 'text-blue-400 border-slate-800' : 'text-blue-700 border-slate-200'}`}>
                  {t.addStaffTitle}
                </h3>

                <form onSubmit={handleAddEmployee} className="space-y-3.5">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.staffName}</label>
                    <input 
                      type="text" 
                      name="name"
                      required
                      placeholder="أحمد الغامدي" 
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.staffEmail}</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      placeholder="sales@company.com" 
                      className={`w-full rounded-lg p-2.5 text-xs text-left focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.staffRole}</label>
                    <select 
                      name="role"
                      required
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-850'
                      }`}
                    >
                      <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                      <option value="SALES_MANAGER">{t.roleManager}</option>
                      <option value="MARKETING">{t.roleMarketing}</option>
                      <option value="READ_ONLY">{t.roleReadOnly}</option>
                      <option value="ADMIN">{t.roleAdmin}</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.staffPassword}</label>
                    <input 
                      type="text" 
                      name="password"
                      required
                      defaultValue="123456"
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingCreate || isLimitReached}
                    className={`w-full p-2.5 rounded-xl text-xs font-black text-center transition-all cursor-pointer ${
                      isLimitReached 
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {loadingCreate ? t.actionCreatePrep : t.staffSubmit}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* سجل ومراقبة خطوط الموظفين النشطين */}
          <div className="lg:col-span-2 space-y-6">

            {/* المودال المصغر لتعديل أدوار الصلاحيات */}
            {editingUser && (
              <div className={`p-5 rounded-2xl border shadow-sm space-y-3.5 transition-all ${
                isDark ? 'frosted-glass-dark' : 'bg-blue-50/40 border-blue-100'
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <div className={`flex justify-between items-center border-b pb-2 mb-2 ${isDark ? 'border-slate-850' : 'border-blue-100'}`}>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                    {t.editStaffTitle}<span className="text-blue-500">{editingUser.name}</span>
                  </h4>
                  <button onClick={() => setEditingUser(null)} className="text-xs text-gray-400 hover:text-slate-850 dark:hover:text-white">{t.editStaffCancel}</button>
                </div>
                <form onSubmit={handleEditRole} className="flex flex-wrap items-end gap-3.5">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[9px] font-bold mb-1.5 text-slate-450">{t.editStaffName}</label>
                    <input 
                      type="text" 
                      name="name" 
                      defaultValue={editingUser.name}
                      required
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[9px] font-bold mb-1.5 text-slate-450">{t.editStaffRole}</label>
                    <select 
                      name="role" 
                      defaultValue={editingUser.role}
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950/70 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-850'
                      }`}
                    >
                      <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                      <option value="SALES_MANAGER">{t.roleManager}</option>
                      <option value="MARKETING">{t.roleMarketing}</option>
                      <option value="READ_ONLY">{t.roleReadOnly}</option>
                      <option value="ADMIN">{t.roleAdmin}</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-lg transition-colors cursor-pointer">
                    {t.editStaffSave}
                  </button>
                </form>
              </div>
            )}

            {/* جدول مستشاري المبيعات النشطين */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
              isDark ? 'frosted-glass-dark' : 'milky-glass-light'
            } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
              <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className="font-bold text-xs">{t.staffTableTitle}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-extrabold ${
                      isDark ? 'bg-slate-950/40 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600'
                    } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                      <th className="px-5 py-3">{t.staffTableId}</th>
                      <th className="px-4 py-3">{t.staffTableEmail}</th>
                      <th className="px-4 py-3">{t.staffTableStatus}</th>
                      <th className="px-5 py-3">{t.staffTableActions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {users.map((user) => {
                      const roleTranslated = ROLE_TRANSLATIONS[lang]?.[user.role] || ROLE_TRANSLATIONS.AR[user.role] || user.role;
                      return (
                        <tr key={user.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/20 text-slate-300' : 'hover:bg-slate-50/60 text-slate-700'}`}>
                          <td className="px-5 py-4 font-bold">
                            <p>{user.name}</p>
                            <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {roleTranslated}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-400 dark:text-slate-350">{user.email}</p>
                            <p className="text-[9px] text-gray-500 mt-0.5" dir="ltr">
                              {toArabicNumerals(new Date(user.createdAt).toLocaleDateString('en-US'))}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold ${
                              user.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {user.isActive ? t.statusActive : t.statusInactive}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {currentUserRole === "ADMIN" ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={loadingActionId === user.id}
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                                    user.isActive ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'
                                  }`}
                                >
                                  {loadingActionId === user.id ? t.loadingAction : (user.isActive ? t.btnToggleDeactivate : t.btnToggleActivate)}
                                </button>
                                <button 
                                  onClick={() => setEditingUser(user)}
                                  disabled={loadingActionId === user.id}
                                  className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded"
                                >
                                  {t.btnEdit}
                                </button>
                                <button 
                                  onClick={() => handleDeleteEmployee(user.id)}
                                  disabled={loadingActionId === user.id}
                                  className="text-[10px] font-bold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded"
                                >
                                  {t.btnDelete}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-bold">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
