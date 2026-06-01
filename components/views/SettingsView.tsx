// components/views/SettingsView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initiateSubscriptionPaymentAction, initiateAddonPaymentAction } from '@/app/actions/payment';
import { createTenantUserAction, updateTenantUserAction, deleteTenantUserAction } from '@/app/actions/users';
import { getAgentLeasesAction } from '@/app/actions/growth';
import { useApp } from '@/app/context/AppContext';
import { 
  checkComplianceReadinessAction, 
  updateTenantComplianceDetailsAction, 
  signComplianceDisclaimerAction, 
  activateGovernmentConnectionAction,
  getTenantComplianceInfoAction,
  saveTenantCredentialsAction
} from '@/app/actions/compliance';

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
  platinum: 99999,
};

const PLAN_TITLES = {
  AR: {
    basic: "الباقة الأساسية",
    silver: "الباقة الفضية",
    gold: "الباقة الذهبية",
    platinum: "الباقة البلاتينية",
  },
  EN: {
    basic: "Basic Plan",
    silver: "Silver Plan",
    gold: "Gold Plan",
    platinum: "Platinum Plan",
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
    title: "إعدادات النظام والعمليات السحابية (SaaS Settings)",
    desc: "تخصيص وإدارة اشتراكك العقاري، وإدارة حسابات موظفي المبيعات والوصول لعام ٢٠٢٦م.",
    currentPlan: "الباقة الحالية: ",
    tabBilling: "💳 باقة الاشتراك والترقيات",
    tabStaff: "👥 إدارة فريق العمل ({count} موظف)",
    tabCompliance: "🔒 إعدادات الربط والامتثال",
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
    addonTitle: "زيادة سعة وكلاء الذكاء الاصطناعي",
    addonSub: "شراء وتوسيع سعة قنوات التحدث والرد التلقائي للفريق الآلي",
    addonAdded: "الوكلاء المضافون:",
    addonPrice: "السعر للوكيل الإضافي:",
    addonMax: "الحد الأقصى للطلب الواحد:",
    addonCountLabel: "العدد المطلوب:",
    addonCostTitle: "تفاصيل التكلفة الإضافية",
    addonCostTotal: " ر.س إجمالي القيمة",
    addonBuyBtn: "شراء وكلاء الآن (مدى / فيزا)",
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
    loadingAction: "جاري...",

    complianceTitle: "بوابة الربط والامتثال الحكومي (إيجار وزاتكا)",
    complianceDesc: "إدارة بيانات الاعتماد المشفرة للربط بالمنصات الحكومية، وفحص مدى التزام المنشأة بالمعايير التشغيلية واللوائح القانونية لعام ٢٠٢٦م.",
    credentialsFormTitle: "مفاتيح وبيانات الربط الحكومي الآمنة",
    credentialsFormDesc: "يتم تشفير هذه البيانات فوراً وتخزينها بأمان في قاعدة البيانات الخاصة بـ tenantId الخاص بك.",
    clientIdLabel: "معرف العميل (Client ID)",
    clientSecretLabel: "السر الخاص بالعميل (Client Secret)",
    apiKeyLabel: "مفتاح واجهة البرمجيات (API Key)",
    zatcaCredsLabel: "بيانات اعتماد زاتكا/إيجار (ZATCA / Eijar Credentials Payload)",
    saveAndEncryptBtn: "حفظ وتشفير البيانات الآمنة 🔒",
    savingEncrypting: "جاري التشفير والحفظ...",
    savedStatus: "محفوظ بقاعدة البيانات (مُشفر)",
    notSavedStatus: "غير معين",
    checklistTitle: "قائمة الحوكمة والامتثال الرقمي (Governance Checklist)",
    checklistDesc: "متابعة الشروط الإلزامية المطلوبة لتفعيل البوابات الحكومية بشكل فوري ولحظي.",
    profileCompletenessLabel: "اكتمال بيانات الملف الأساسي للشركة",
    profileCompletenessDesc: "(السجل التجاري، الرقم الضريبي، العنوان الوطني)",
    crInput: "السجل التجاري (١٠ أرقام)",
    vatInput: "الرقم الضريبي (١٥ رقماً يبدأ بـ ٣)",
    addressInput: "العنوان الوطني الكامل",
    saveProfileBtn: "تحديث بيانات الملف",
    savingProfile: "جاري التحديث...",
    disclaimerLabel: "إقرار المسؤولية الرقمي (ميثاق الحوكمة)",
    disclaimerLink: "اضغط لفتح نموذج التوقيع الرقمي ✍",
    disclaimerSigned: "تم التوقيع والموافقة رقمياً",
    saherLabel: "صحة وتنسيق بيانات الاعتماد (الوكيل ساهر)",
    saherDesc: "وكيل الامتثال ساهر يؤكد صحة صياغة المفاتيح وسلامتها.",
    saherCompliant: "مكتملة ومؤكدة وصالحة",
    saherNonCompliant: "غير صالحة أو مفقودة",
    statusIndicatorTitle: "مركز مراقبة الامتثال لزاتكا وإيجار (ZATCA / Ejar)",
    statusLabel: "حالة الربط والامتثال:",
    csidLabel: "شهادة الامتثال الفنية (CSID):",
    statusConnected: "مرتبط ونشط (آمن)",
    statusVerifying: "جاري التحقق (مراجعة الطلب)",
    statusDisconnected: "غير مرتبط",
    csidValid: "صالحة ونشطة",
    csidInvalid: "غير صالحة أو مفقودة",
    disclaimerModalTitle: "إقرار المسؤولية القانونية والتشغيلية الرقمي",
    disclaimerText: "بصفتي المسؤول والمطور العقاري المفوض لهذه المنشأة، أقر بأن جميع البيانات المدخلة (السجل التجاري، الرقم الضريبي، بيانات الاعتماد) صحيحة وممثلة للمنشأة بشكل كامل. وأوافق على تحمل المسؤولية الرقمية الكاملة عن العمليات الصادرة والواردة من بوابات إيجار والزكاة والضريبة والجمارك (ZATCA)، مع إخلاء طرف كامل لمزود النظام ORCA CRM من أي انقطاع أو استخدام غير مصرح به ناتج عن تسريب مفاتيح الربط الخاصة بنا خارج سياق المستأجر.",
    agreeCheckboxLabel: "أوافق على بنود إقرار المسؤولية الرقمي كاملاً",
    signNameLabel: "اسم المفوض بالتوقيع والبريد الإلكتروني",
    signBtn: "اعتماد التوقيع الرقمي وحفظه بالسجل 📝",
    signing: "جاري تسجيل التوقيع الرقمي...",
    activateBtn: "تفعيل الربط والتشغيل الفوري ⚡",
    activating: "جاري التفعيل والتحقق من البوابة...",
    activationDisabledAlert: "تنبيه: لا يمكنك تفعيل الربط حتى تكتمل كافة بنود قائمة الامتثال والحوكمة الواردة أعلاه.",
    activationSuccess: "تم تفعيل الربط الحكومي بنجاح! حالة النظام الآن نشطة.",
    saveCredentialsSuccess: "تم حفظ وتشفير مفاتيح الربط الخاصة بك بنجاح.",
    saveProfileSuccess: "تم تحديث بيانات ملف الشركة بنجاح."
  },
  EN: {
    title: "System & SaaS Settings",
    desc: "Customize your real estate subscription and manage staff accounts and credentials for 2026.",
    currentPlan: "Current Plan: ",
    tabBilling: "💳 Subscription Plan & Upgrades",
    tabStaff: "👥 Staff Management ({count} users)",
    tabCompliance: "🔒 Connection & Compliance",
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
    addonTitle: "Expand AI Agent Slots",
    addonSub: "Purchase additional slots for automated conversation agents",
    addonAdded: "Added slots:",
    addonPrice: "Price per extra slot:",
    addonMax: "Maximum per order:",
    addonCountLabel: "Quantity Required:",
    addonCostTitle: "Additional Cost Details",
    addonCostTotal: " SAR Total Value",
    addonBuyBtn: "Purchase Slots Now (Mada / Visa)",
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
    btnToggleActivate: "Activate",
    btnEdit: "Edit Permissions",
    btnDelete: "Delete Account",
    confirmDelete: "Are you sure you want to permanently delete this employee from your workspace?",
    loadingAction: "Loading...",

    complianceTitle: "Government Connection & Compliance Portal (Ejar & ZATCA)",
    complianceDesc: "Manage encrypted credentials for government APIs and monitor operational compliance for 2026.",
    credentialsFormTitle: "Secure Government API Credentials",
    credentialsFormDesc: "This data is encrypted instantly and stored securely within your tenant context.",
    clientIdLabel: "Client ID",
    clientSecretLabel: "Client Secret",
    apiKeyLabel: "API Key",
    zatcaCredsLabel: "ZATCA / Ejar Credentials Payload",
    saveAndEncryptBtn: "Save & Encrypt Credentials 🔒",
    savingEncrypting: "Encrypting and saving...",
    savedStatus: "Saved in Database (Encrypted)",
    notSavedStatus: "Not Set",
    checklistTitle: "Governance & Compliance Checklist",
    checklistDesc: "Monitor core prerequisites for government integrations in real-time.",
    profileCompletenessLabel: "Profile Data Completeness",
    profileCompletenessDesc: "(Commercial Registry, VAT, National Address)",
    crInput: "Commercial Registry (10 digits)",
    vatInput: "VAT Number (15 digits, starts with 3)",
    addressInput: "Full National Address",
    saveProfileBtn: "Update Profile Info",
    savingProfile: "Updating...",
    disclaimerLabel: "Digital Liability Disclaimer Signature",
    disclaimerLink: "Click to open signature modal ✍",
    disclaimerSigned: "Digitally signed & agreed",
    saherLabel: "Credential Formats (Agent Saher)",
    saherDesc: "Compliance agent Saher verifies credential format and health.",
    saherCompliant: "Verified & Compliant",
    saherNonCompliant: "Invalid or Missing",
    statusIndicatorTitle: "ZATCA & Ejar Connection Monitor",
    statusLabel: "Connection Status:",
    csidLabel: "Technical Certificate (CSID):",
    statusConnected: "Connected & Active (Secure)",
    statusVerifying: "Verifying...",
    statusDisconnected: "Disconnected",
    csidValid: "Valid & Active",
    csidInvalid: "Invalid or Missing",
    disclaimerModalTitle: "Digital Liability & Operational Agreement",
    disclaimerText: "As the authorized representative and real estate developer for this entity, I declare that all entered profile data, registration numbers, and API credentials are correct. I accept full responsibility for all transmissions and entries to/from the Ejar and ZATCA portals, releasing ORCA CRM from any liabilities, interruptions, or security violations occurring from handling of these keys outside the tenant context.",
    agreeCheckboxLabel: "I agree to the terms of the digital liability agreement",
    signNameLabel: "Authorized Signatory Name & Email",
    signBtn: "Record Digital Signature 📝",
    signing: "Recording signature...",
    activateBtn: "Activate Government Connection ⚡",
    activating: "Activating connection...",
    activationDisabledAlert: "Warning: You cannot activate the connection until all governance checklist items are marked compliant.",
    activationSuccess: "Government connection activated successfully! System status is now live.",
    saveCredentialsSuccess: "API credentials saved and encrypted successfully.",
    saveProfileSuccess: "Company profile updated successfully."
  }
};

