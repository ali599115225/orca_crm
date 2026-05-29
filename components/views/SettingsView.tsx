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
  basic: 2,
  silver: 10,
  gold: 99999, // لا محدود
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

const ROLE_TRANSLATIONS = {
  AR: {
    ADMIN: "المدير العام (Admin)",
    SALES_MANAGER: "مدير Mبيعات",
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
    title: "إعدادات النظام والعمليات السحابية (SaaS Settings)",
    desc: "تخصيص وإدارة اشتراكك العقاري، وإدارة حسابات موظفي المبيعات والوصول لعام {year}م.",
    currentPlan: "الباقة الحالية: ",
    tabBilling: "💳 باقة الاشتراك والترقيات",
    tabStaff: "👥 إدارة فريق العمل ({count} موظف)",
    successMsg: "تم إضافة الموظف الجديد بنجاح وتفعيل حسابه بالنظام.",
    tenantTitle: "بيانات الشركة ومستأجر النظام",
    companyLabel: "اسم المنشأة العقارية",
    subdomainLabel: "النطاق الفرعي (Subdomain)",
    pricingTitle: "باقات وخطط الاشتراك لترقية النظام",
    planBasic: "الباقة الأساسية",
    planSilver: "الباقة الفضية",
    planGold: "الباقة الذهبية",
    activePlan: "نشطة حالياً",
    priceMonth: " ر.س / شهرياً",
    limitStaff: "✔ حد الموظفين: {count} موظفين بشرين",
    limitStaffGold: "✔ حد الموظفين: لا محدود (Unlimited)",
    limitLeads: "✔ إدخال حتى {count} عميل محتمل",
    limitLeadsGold: "✔ عملاء ومشاريع استثمارية غير محدودة",
    limitProjects: "✔ إدارة حتى {count} مشاريع عقارية",
    limitProjectsGold: "✔ دعم فني كامل وتصميم عقود رسمي",
    limitAgents: "✔ {count} وكيل ذكاء اصطناعي ونظام حماية",
    limitAgentsGold: "✔ {count} وكلاء أذكياء وتكامل واتساب كامل",
    limitAgentsGoldEnterprise: "✔ {count} وكلاء ذكاء اصطناعي وتكامل سحابي",
    upgradeBtn: "تحويل للباقة (مدى / فيزا)",
    upgradeBtnSilver: "ترقية للباقة (مدى / فيزا)",
    upgradeBtnGold: "ترقية للباقة (مدى / فيزا)",
    currentPlanLabel: "باقتك الحالية",
    addonTitle: "تفعيل وتمديد وكلاء الذكاء الاصطناعي للحملات",
    addonSub: "نظام الترقية والتفعيل المؤقت للطاقم الآلي المستقل للحملات التسويقية والمبيعات المتقدمة.",
    addonAdded: "الأشهر المفعلة سابقاً:",
    addonPrice: "السعر الحالي للتفعيل:",
    addonMax: "حالة التفعيل الحالية:",
    addonCountLabel: "تمديد الاشتراك الحالي:",
    addonCostTitle: "تفاصيل تكلفة بوابة الدفع الآمنة",
    addonCostTotal: " ر.س القيمة الإجمالية",
    addonBuyBtn: "تأكيد وتفعيل الوكيل الآن ➔",
    staffCapacityTitle: "حالة مقاعد الموظفين بالباقة",
    staffActiveSeats: "المقاعد النشطة:",
    unlimited: "لا محدود",
    limitReachedAlert: "⚠️ لقد استنفدت كامل مقاعد الموظفين المتاحة لباقة {plan}. قم بترقية اشتراكك لفتح مقاعد إضافية.",
    addStaffTitle: "إضافة موظف عقاري جديد",
    staffName: "الاسم الكامل *",
    staffEmail: "البريد الإلكتروني المعتمد *",
    staffRole: "دور الصلاحية والنفاذ *",
    roleEmployee: "مستشار عقاري (مبيعات)",
    roleManager: "مدير مبيعات",
    roleMarketing: "إدارة تسويق",
    roleReadOnly: "مشاهدة فقط",
    roleAdmin: "المدير العام (Admin)",
    staffPassword: "كلمة المرور الافتراضية *",
    staffSubmit: "إنشاء حساب الموظف ➔",
    editStaffTitle: "تعديل صلاحيات الموظف: ",
    editStaffSave: "حفظ التغييرات",
    editStaffCancel: "✕ إلغاء",
    editStaffName: "الاسم الكامل",
    editStaffRole: "دور الصلاحية",
    actionUpgradePrep: "جاري التحضير...",
    actionCreatePrep: "جاري إنشاء الحساب...",
    staffTableTitle: "جدول الموظفين النشطين بالشركة",
    staffTableId: "المعرف",
    staffTableEmail: "البريد والتسجيل",
    staffTableStatus: "حالة الحساب",
    staffTableActions: "إجراءات",
    statusActive: "نشط",
    statusInactive: "معطل",
    btnToggleDeactivate: "تعطيل",
    btnToggleActivate: "تفعيل",
    btnEdit: "تعديل الصلاحية",
    btnDelete: "حذف نهائي",
    confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً من شركتك العقارية؟",
    loadingAction: "جاري..."
  },
  EN: {
    title: "System & SaaS Settings",
    desc: "Customize your real estate subscription and manage staff accounts and credentials for {year}.",
    currentPlan: "Current Plan: ",
    tabBilling: "💳 Subscription Plan & Upgrades",
    tabStaff: "👥 Staff Management ({count} users)",
    successMsg: "New employee added successfully and account activated.",
    tenantTitle: "Company Details & System Tenant",
    companyLabel: "Real Estate Company Name",
    subdomainLabel: "Subdomain",
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
    limitAgents: "✔ {count} AI agents & cyber shield",
    limitAgentsGold: "✔ {count} AI agents & WhatsApp integrations",
    limitAgentsGoldEnterprise: "✔ {count} AI agents & cloud setups",
    upgradeBtn: "Switch Plan (Mada / Visa)",
    upgradeBtnSilver: "Upgrade Plan (Mada / Visa)",
    upgradeBtnGold: "Upgrade Plan (Mada / Visa)",
    currentPlanLabel: "Your Current Plan",
    addonTitle: "Activate & Extend Campaign AI Agents",
    addonSub: "Upgrade system for temporary independent automated campaign and advanced sales agents.",
    addonAdded: "Previously activated months:",
    addonPrice: "Current activation price:",
    addonMax: "Current activation state:",
    addonCountLabel: "Extend current status:",
    addonCostTitle: "Secure Payment Gateway Cost Details",
    addonCostTotal: " SAR Total Value",
    addonBuyBtn: "Confirm & Activate Agent Now ➔",
    staffCapacityTitle: "Staff Seat Allocation",
    staffActiveSeats: "Active seats:",
    unlimited: "Unlimited",
    limitReachedAlert: "⚠️ You have used all available seats for the {plan} plan. Please upgrade to unlock more slots.",
    addStaffTitle: "Add New Employee",
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
    staffTableId: "ID",
    staffTableEmail: "Email & Registration Date",
    staffTableStatus: "Account Status",
    staffTableActions: "Actions",
    statusActive: "Active",
    statusInactive: "Inactive",
    btnToggleDeactivate: "Deactivate",
    btnToggleActivate: "Active",
    btnEdit: "Edit Permissions",
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // تتبع الأشهر لتطبيق محرك هندسة الترقية الذكية (Upselling Engine)
  const [extraAgentsUsed, setExtraAgentsUsed] = useState(tenant.extraAgents || 0);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // حالات إدارة الموظفين
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
      setError(result.error || (lang === 'AR' ? "عذراً، فشل بدء عملية الدفع والاتصال بالبوابة." : "Sorry, payment initialization failed."));
    }
  };

  // محرك احتساب الأسعار المحدثة ورسائل الحظر حسب خطة العميل وعدد مرات التفعيل السابقة
  const getUpsellingEngineStatus = (currentPlan: string, monthsCount: number) => {
    const planNormalized = currentPlan.toLowerCase();
    
    // محرك الترقية لـ الباقة الأساسية والباقة الاحترافية الفضية
    if (planNormalized === "basic" || planNormalized === "silver" || planNormalized === "professional") {
      if (monthsCount === 0) {
        return {
          allowed: true,
          price: 299,
          buttonText: lang === 'AR' ? "تفعيل وكيل الحملات (الشهر الأول)" : "Activate Agent (1st Month)",
          message: lang === 'AR' 
            ? "💡 فرصة تفعيل للمرة الأولى: اختبر قوة الأتمتة الكاملة لوكيل الحملات الإضافي لإغلاق الصفقات العقارية بـ ٢٩٩ ريال فقط للشهر الأول." 
            : "💡 First-time offer: Activate extra campaign agent slots to automate your sales funnel for just 299 SAR for the first month.",
        };
      } else if (monthsCount === 1) {
        return {
          allowed: true,
          price: 400,
          buttonText: lang === 'AR' ? "تمديد تفعيل الوكيل (الشهر الثاني)" : "Extend Agent Slot (2nd Month)",
          message: lang === 'AR'
            ? "⚡ تمديد الاشتراك للشهر الثاني متاح الآن بقيمة ٤٠٠ ريال لتأمين استقرار تدفقات حملاتك التسويقية."
            : "⚡ Second-month extension is available for 400 SAR to ensure the consistency of your automated real estate flows.",
        };
      } else {
        return {
          allowed: false,
          price: null,
          buttonText: lang === 'AR' ? "🔒 يجب ترقية الباقة للتفعيل" : "🔒 Upgrade Required to Extend",
          message: planNormalized === "basic"
            ? (lang === 'AR' ? "❌ يرجى ترقية الاشتراك إلى الباقة الفضية الاحترافية للاستمرار في استخدام وتفعيل وكلاء إضافيين!" : "❌ Please upgrade your subscription to Silver Plan to continue activating additional agent slots!")
            : (lang === 'AR' ? "❌ يرجى ترقية الاشتراك إلى الباقة الذهبية المتميزة لفتح صلاحيات التفعيل اللامحدودة ومزامنة البيانات!" : "❌ Please upgrade your subscription to Gold Plan to unlock unlimited agent capacity and cloud syncing!"),
        };
      }
    }

    // الباقة الذهبية متاح لها التفعيل المستمر أو تكون الصلاحيات مفتوحة
    return {
      allowed: true,
      price: 0,
      buttonText: lang === 'AR' ? "الوكلاء نشطون مسبقاً" : "Agents Already Active",
      message: lang === 'AR' ? "🔒 باقتك الحالية تتضمن كامل الطاقم الرقمي المستقل." : "🔒 Your current enterprise plan includes full automated agent slots.",
    };
  };

  const currentPlanName = (tenant.subscriptionPlan || "basic").toLowerCase();
  const upselling = getUpsellingEngineStatus(currentPlanName, extraAgentsUsed);

  const handleBuyAgents = async () => {
    if (!upselling.allowed) return;
    setSuccess(null);
    setError(null);
    setLoadingAgent(true);

    // نمرر القيمة الافتراضية للبوابة للوكيل الإضافي
    const result = await initiateAddonPaymentAction(1);
    setLoadingAgent(false);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || (lang === 'AR' ? "عذراً، فشل بدء عملية الدفع لشراء وتمديد الوكلاء." : "Sorry, payment initialization failed for purchasing agents."));
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
      setError(result.error || (lang === 'AR' ? "عذراً، فشل إنشاء حساب الموظف." : "Sorry, failed to create employee account."));
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
      const toggleMsg = lang === 'AR' 
        ? `تم ${user.isActive ? 'تعطيل' : 'تفعيل'} حساب الموظف بنجاح.`
        : `Employee account has been successfully ${user.isActive ? 'deactivated' : 'activated'}.`;
      setSuccess(toggleMsg);
      router.refresh();
    } else {
      setError(result.error || (lang === 'AR' ? "فشل تعديل حالة الموظف." : "Failed to toggle employee status."));
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
      setSuccess(lang === 'AR' ? "تم تحديث صلاحيات وبيانات الموظف بنجاح." : "Employee permissions updated successfully.");
      router.refresh();
    } else {
      setError(result.error || (lang === 'AR' ? "فشل تعديل بيانات الموظف." : "Failed to update employee details."));
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
      setSuccess(lang === 'AR' ? "تم حذف حساب الموظف بالكامل وتحرير مقعد في باقتك." : "Employee account deleted successfully.");
      router.refresh();
    } else {
      setError(result.error || (lang === 'AR' ? "فشل عملية حذف الموظف." : "Failed to delete employee account."));
    }
  };

  const plan = currentPlanName;
  const limit = PLAN_LIMITS[plan] || 2;
  const currentUsersCount = users.length;
  const isLimitReached = currentUsersCount >= limit;

  const isDark = theme === 'dark';
  const planTitles = PLAN_TITLES[lang] || PLAN_TITLES.AR;

  return (
    <div className={`settings-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>

      <style dangerouslySetInnerHTML={{ __html: `
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
        }
        
        .settings-page-wrapper {
          min-height: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(0, 123, 255, 0.3) !important; /* اعتلاء خط الشعار المعتمد بالأزرق الحيوي */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
        
        .metallic-text-gradient {
          background: linear-gradient(90deg, #C0C0C0 0%, #007BFF 50%, #C0C0C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* الهيدر الموحد وشارة الاشتراك العائم */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
            {t.desc.replace('{year}', toArabicNumerals(2026))}
          </p>
        </div>

        <div className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 text-center border ${
          isDark 
            ? 'bg-blue-950/20 text-blue-400 border-blue-900/50 shadow-[0_0_15px_rgba(0,123,255,0.2)]' 
            : 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
        }`}>
          {t.currentPlan}{planTitles[plan] || tenant.subscriptionPlan}
        </div>
      </div>

      {/* شريط علامات التبويب السحابي */}
      <div className={`flex border-b gap-2 mb-6 ${isDark ? 'border-slate-800' : 'border-slate-200'} ${lang === 'AR' ? 'justify-start' : 'justify-end'}`}>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-blue-500 text-blue-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          {t.tabBilling}
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'border-blue-500 text-blue-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-355'
          }`}
        >
          {t.tabStaff.replace('{count}', toArabicNumerals(currentUsersCount))}
        </button>
      </div>

      {/* التنبيهات العامة بالنظام */}
      {success && (
        <div className="bg-emerald-950/20 border border-emerald-800/50 text-emerald-400 text-xs p-4 rounded-xl font-bold mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 text-xs p-4 rounded-xl font-bold mb-6">
          {error}
        </div>
      )}

      {/* التبويب الأول: باقة الاشتراك وترقيات بيانات الشركة */}
      {activeTab === 'billing' && (
        <div className="space-y-6">

          {/* بيانات الشركة ومستأجر النظام */}
          <div className={`p-6 rounded-2xl space-y-6 transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
            <div>
              <h2 className={`text-xs font-extrabold border-b pb-2 mb-4 ${isDark ? 'text-blue-400 border-slate-800' : 'text-blue-700 border-slate-200'}`}>
                {t.tenantTitle}
              </h2>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-5`}>
                <div>
                  <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.companyLabel}</label>
                  <input 
                    type="text" 
                    disabled 
                    className={`w-full border rounded-lg p-2.5 text-xs font-bold ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 text-slate-300' 
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`} 
                    value={tenant.companyName} 
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.subdomainLabel}</label>
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
                        isDark 
                          ? 'bg-slate-950/70 border-slate-800 text-slate-300' 
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`} 
                      value={tenant.subdomain} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* مصفوفة باقات وخطط ترقية النظام */}
            <div className="pt-2">
              <h2 className={`text-xs font-extrabold border-b pb-4 mb-4 ${isDark ? 'text-blue-400 border-slate-800' : 'text-blue-700 border-slate-200'}`}>
                {t.pricingTitle}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* الباقة الأساسية */}
                <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-sm transition-all ${
                  plan === 'basic' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-slate-800 bg-slate-900/30 hover:border-blue-900' : 'border-slate-200 bg-white hover:border-blue-500')
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planBasic}</h3>
                      {plan === 'basic' && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">
                          {t.activePlan}
                        </span>
                      )}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{toArabicNumerals(199)}</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.priceMonth}</span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 ${isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
                      <li>✔ {t.limitStaff.replace('{count}', toArabicNumerals(2))}</li>
                      <li>✔ {t.limitLeads.replace('{count}', toArabicNumerals(500))}</li>
                      <li>✔ {t.limitProjects.replace('{count}', toArabicNumerals(3))}</li>
                      <li>✔ {t.limitAgents.replace('{count}', toArabicNumerals(1))}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('basic')}
                    disabled={loadingPlan !== null || plan === 'basic'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${
                      plan === 'basic' 
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {loadingPlan === 'basic' ? t.loadingAction : plan === 'basic' ? t.currentPlanLabel : t.upgradeBtn}
                  </button>
                </div>

                {/* الباقة الفضية */}
                <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all ${
                  plan === 'silver' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-blue-900 bg-blue-950/5' : 'border-blue-200 bg-white')
                }`}>
                  {plan !== 'silver' && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-white font-bold text-[8px] px-3 py-1 rounded-bl-lg">
                      {lang === 'AR' ? "الأكثر طلباً" : "Most Popular"}
                    </span>
                  )}
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planSilver}</h3>
                      {plan === 'silver' && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">
                          {t.activePlan}
                        </span>
                      )}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{toArabicNumerals(599)}</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.priceMonth}</span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 ${isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
                      <li>✔ {t.limitStaff.replace('{count}', toArabicNumerals(10))}</li>
                      <li>✔ {t.limitLeadsGold}</li>
                      <li>✔ {t.limitAgentsGold.replace('{count}', toArabicNumerals(3))}</li>
                      <li>✔ {lang === 'AR' ? "تتبع المهام والزيارات للمستشارين" : "Track tasks and field visits"}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('silver')}
                    disabled={loadingPlan !== null || plan === 'silver'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${
                      plan === 'silver' 
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                  >
                    {loadingPlan === 'silver' ? t.loadingAction : plan === 'silver' ? t.currentPlanLabel : t.upgradeBtnSilver}
                  </button>
                </div>

                {/* الباقة الذهبية */}
                <div className={`border rounded-2xl p-6 flex flex-col justify-between shadow-sm transition-all ${
                  plan === 'gold' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                    : (isDark ? 'border-slate-800 bg-slate-900/30 hover:border-blue-900' : 'border-slate-200 bg-white hover:border-blue-500')
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.planGold}</h3>
                      {plan === 'gold' && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black">
                          {t.activePlan}
                        </span>
                      )}
                    </div>
                    <div className="my-4">
                      <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{toArabicNumerals("1,199")}</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.priceMonth}</span>
                    </div>
                    <ul className={`text-[10px] space-y-2.5 mt-4 border-t pt-4 ${isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
                      <li>✔ {t.limitStaffGold}</li>
                      <li>✔ {t.limitAgentsGoldEnterprise.replace('{count}', toArabicNumerals(5))}</li>
                      <li>✔ {t.limitLeadsGold}</li>
                      <li>✔ {t.limitProjectsGold}</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('gold')}
                    disabled={loadingPlan !== null || plan === 'gold'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${
                      plan === 'gold' 
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-700/50 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {loadingPlan === 'gold' ? t.loadingAction : plan === 'gold' ? t.currentPlanLabel : t.upgradeBtnGold}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* محرك هندسة الترقية الذكية المطور للوكلاء (SaaS Upselling Engine Subsystem) */}
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
                  {toArabicNumerals(extraAgentsUsed)} {lang === 'AR' ? "أشهر تفعيل" : "months"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                {/* صندوق الرسائل الذكي حسب الاستحقاق وقفل الشهر الثالث */}
                <div className={`p-4 border rounded-xl space-y-2.5 transition-all duration-300 ${
                  upselling.allowed 
                    ? (isDark ? 'bg-blue-950/20 border-blue-900/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-800') 
                    : 'bg-rose-950/30 border-rose-800/50 text-rose-400 animate-pulse'
                }`}>
                  <p className="text-xs font-bold leading-relaxed">
                    {upselling.message}
                  </p>
                </div>

                <div className={`p-4 border rounded-xl space-y-2.5 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-205'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-505'}>{t.addonPrice}</span>
                    <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {upselling.price ? `${toArabicNumerals(upselling.price)} ر.س` : (lang === 'AR' ? "محجوب" : "Locked")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-505'}>{t.addonMax}</span>
                    <span className={`font-bold ${upselling.allowed ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {upselling.allowed ? (lang === 'AR' ? "متاح التمديد المباشر" : "Extension Allowed") : (lang === 'AR' ? "🔒 حد التمديد مستنفد" : "🔒 Extension Exhausted")}
                    </span>
                  </div>
                </div>
              </div>

              {/* بطاقة تفاصيل الفوترة وتأكيد الإجراء السيادي */}
              <div className={`p-6 rounded-2xl flex flex-col justify-between h-full border ${
                isDark ? 'bg-slate-950/80 border-slate-850 text-white' : 'bg-[#0f172a] text-white border-slate-800'
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
                      ? 'bg-gradient-to-r from Im-[#C0C0C0] via-[#007BFF] to-[#C0C0C0] text-slate-950 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,123,255,0.3)] cursor-pointer'
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

      {/* التبويب الثاني: إدارة موظفي المنشأة العقارية */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* لوحة التحكم والإضافة */}
          <div className="lg:col-span-1 space-y-6">

            {/* مؤشر سعة الموظفين */}
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
                    style={{ width: `${plan === 'gold' ? 30 : Math.min(100, (currentUsersCount / limit) * 100)}%` }}
                  />
                </div>
                {isLimitReached && (
                  <p className="text-[10px] text-rose-500 font-bold leading-relaxed pt-1">
                    {t.limitReachedAlert.replace('{plan}', planTitles[plan] || plan)}
                  </p>
                )}
              </div>
            </div>

            {/* استمارة إضافة موظف جديد */}
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
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-900'
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
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-900'
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
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-850'
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
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-900'
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

          {/* قائمة الموظفين */}
          <div className="lg:col-span-2 space-y-6">

            {/* مودال تعديل الصلاحية المصغر */}
            {editingUser && (
              <div className={`p-5 rounded-2xl border shadow-sm space-y-3.5 transition-all ${
                isDark ? 'frosted-glass-dark' : 'bg-blue-50/50 border-blue-200'
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <div className={`flex justify-between items-center border-b pb-2 mb-2 ${
                  isDark ? 'border-slate-850' : 'border-blue-200'
                }`}>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                    {t.editStaffTitle}<span className="text-blue-500">{editingUser.name}</span>
                  </h4>
                  <button onClick={() => setEditingUser(null)} className="text-xs text-gray-400 hover:text-slate-800 dark:hover:text-white">{t.editStaffCancel}</button>
                </div>
                <form onSubmit={handleEditRole} className="flex flex-wrap items-end gap-3.5">
                  <div className="flex-1 min-w-[150px]">
                    <label className={`block text-[9px] font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.editStaffName}</label>
                    <input 
                      type="text" 
                      name="name" 
                      defaultValue={editingUser.name}
                      required
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className={`block text-[9px] font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-505'}`}>{t.editStaffRole}</label>
                    <select 
                      name="role" 
                      defaultValue={editingUser.role}
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950/70 border border-slate-800 text-white' 
                          : 'bg-white border border-slate-300 text-slate-850'
                      }`}
                    >
                      <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                      <option value="SALES_MANAGER">{t.roleManager}</option>
                      <option value="MARKETING">{t.roleMarketing}</option>
                      <option value="READ_ONLY">{t.roleReadOnly}</option>
                      <option value="ADMIN">{t.roleAdmin}</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.editStaffSave}
                  </button>
                </form>
              </div>
            )}

            {/* جدول الموظفين */}
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
                      isDark ? 'bg-slate-950/40 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-650'
                    } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                      <th className="px-5 py-3">{t.staffTableId}</th>
                      <th className="px-4 py-3">{t.staffTableEmail}</th>
                      <th className="px-4 py-3">{t.staffTableStatus}</th>
                      <th className="px-5 py-3">{t.staffTableActions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-105'}`}>
                    {users.map((user) => {
                      const roleTranslated = ROLE_TRANSLATIONS[lang]?.[user.role] || ROLE_TRANSLATIONS.AR[user.role] || user.role;
                      return (
                        <tr 
                          key={user.id} 
                          className={`transition-colors ${
                            isDark ? 'hover:bg-slate-900/30 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
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
                              user.isActive 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
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
                                    user.isActive 
                                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500' 
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'
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