export default function SettingsView({ tenant, users = [], currentUserRole = "READ_ONLY" }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [activeTab, setActiveTab] = useState<'billing' | 'staff' | 'compliance'>('billing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // حالات الوكلاء الإضافيين
  const [agentCount, setAgentCount] = useState(1);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // Agent Leases and upgrade path comparison modal states
  const [leases, setLeases] = useState<any[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [showUpgradeCompareModal, setShowUpgradeCompareModal] = useState<{ isOpen: boolean; targetPlan: "silver" | "gold" } | null>(null);

  // حالات إدارة الموظفين
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // حالات الربط والامتثال
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [complianceInfo, setComplianceInfo] = useState<any>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // إقرار المسؤولية
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerName, setDisclaimerName] = useState("");
  const [signingDisclaimer, setSigningDisclaimer] = useState(false);

  // حالات الحفظ والتشغيل
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activatingConnection, setActivatingConnection] = useState(false);

  // إخفاء/إظهار حقول إدخال بيانات الاعتماد (Mask Toggle)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({
    clientId: false,
    clientSecret: false,
    apiKey: false,
    zatcaCredentials: false,
  });

  const fetchComplianceData = async () => {
    setLoadingCompliance(true);
    const resReadiness = await checkComplianceReadinessAction(lang);
    const resInfo = await getTenantComplianceInfoAction();
    setLoadingCompliance(false);

    if (resReadiness.success) {
      setComplianceResult(resReadiness.data);
    }
    if (resInfo.success) {
      setComplianceInfo(resInfo.data);
    }
  };

  useEffect(() => {
    if (activeTab === 'compliance') {
      fetchComplianceData();
    }
  }, [activeTab]);

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

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // دالة تنسيق العملة السعودية
  const formatCurrency = (amount: number): string => {
    return `${toArabicNumerals(amount)} ${isArabic ? 'ر.س' : 'SAR'}`;
  };

  const handleUpgradeClick = (targetPlan: "silver" | "gold") => {
    setShowUpgradeCompareModal({ isOpen: true, targetPlan });
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
    
    // Check standard tier access
    const allowedMap: Record<string, string[]> = {
      gold: ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"],
      silver: ["SAHER", "SANAD", "MANSOUR"],
      basic: ["MANSOUR"]
    };

    const allowed = allowedMap[planLower] || allowedMap["basic"];
    if (allowed.includes(agentId)) {
      return { status: "ACTIVE", label: isArabic ? "نشط بالباقة" : "Active in Plan" };
    }

    // Check lease
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
      setError(result.error || (isArabic ? "عذراً، فشل بدء عملية الدفع والاتصال بالبوابة." : "Sorry, payment initialization failed."));
    }
  };

  const handleBuyAgents = async () => {
    setSuccess(null);
    setError(null);
    setLoadingAgent(true);

    const result = await initiateAddonPaymentAction(agentCount);
    setLoadingAgent(false);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || (isArabic ? "عذراً، فشل بدء عملية الدفع لشراء الوكلاء." : "Sorry, payment initialization failed for purchasing agents."));
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
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "عذراً، فشل إنشاء حساب الموظف." : "Sorry, failed to create employee account."));
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
      const toggleMsg = isArabic 
        ? `تم ${user.isActive ? 'تعطيل' : 'تفعيل'} حساب الموظف بنجاح.`
        : `Employee account has been successfully ${user.isActive ? 'deactivated' : 'activated'}.`;
      setSuccess(toggleMsg);
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تعديل حالة الموظف." : "Failed to toggle employee status."));
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
      setSuccess(isArabic ? "تم تحديث صلاحيات وبيانات الموظف بنجاح." : "Employee permissions updated successfully.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تعديل بيانات الموظف." : "Failed to update employee details."));
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
      setSuccess(isArabic ? "تم حذف حساب الموظف بالكامل وتحرير مقعد في باقتك." : "Employee account deleted successfully.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل عملية حذف الموظف." : "Failed to delete employee account."));
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSavingCredentials(true);

    const formData = new FormData(e.currentTarget);
    const clientId = formData.get("clientId") as string;
    const clientSecret = formData.get("clientSecret") as string;
    const apiKey = formData.get("apiKey") as string;
    const zatcaCredentials = formData.get("zatcaCredentials") as string;

    const result = await saveTenantCredentialsAction({
      clientId,
      clientSecret,
      apiKey,
      zatcaCredentials
    });
    setSavingCredentials(false);

    if (result.success) {
      setSuccess(t.saveCredentialsSuccess);
      await fetchComplianceData();
      (e.target as HTMLFormElement).reset();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل حفظ وتشفير مفاتيح الربط." : "Failed to encrypt and save credentials."));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSavingProfile(true);

    const formData = new FormData(e.currentTarget);
    const commercialRegistry = formData.get("commercialRegistry") as string;
    const vatNumber = formData.get("vatNumber") as string;
    const nationalAddress = formData.get("nationalAddress") as string;

    const result = await updateTenantComplianceDetailsAction({
      commercialRegistry,
      vatNumber,
      nationalAddress
    });
    setSavingProfile(false);

    if (result.success) {
      setSuccess(t.saveProfileSuccess);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تحديث بيانات الملف." : "Failed to update profile details."));
    }
  };

  const handleSignDisclaimer = async () => {
    setSuccess(null);
    setError(null);
    setSigningDisclaimer(true);

    const result = await signComplianceDisclaimerAction();
    setSigningDisclaimer(false);
    setIsDisclaimerOpen(false);

    if (result.success) {
      setSuccess(t.disclaimerSigned);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تسجيل التوقيع الرقمي." : "Failed to sign disclaimer."));
    }
  };

  const handleActivateConnection = async () => {
    setSuccess(null);
    setError(null);
    setActivatingConnection(true);

    const result = await activateGovernmentConnectionAction();
    setActivatingConnection(false);

    if (result.success) {
      setSuccess(t.activationSuccess);
      await fetchComplianceData();
      router.refresh();
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(result.error || (isArabic ? "فشل تفعيل الربط الحكومي لعدم استيفاء الشروط." : "Failed to activate government connection."));
    }
  };

  const plan = (tenant.subscriptionPlan || "basic").toLowerCase() as "basic" | "silver" | "gold";
  const limit = PLAN_LIMITS[plan] || 2;
  const currentUsersCount = users.length;
  const isLimitReached = currentUsersCount >= limit;

  const planTitles = PLAN_TITLES[lang] || PLAN_TITLES.AR;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full" dir={dir}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
            <i className="ph-bold ph-gear"></i> {isArabic ? "عمليات المنصة والتهيئة" : "System & Client Configurations"}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400 font-medium">
            {t.desc}
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-slate-100 dark:bg-[#151f32] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'billing' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.tabBilling}
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'staff' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.tabStaff.replace('{count}', toArabicNumerals(users.length))}
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'compliance' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.tabCompliance}
          </button>
        </div>
      </div>

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

      {/* Tab 1: Billing & Upgrades */}
      {activeTab === 'billing' && (
        <div className="space-y-6 md:space-y-8">
          
          {/* Tenant Details Card */}
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <i className="ph-bold ph-buildings text-[#df7b62]"></i>
              {t.tenantTitle}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.companyLabel}:</span>
                <p className="font-bold text-slate-900 dark:text-white text-base">{tenant.companyName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.subdomainLabel}:</span>
                <p className="font-bold text-indigo-500 text-base font-en">{tenant.subdomain}.orca.az-ez.pro</p>
              </div>
            </div>
          </div>

          {/* Pricing cards grid */}
          <div className="space-y-4">
            <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.pricingTitle}</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Basic Plan */}
              <div className={`bg-white dark:bg-[#151f32] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative ${
                plan === 'basic' ? 'border-[#df7b62] ring-1 ring-[#df7b62]' : 'border-slate-200 dark:border-slate-800/80'
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-slate-900 dark:text-white font-bold text-base">{t.planBasic}</h4>
                    {plan === 'basic' && <span className="bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-en"><span className="price-tag">{formatCurrency(450)}</span> <span className="text-xs text-slate-500 font-semibold">{t.priceMonth}</span></h2>
                  
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-slate-655 dark:text-slate-400 font-medium">
                    <p>{t.limitStaff.replace('{count}', toArabicNumerals(2))}</p>
                    <p>{t.limitLeads.replace('{count}', toArabicNumerals(100))}</p>
                    <p>{t.limitProjects.replace('{count}', toArabicNumerals(2))}</p>
                    <p>{t.limitAgents.replace('{count}', toArabicNumerals(1))}</p>
                  </div>
                </div>

                {plan !== 'basic' && (
                  <button 
                    onClick={() => handleUpgrade('basic')}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-[#df7b62]/10 text-slate-700 dark:text-slate-300 hover:text-[#df7b62] border border-slate-200 dark:border-slate-700/60 hover:border-[#df7b62]/30 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingPlan === 'basic' ? t.actionUpgradePrep : t.upgradeBtn}
                  </button>
                )}
              </div>

              {/* Silver Plan */}
              <div className={`bg-white dark:bg-[#151f32] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative ${
                plan === 'silver' ? 'border-[#df7b62] ring-1 ring-[#df7b62]' : 'border-slate-200 dark:border-slate-800/80'
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-slate-900 dark:text-white font-bold text-base">{t.planSilver}</h4>
                    {plan === 'silver' && <span className="bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-en"><span className="price-tag">{formatCurrency(900)}</span> <span className="text-xs text-slate-500 font-semibold">{t.priceMonth}</span></h2>
                  
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-slate-655 dark:text-slate-400 font-medium">
                    <p>{t.limitStaff.replace('{count}', toArabicNumerals(10))}</p>
                    <p>{t.limitLeads.replace('{count}', toArabicNumerals(1000))}</p>
                    <p>{t.limitProjects.replace('{count}', toArabicNumerals(10))}</p>
                    <p>{t.limitAgents.replace('{count}', toArabicNumerals(2))}</p>
                  </div>
                </div>

                {plan !== 'silver' && (
                  <button 
                    onClick={() => handleUpgradeClick('silver')}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-[#df7b62]/10 text-slate-700 dark:text-slate-300 hover:text-[#df7b62] border border-slate-200 dark:border-slate-700/60 hover:border-[#df7b62]/30 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingPlan === 'silver' ? t.actionUpgradePrep : t.upgradeBtnSilver}
                  </button>
                )}
              </div>

              {/* Gold Plan */}
              <div className={`bg-[#0f172a] border rounded-2xl p-6 flex flex-col justify-between gap-6 relative shadow-lg ${
                plan === 'gold' ? 'border-[#df7b62] ring-1 ring-[#df7b62]' : 'border-slate-800'
              }`}>
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#df7b62] text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">POPULAR</div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white font-bold text-base">{t.planGold}</h4>
                    {plan === 'gold' && <span className="bg-[#df7b62]/20 border border-[#df7b62]/35 text-[#df7b62] text-[10px] font-bold px-2 py-0.5 rounded">{t.activePlan}</span>}
                  </div>
                  <h2 className="text-2xl font-black text-white font-en"><span className="price-tag">{formatCurrency(2400)}</span> <span className="text-xs text-slate-400 font-semibold">{t.priceMonth}</span></h2>
                  
                  <div className="border-t border-slate-850 pt-4 space-y-2.5 text-xs text-slate-400 font-medium">
                    <p>{t.limitStaffGold}</p>
                    <p>{t.limitLeadsGold}</p>
                    <p>{t.limitProjectsGold}</p>
                    <p>{t.limitAgentsGold.replace('{count}', toArabicNumerals(5))}</p>
                  </div>
                </div>

                {plan !== 'gold' && (
                  <button 
                    onClick={() => handleUpgradeClick('gold')}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 rounded-xl bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50 hover:shadow-md"
                  >
                    {loadingPlan === 'gold' ? t.actionUpgradePrep : t.upgradeBtnGold}
                  </button>
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
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">
                    <i className="ph-fill ph-robot"></i>
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                      {isArabic ? "مؤشر حالة الوكلاء الأذكياء" : "AI Agent Status Monitor"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
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
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold text-xs rounded-xl cursor-pointer transition-all border border-indigo-500/35 shadow-lg shadow-indigo-650/20 flex items-center gap-2"
                >
                  <i className="ph-bold ph-gear-six animate-spin-slow"></i>
                  <span>{isArabic ? "إدارة الوكلاء والاشتراكات" : "Manage AI Agents"}</span>
                </button>
              </div>
            );
          })()}

        </div>
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* Create new employee form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.addStaffTitle}</h3>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1 rounded-full font-en">
                  {toArabicNumerals(currentUsersCount)} / {limit === 99999 ? t.unlimited : toArabicNumerals(limit)} {t.staffActiveSeats}
                </span>
              </div>

              {isLimitReached ? (
                /* Seat Limit reached warning */
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed">
                  {t.limitReachedAlert.replace('{plan}', planTitles[plan])}
                </div>
              ) : (
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.staffName}</label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.staffEmail}</label>
                    <input 
                      type="email" 
                      name="email" 
                      required 
                      className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.staffRole}</label>
                    <select 
                      name="role" 
                      required 
                      className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                    >
                      <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                      <option value="SALES_MANAGER">{t.roleManager}</option>
                      <option value="MARKETING">{t.roleMarketing}</option>
                      <option value="READ_ONLY">{t.roleReadOnly}</option>
                      <option value="ADMIN">{t.roleAdmin}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.staffPassword}</label>
                    <input 
                      type="password" 
                      name="password" 
                      required 
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loadingCreate}
                    className="w-full py-3.5 rounded-xl bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md disabled:opacity-55"
                  >
                    {loadingCreate ? t.actionCreatePrep : t.staffSubmit}
                  </button>
                </form>
              )}
            </div>

            {/* Edit User Modal/Form Overlay */}
            {editingUser && (
              <div className="bg-white dark:bg-[#151f32] border border-indigo-500/25 rounded-2xl p-6 shadow-md space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex justify-between items-center">
                  <h4 className="text-indigo-550 dark:text-indigo-400 font-bold text-sm">{t.editStaffTitle} {editingUser.name}</h4>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white cursor-pointer text-sm">✕</button>
                </div>
                <form onSubmit={handleEditRole} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold mb-1">{t.editStaffName}</label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      defaultValue={editingUser.name}
                      className="w-full rounded-lg bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold mb-1">{t.editStaffRole}</label>
                    <select 
                      name="role" 
                      required 
                      defaultValue={editingUser.role}
                      className="w-full rounded-lg bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                      <option value="SALES_MANAGER">{t.roleManager}</option>
                      <option value="MARKETING">{t.roleMarketing}</option>
                      <option value="READ_ONLY">{t.roleReadOnly}</option>
                      <option value="ADMIN">{t.roleAdmin}</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-755 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer">{t.editStaffSave}</button>
                    <button type="button" onClick={() => setEditingUser(null)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer">{t.editStaffCancel}</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Active staff ledger table (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
              <h2 className="text-slate-900 dark:text-white font-bold text-base">{t.staffTableTitle}</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30">
                    <th className="p-3 font-semibold text-center w-14">{t.staffTableId}</th>
                    <th className="p-3 font-semibold">{t.staffName}</th>
                    <th className="p-3 font-semibold">{t.staffTableEmail}</th>
                    <th className="p-3 font-semibold text-center">{t.staffTableStatus}</th>
                    <th className="p-3 font-semibold text-center w-48">{t.staffTableActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {users.map((u, idx) => {
                    const number = idx + 1;
                    const isProcessing = loadingActionId === u.id;
                    const isCurrentUser = currentUserRole === u.role && u.email === tenant.subdomain; // approximate check
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 text-center font-en">{toArabicNumerals(number)}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {u.name}
                          <span className="text-[10px] text-slate-450 dark:text-slate-550 block font-bold font-sans mt-0.5">
                            {ROLE_TRANSLATIONS[lang]?.[u.role as "ADMIN"] || u.role}
                          </span>
                        </td>
                        <td className="p-3 font-en">
                          {u.email}
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {toArabicNumerals(new Date(u.createdAt).toLocaleDateString())}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            u.isActive 
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {u.isActive ? t.statusActive : t.statusInactive}
                          </span>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setEditingUser(u)}
                              disabled={isProcessing}
                              className="text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 font-bold transition-all px-2 py-1 rounded bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 cursor-pointer"
                            >
                              {t.btnEdit}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isProcessing}
                              className={`font-bold transition-all px-2 py-1 rounded bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 cursor-pointer ${
                                u.isActive ? 'text-amber-600 hover:text-amber-500' : 'text-emerald-600 hover:text-emerald-500'
                              }`}
                            >
                              {u.isActive ? t.btnToggleDeactivate : t.btnToggleActivate}
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(u.id)}
                              disabled={isProcessing}
                              className="text-rose-600 hover:text-rose-500 font-bold transition-all px-2 py-1 rounded bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 cursor-pointer"
                            >
                              {t.btnDelete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: Compliance & Connection */}
      {activeTab === 'compliance' && (
        <div className="space-y-6 md:space-y-8 fade-in">
          
          {/* Top Banner / Status Indicator */}
          {(() => {
            const hasCreds = complianceInfo?.hasClientId && complianceInfo?.hasClientSecret && complianceInfo?.hasApiKey && complianceInfo?.hasZatcaCredentials;
            const isConnected = complianceInfo?.whatsappConnected;
            
            let statusText = t.statusDisconnected;
            let statusBadgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";
            let dotColor = "bg-rose-500";
            let csidText = t.csidInvalid;
            let csidBadgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";

            if (isConnected) {
              statusText = t.statusConnected;
              statusBadgeClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";
              dotColor = "bg-emerald-500";
              csidText = t.csidValid;
              csidBadgeClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";
            } else if (hasCreds) {
              statusText = t.statusVerifying;
              statusBadgeClass = "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400";
              dotColor = "bg-amber-500";
              csidText = t.csidValid;
              csidBadgeClass = "bg-[#df7b62]/10 border-[#df7b62]/20 text-[#df7b62]";
            }

            return (
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold">
                    <i className="ph-bold ph-shield-check"></i> {t.statusIndicatorTitle}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t.complianceTitle}
                  </h2>
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium max-w-xl">
                    {t.complianceDesc}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto shrink-0">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center gap-6 text-xs">
                      <span className="text-slate-550 dark:text-slate-400 font-semibold">{t.statusLabel}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${statusBadgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${dotColor} ${isConnected ? 'animate-pulse' : ''}`}></span>
                        {statusText}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-6 text-xs">
                      <span className="text-slate-550 dark:text-slate-400 font-semibold">{t.csidLabel}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[9px] ${csidBadgeClass}`}>
                        {csidText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {loadingCompliance ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold">{isArabic ? "جاري فحص حالة الامتثال..." : "Checking compliance status..."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
              
              {/* Left Side: Compliance Checklist & Profile Completeness Forms */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <i className="ph-bold ph-list-checks text-[#df7b62]"></i>
                      {t.checklistTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-2">{t.checklistDesc}</p>
                  </div>

                  {/* Checklist items list */}
                  <div className="space-y-4">
                    
                    {/* Item 1: Profile Completeness */}
                    {(() => {
                      const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "profile_completeness")?.status === "COMPLIANT";
                      const itemError = complianceResult?.checklist.find((c: any) => c.id === "profile_completeness")?.error;
                      
                      return (
                        <div className={`p-4 rounded-xl border transition-all ${
                          isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                        }`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {isCompliant ? (
                                  <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                                ) : (
                                  <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                                )}
                                {t.profileCompletenessLabel}
                              </span>
                              <p className="text-[10px] text-slate-500 dark:text-slate-450">{t.profileCompletenessDesc}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              {isCompliant ? (isArabic ? "مكتمل" : "Compliant") : (isArabic ? "غير مكتمل" : "Non-Compliant")}
                            </span>
                          </div>

                          {itemError && (
                            <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                              {itemError}
                            </p>
                          )}

                          {/* Profile fields update form inside checklist card for UX convenience */}
                          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.crInput}</label>
                                <input 
                                  type="text" 
                                  name="commercialRegistry" 
                                  defaultValue={complianceInfo?.commercialRegistry}
                                  placeholder="1010XXXXXX"
                                  required
                                  className="w-full rounded-lg bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.vatInput}</label>
                                <input 
                                  type="text" 
                                  name="vatNumber" 
                                  defaultValue={complianceInfo?.vatNumber}
                                  placeholder="3000XXXXXXXXXXX"
                                  required
                                  className="w-full rounded-lg bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.addressInput}</label>
                              <input 
                                type="text" 
                                name="nationalAddress" 
                                defaultValue={complianceInfo?.nationalAddress}
                                placeholder="الرياض، الياسمين، رمز بريدي 12345"
                                required
                                className="w-full rounded-lg bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <button 
                              type="submit" 
                              disabled={savingProfile}
                              className="bg-[#df7b62] hover:bg-[#c5654e] text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-55"
                            >
                              {savingProfile ? t.savingProfile : t.saveProfileBtn}
                            </button>
                          </form>
                        </div>
                      );
                    })()}

                    {/* Item 2: Disclaimer Signature */}
                    {(() => {
                      const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "digital_signature")?.status === "COMPLIANT";
                      const itemError = complianceResult?.checklist.find((c: any) => c.id === "digital_signature")?.error;
                      
                      return (
                        <div className={`p-4 rounded-xl border transition-all ${
                          isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                        }`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {isCompliant ? (
                                  <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                                ) : (
                                  <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                                )}
                                {t.disclaimerLabel}
                              </span>
                              <p className="text-[10px] text-slate-500 dark:text-slate-450">
                                {isCompliant ? t.disclaimerSigned : t.disclaimerLink}
                              </p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              {isCompliant ? (isArabic ? "مكتمل" : "Compliant") : (isArabic ? "غير مكتمل" : "Non-Compliant")}
                            </span>
                          </div>

                          {itemError && (
                            <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                              {itemError}
                            </p>
                          )}

                          {!isCompliant && (
                            <button 
                              onClick={() => {
                                setDisclaimerAccepted(false);
                                setDisclaimerName("");
                                setIsDisclaimerOpen(true);
                              }}
                              className="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <i className="ph-bold ph-pen"></i> {isArabic ? "التوقيع على إقرار المسؤولية" : "Sign Digital Disclaimer"}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Item 3: Credential Health (Saher verification check) */}
                    {(() => {
                      const isCompliant = complianceResult?.checklist.find((c: any) => c.id === "api_credentials")?.status === "COMPLIANT";
                      const itemError = complianceResult?.checklist.find((c: any) => c.id === "api_credentials")?.error;
                      
                      return (
                        <div className={`p-4 rounded-xl border transition-all ${
                          isCompliant ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                        }`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {isCompliant ? (
                                  <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                                ) : (
                                  <i className="ph-bold ph-warning-circle text-rose-500 text-base"></i>
                                )}
                                {t.saherLabel}
                              </span>
                              <p className="text-[10px] text-slate-500 dark:text-slate-450">{t.saherDesc}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              isCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              {isCompliant ? t.saherCompliant : t.saherNonCompliant}
                            </span>
                          </div>

                          {itemError && (
                            <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 mt-2 bg-rose-500/10 px-2 py-1 rounded">
                              {itemError}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* Activation Button Panel */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    {(() => {
                      const isAllCompliant = complianceResult?.isReady === true;
                      const isConnected = complianceInfo?.whatsappConnected;
                      return (
                        <>
                          <button
                            onClick={handleActivateConnection}
                            disabled={!isAllCompliant || activatingConnection || isConnected}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                              isConnected
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 cursor-not-allowed'
                                : isAllCompliant
                                  ? 'bg-[#df7b62] hover:bg-[#c5654e] text-white cursor-pointer hover:shadow-md'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 border border-slate-200 dark:border-slate-700/80 cursor-not-allowed'
                            }`}
                          >
                            {activatingConnection ? t.activating : isConnected ? (isArabic ? "✓ الربط مفعل ونشط حالياً" : "✓ Connection active") : t.activateBtn}
                          </button>

                          {!isAllCompliant && !isConnected && (
                            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed">
                              {t.activationDisabledAlert}
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                {complianceResult?.checklist
                                  .filter((c: any) => c.status === "NON_COMPLIANT")
                                  .map((c: any) => (
                                    <li key={c.id}>{isArabic ? c.labelAr : c.labelEn}</li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Side: Secure Credentials Input Form */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <i className="ph-bold ph-key text-[#df7b62]"></i>
                      {t.credentialsFormTitle}
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-2">
                      {t.credentialsFormDesc}
                    </p>
                  </div>

                  <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2">
                    {/* Client ID */}
                    <div>
                      <label className="block text-slate-555 dark:text-slate-400 text-xs font-semibold mb-2">{t.clientIdLabel}</label>
                      <div className="relative">
                        <input 
                          type={showCredentials.clientId ? "text" : "password"} 
                          name="clientId"
                          required
                          placeholder={complianceInfo?.hasClientId ? "••••••••••••••••" : "Client ID..."}
                          className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, clientId: !prev.clientId }))}
                          className="absolute inset-y-0 left-3 flex items-center text-slate-450 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1"
                        >
                          <i className={`ph-bold ${showCredentials.clientId ? "ph-eye-slash" : "ph-eye"}`}></i>
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        {complianceInfo?.hasClientId ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                      </span>
                    </div>

                    {/* Client Secret */}
                    <div>
                      <label className="block text-slate-555 dark:text-slate-400 text-xs font-semibold mb-2">{t.clientSecretLabel}</label>
                      <div className="relative">
                        <input 
                          type={showCredentials.clientSecret ? "text" : "password"} 
                          name="clientSecret"
                          required
                          placeholder={complianceInfo?.hasClientSecret ? "••••••••••••••••" : "Client Secret..."}
                          className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                          className="absolute inset-y-0 left-3 flex items-center text-slate-455 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1"
                        >
                          <i className={`ph-bold ${showCredentials.clientSecret ? "ph-eye-slash" : "ph-eye"}`}></i>
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        {complianceInfo?.hasClientSecret ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                      </span>
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-slate-555 dark:text-slate-400 text-xs font-semibold mb-2">{t.apiKeyLabel}</label>
                      <div className="relative">
                        <input 
                          type={showCredentials.apiKey ? "text" : "password"} 
                          name="apiKey"
                          required
                          placeholder={complianceInfo?.hasApiKey ? "••••••••••••••••" : "API Key..."}
                          className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, apiKey: !prev.apiKey }))}
                          className="absolute inset-y-0 left-3 flex items-center text-slate-455 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1"
                        >
                          <i className={`ph-bold ${showCredentials.apiKey ? "ph-eye-slash" : "ph-eye"}`}></i>
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        {complianceInfo?.hasApiKey ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                      </span>
                    </div>

                    {/* ZATCA Credentials */}
                    <div>
                      <label className="block text-slate-555 dark:text-slate-400 text-xs font-semibold mb-2">{t.zatcaCredsLabel}</label>
                      <div className="relative">
                        <textarea 
                          name="zatcaCredentials"
                          required
                          rows={3}
                          placeholder={complianceInfo?.hasZatcaCredentials ? "••••••••••••••••••••••••••••••••" : "ZATCA private keys payload structure..."}
                          className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        {complianceInfo?.hasZatcaCredentials ? `✓ ${t.savedStatus}` : `⚠️ ${t.notSavedStatus}`}
                      </span>
                    </div>

                    <button 
                      type="submit" 
                      disabled={savingCredentials}
                      className="w-full py-3.5 rounded-xl bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md disabled:opacity-55"
                    >
                      {savingCredentials ? t.savingEncrypting : t.saveAndEncryptBtn}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}

          {/* Digital Signature Disclaimer Agreement Modal */}
          {isDisclaimerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-scale-up" dir={dir}>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <i className="ph-bold ph-scroll text-[#df7b62]"></i>
                    {t.disclaimerModalTitle}
                  </h3>
                  <button 
                    onClick={() => setIsDisclaimerOpen(false)}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs md:text-sm text-slate-655 dark:text-slate-350 leading-relaxed max-h-60 overflow-y-auto">
                  {t.disclaimerText}
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-2.5 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-[#df7b62] focus:ring-[#df7b62]"
                    />
                    <span>{t.agreeCheckboxLabel}</span>
                  </label>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-2">{t.signNameLabel}</label>
                    <input 
                      type="text" 
                      value={disclaimerName}
                      onChange={(e) => setDisclaimerName(e.target.value)}
                      placeholder="علي محمد (ali.orca@outlook.sa)"
                      required
                      className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button 
                    onClick={handleSignDisclaimer}
                    disabled={!disclaimerAccepted || disclaimerName.trim().length < 3 || signingDisclaimer}
                    className="bg-[#df7b62] hover:bg-[#c5654e] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {signingDisclaimer ? t.signing : t.signBtn}
                  </button>
                  <button 
                    onClick={() => setIsDisclaimerOpen(false)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-755 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    ✕ {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Smart Upgrade & Leasing Options Comparison Modal */}
          {showUpgradeCompareModal?.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#151f32] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative" dir={dir}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                    <i className="ph-bold ph-sparkle text-[#df7b62]"></i>
                    {isArabic ? "خيارات الترقية والنمو الذكية" : "Smart Upgrade & Leasing Options"}
                  </h3>
                  <button 
                    onClick={() => setShowUpgradeCompareModal(null)}
                    className="text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {isArabic 
                    ? "قبل إتمام عملية ترقية باقة الاشتراك، نود تقديم الخيار الأمثل والأنسب لمتطلبات عملك وميزانيتك:"
                    : "Before completing your plan upgrade, choose the option that best fits your business needs and budget:"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Temporary leasing */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#0b1120]/40 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-[#df7b62] text-xs font-black mb-1.5 flex items-center gap-1.5">
                        <i className="ph-bold ph-hand-coins"></i>
                        {isArabic ? "استئجار وكيل عند الطلب" : "Lease On-Demand"}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {isArabic 
                          ? "استمر بباقتك الحالية وقم باستئجار وكلاء منفصلين (مثل بصير أو خبير) لحملاتك المؤقتة بقيمة 250 ر.س شهرياً للوكيل الواحد."
                          : "Stay on your current plan and lease individual agents (like Baseer or Khabeer) for temporary campaigns at 250 SAR/month."}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowUpgradeCompareModal(null);
                        window.location.href = '/operations?tab=growth';
                      }}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                    >
                      {isArabic ? "الذهاب للاستئجار مؤقتاً" : "Lease Agent Temporarily"}
                    </button>
                  </div>

                  {/* Option 2: Full Upgrade to Diamond */}
                  <div className="p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/20 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-white text-xs font-black mb-1.5 flex items-center gap-1.5">
                        <i className="ph-bold ph-sparkle text-indigo-400"></i>
                        {isArabic ? "الترقية للباقة الماسية" : "Upgrade to Diamond"}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {isArabic 
                          ? "احصل على وصول دائم وغير محدود لكافة الوكلاء الخمسة (ساهر، سند، بصير، خبير، منصور) مع تكامل واتساب كامل وإدارة غير محدودة."
                          : "Unlock permanent, unlimited access to all 5 agents (Saher, Sanad, Baseer, Khabeer, Mansour) with full WhatsApp integration."}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const targetPlan = showUpgradeCompareModal.targetPlan;
                        setShowUpgradeCompareModal(null);
                        handleUpgrade(targetPlan);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-[#df7b62] to-[#c5654e] text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(223,123,98,0.25)]"
                    >
                      {isArabic ? "الترقية وتأكيد الدفع ➔" : "Upgrade & Confirm ➔"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowUpgradeCompareModal(null)}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-850/80 text-slate-400 hover:text-slate-350 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    {isArabic ? "إغلاق" : "Close"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
