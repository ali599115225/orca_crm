"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import { getErpStatsAction, getLedgerEntriesAction } from "@/app/actions/accounting";
import { getRentalContractsAction } from "@/app/actions/rentals";

const TRANSLATIONS = {
  AR: {
    title: "بوابة حوكمة الإيجارات والامتثال المالي (ERP)",
    subtitle: "تتبع عقود الإيجار، التدفقات النقدية، وفحص مطابقة المعايير المحاسبية مع ربط الفاتورة الإلكترونية ZATCA",
    ijaraTab: "🏠 عقود الإيجار والتحصيل",
    accountingTab: "📊 القيود ودفتر الأستاذ",
    zakatab: "🛡️ بوابة الزكاة والضريبة (ZATCA)",
    lockTitle: "الترقية للمستوى الاحترافي مطلوبة",
    lockDesc: "ميزات الربط التلقائي بهيئة الزكاة والضريبة والجمارك (ZATCA Phase-2) وحوكمة القيود المتقدمة متاحة فقط لمشتركي الباقة الذهبية أو الباقة الاحترافية.",
    lockBtn: "ترقية الباقة الاستثمارية الآن ➔",
    activeContracts: "عقود الإيجار النشطة",
    totalCollected: "إجمالي المحصل",
    totalArrears: "المستحقات المتأخرة",
    totalRevenue: "إجمالي الإيرادات المتوقعة",
    complianceRate: "معدل الامتثال الضريبي",
    searchPlaceholder: "البحث برقم الوحدة أو اسم المستأجر...",
    colUnit: "رقم الوحدة",
    colTenant: "المستأجر",
    colRent: "قيمة الإيجار السنوي",
    colPaid: "المدفوع",
    colDue: "الاستحقاق القادم",
    colStatus: "الحالة",
    colActions: "الإجراءات",
    invoiceBtn: "إصدار فاتورة ZATCA",
    invoiceProcessing: "جاري الفحص المالي...",
    invoiceSuccess: "تم إصدار الفاتورة وتوثيقها!",
    ledgerTitle: "دفتر الأستاذ والقيود المزدوجة",
    colDate: "التاريخ",
    colDesc: "وصف العملية",
    colCat: "التصنيف",
    colType: "النوع",
    colAmount: "المبلغ",
    zatcaPortal: "بوابة الامتثال لهيئة الزكاة والضريبة والجمارك (الفاتورة الإلكترونية - المرحلة الثانية)",
    zatcaStatus: "حالة الربط والامتثال:",
    zatcaConnected: "مرتبط ونشط (آمن)",
    zatcaUnregistered: "قيد المزامنة والتسجيل",
    zatcaCert: "شهادة الامتثال الفنية (CSID):",
    zatcaValid: "صالحة ونشطة",
    zatcaTelemetry: "سجل العمليات الفورية للوكيل سند (Telemetry Logs):",
    zatcaSubmit: "تصدير البيانات وتدقيق الإقرار الضريبي",
    zatcaProcessing: "جاري تشفير البيانات وإرسالها...",
    zatcaSuccess: "تم مطابقة الإقرار الضريبي وإرساله بنجاح!",
    revenue: "إيراد",
    expense: "مصروف",
    rentCat: "إيجار",
    payrollCat: "رواتب وعمولات",
    paid: "مدفوع",
    late: "متأخر",
    unpaid: "غير مدفوع",

    // New translation keys from prototype
    housingAlert: "✅ جميع العقود متوافقة مع معايير وزارة الإسكان والتطوير الحضري وتخضع لتدقيق الامتثال التلقائي.",
    newContractTitle: "➕ إنشاء عقد إيجار جديد في النظام",
    unitNumber: "رقم الوحدة العقارية",
    tenantName: "اسم المستأجر الكامل",
    monthlyRentVal: "قيمة الإيجار الشهري (ر.س)",
    contractMonths: "مدة العقد (بالشهور)",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    saveDraft: "حفظ كمسودة مؤقتة",
    createAndSendZatca: "✓ إنشاء العقد وتصديره لزاتكا",
    zatcaAutoSendText: "تكامل ذكي: سيتم تسجيل العقد تلقائياً في منصة زاتكا",
    zatcaRegisterInstant: "✓ العقد سيُسجل فوراً في النظام المالي الحكومي",
    zatcaCertAutoSent: "✓ شهادة تسجيل وتوافق زاتكا ستُرسل للمستأجر تلقائياً",
    activeContractsTitle: "📋 سجل عقود الإيجار الحالية والامتثال",
    colDuration: "فترة العقد",
    colZatcaStatus: "حالة ربط زاتكا",
    registered: "✓ مسجل",
    processing: "⏳ قيد المعالجة",
    actionUpdate: "تحديث البيانات",
    actionEnd: "إنهاء العقد",
    actionFollowUp: "متابعة الطلب",
    zatcaComplianceTitle: "✅ تقرير التوافق والامتثال مع زاتكا",
    regInZatcaCount: "عقود مسجلة في زاتكا",
    pendingInZatcaCount: "عقود قيد المعالجة والمراجعة",
    successRate: "نسبة نجاح المعاملات المعالجة",
    lastUpdateText: "⏱️ آخر مزامنة تلقائية:",
    lastUpdateVal: "منذ ساعة واحدة",
    zatcaAutoSyncDesc: "حوكمة البيانات: جميع عقود الإيجار والتحصيل العقاري تُسجل تلقائياً في منصة زاتكا الحكومية عند الاعتماد. أي تعديل في ORCA العقارية ينسخ فوراً.",

    // Accounting tab translations
    accMonthlyRev: "إجمالي الإيرادات المتوقعة",
    accCollectedAmt: "المبالغ المحصلة فعلياً",
    accArrears: "إجمالي المتأخرات والديون القائمة",
    accAlertOverdue: "⚠️ تنبيه مالي: هناك فواتير متأخرة الدفع — تم تفعيل نظام التذكير الآلي وإرسال الرسائل فوراً.",
    financialOverviewTitle: "📈 الموازنة وتحليل التدفقات النقدية",
    financialOverviewDesc: "مؤشرات الأداء: الإيرادات تظهر نمواً متسقاً مع استقرار قياسي في بنود المصروفات العامة.",
    janJun2026: "يناير - يونيو 2026",
    revDistTitle: "💳 تصنيف الإيرادات وتوزيع مصادر الدخل",
    saleRev: "إيرادات بيع الوحدات",
    rentRev: "إيرادات عقود الإيجار",
    otherRev: "إيرادات رسوم الخدمات الإدارية",
    createInvoiceTitle: "📄 إنشاء فاتورة أو مستند تحصيل جديد",
    invoiceNo: "رقم الفاتورة التلقائي",
    clientName: "اسم العميل / المستأجر",
    invoiceValue: "قيمة الفاتورة الإجمالية (ر.س)",
    invoiceType: "نوع العملية / التصنيف",
    dueDate: "تاريخ الاستحقاق والتحصيل",
    notes: "ملاحظات وتفاصيل إضافية",
    erpIntegrationTitle: "⚙️ تكامل الأنظمة (ERP Integration):",
    erpIntegrationDesc: "الفاتورة سيتم ترحيلها تلقائياً إلى دفتر اليومية العامة لتحديث الموازنة والميزانية العمومية للشركة.",
    createInvoiceBtn: "💾 إنشاء وترحيل الفاتورة",
    sendToClient: "📧 إرسال إشعار للعميل",
    printBtn: "🖨️ طباعة السند",
    recentInvoicesTitle: "📋 كشف الفواتير الأخيرة للعملاء",
    colInvoiceNo: "رقم الفاتورة",
    colClient: "العميل",
    colValue: "القيمة الإجمالية",
    colIssueDate: "تاريخ الإصدار",
    colDueDate: "تاريخ الاستحقاق",
    statusPaid: "✓ مدفوعة",
    statusPending: "⏳ قيد التحصيل",
    statusOverdue: "✗ متأخرة",
    actionShow: "عرض التفاصيل",
    actionRemind: "تذكير بالدفع",
    profitAnalysisTitle: "📊 تحليل الربحية والأداء الفعلي",
    actualProfit: "صافي الأرباح المحصلة",
    expectedProfit: "الأرباح المستهدفة بالخطة",
    collectionRateText: "معدل كفاءة التحصيل المالي: 86% | الفجوة المتبقية قيد التحصيل التلقائي خلال الـ 15 يوماً القادمة.",

    // ZATCA Tab translations
    zatcaPortalTitle: "🛡️ مركز مراقبة الامتثال لزاتكا (ZATCA)",
    zatcaPortalSubtitle: "بوابة الربط التقني الرسمي مع منصة هيئة الزكاة والضريبة والجمارك لإدارة الفواتير والعقود العقارية",
    howItWorksTitle: "⚙️ خطوات دورة الفاتورة الإلكترونية الموحدة",
    howItWorksStep1: "١. إدخال وتدقيق العقد في ORCA",
    howItWorksStep2: "٢. التشفير والإرسال الآلي لزاتكا",
    howItWorksStep3: "٣. توثيق شهادة التسجيل المعتمدة",
    howItWorksStep3Desc: "شهادة معتمدة مشفرة رسمياً",
    recentZatcaRegistrations: "📤 سجل أحدث المعاملات الموثقة بشهادات ZATCA",
    colZatcaCert: "الرقم التسلسلي للشهادة (CSID)",
    complianceInfoTitle: "✅ مصفوفة الامتثال ومعايير الربط الحكومي",
    basicRequirements: "المتطلبات والبيانات الأساسية",
    req1: "الهوية الوطنية أو الإقامة السارية للطرفين",
    req2: "رقم الصك والترخيص البلدي للعقار",
    req3: "التوقيع والتوثيق الإلكتروني المعتمد",
    req4: "تحديد الحساب البنكي الرسمي للتحصيل",
    benefits: "الفوائد والمميزات الاستثمارية",
    benefit1: "حماية قانونية كاملة للحقوق التعاقدية",
    benefit2: "تسهيل آليات سداد الدفعات إلكترونياً",
    benefit3: "رسمية واعتمادية البيانات في المحاكم والجهات",
    benefit4: "دقة التقارير والإقرارات الضريبية السنوية",
    faqTitle: "❓ الأسئلة الشائعة حول الفاتورة الإلكترونية والربط",
    faq1Q: "كم المدة المستغرقة لتسجيل وتوثيق العقد في منصة زاتكا؟",
    faq1A: "تتم المعالجة فورياً في غضون 5 إلى 10 دقائق كحد أقصى. يقوم نظام ORCA العقاري بتشفير Payload وتصديرها مباشرة للبوابة الحكومية.",
    faq2Q: "هل يمكن تعديل أو إلغاء العقد بعد توثيقه في منصة زاتكا؟",
    faq2A: "نعم، أي تحديث أو تمديد يجرى على نظام ORCA العقاري يُزامن تلقائياً وبشكل لحظي مع السجلات الحكومية وتصدر شهادة محدثة.",
    faq3Q: "ما هي آلية التعامل في حال حدوث مشكلات في الاتصال بالخوادم الحكومية؟",
    faq3A: "يحتوي النظام على Queue ذكي يقوم بإعادة المحاولة تلقائياً بشكل دوري، مع إرسال إشعار فوري لمدير النظام لتوضيح سبب الرفض إن وجد."
  },
  EN: {
    title: "Rentals & Financial Governance Portal (ERP)",
    subtitle: "Track lease agreements, cash flows, general ledger entries, and verify compliance with ZATCA e-invoicing Phase 2",
    ijaraTab: "🏠 Rental Contracts & Collection",
    accountingTab: "📊 Double-Entry Ledger",
    zakatab: "🛡️ ZATCA Tax Compliance Portal",
    lockTitle: "Upgrade Subscription Required",
    lockDesc: "Direct integration with ZATCA Phase-2 e-invoicing, advanced VAT auditing, and intelligent ledger compliance are exclusive to Gold and Enterprise plans.",
    lockBtn: "Upgrade Subscription Plan ➔",
    activeContracts: "Active Leases",
    totalCollected: "Total Collected",
    totalArrears: "Total Arrears",
    totalRevenue: "Expected Revenue",
    complianceRate: "Compliance Rate",
    searchPlaceholder: "Search by unit number or tenant name...",
    colUnit: "Unit Number",
    colTenant: "Tenant Name",
    colRent: "Annual Rent",
    colPaid: "Paid Amount",
    colDue: "Next Due Date",
    colStatus: "Status",
    colActions: "Actions",
    invoiceBtn: "Issue ZATCA Invoice",
    invoiceProcessing: "Validating financial data...",
    invoiceSuccess: "Invoice Issued & Documented!",
    ledgerTitle: "Double-Entry General Ledger",
    colDate: "Date",
    colDesc: "Transaction Details",
    colCat: "Category",
    colType: "Type",
    colAmount: "Amount",
    zatcaPortal: "Zakat, Tax & Customs Authority Compliance Portal (E-Invoicing Phase 2)",
    zatcaStatus: "Connection & Audit Status:",
    zatcaConnected: "Connected & Active (Secured)",
    zatcaUnregistered: "Pending Registration",
    zatcaCert: "Cryptographic Certificate (CSID):",
    zatcaValid: "Valid & Active",
    zatcaTelemetry: "Agent Sanad Live Telemetry Logs:",
    zatcaSubmit: "Export Ledger & Submit Audit Report",
    zatcaProcessing: "Encrypting and transmitting payload...",
    zatcaSuccess: "Audit Report Submitted Successfully!",
    revenue: "Revenue",
    expense: "Expense",
    rentCat: "Rent",
    payrollCat: "Payroll & Comm.",
    paid: "Paid",
    late: "Overdue",
    unpaid: "Unpaid",

    // New translation keys from prototype
    housingAlert: "✅ All lease contracts comply with Ministry of Housing standards and are subjected to automated compliance auditing.",
    newContractTitle: "➕ Register New Lease Agreement",
    unitNumber: "Unit Number / Code",
    tenantName: "Tenant Full Name",
    monthlyRentVal: "Monthly Rent Amount (SAR)",
    contractMonths: "Duration (Months)",
    startDate: "Start Date",
    endDate: "End Date",
    saveDraft: "Save as Temporary Draft",
    createAndSendZatca: "✓ Create & Transmit to ZATCA",
    zatcaAutoSendText: "Auto Integration: Contract will sync with ZATCA instantly",
    zatcaRegisterInstant: "✓ Lease details will be added to the financial registry",
    zatcaCertAutoSent: "✓ ZATCA compliance certificate will be emailed to tenant",
    activeContractsTitle: "📋 Rental Contracts Ledger & Status",
    colDuration: "Contract Period",
    colZatcaStatus: "ZATCA Registry",
    registered: "✓ Registered",
    processing: "⏳ Processing",
    actionUpdate: "Update Details",
    actionEnd: "Terminate Contract",
    actionFollowUp: "Follow up Request",
    zatcaComplianceTitle: "✅ ZATCA Compliance Analytics",
    regInZatcaCount: "Registered Contracts in ZATCA",
    pendingInZatcaCount: "Contracts Pending Registration",
    successRate: "Transaction Success Rate",
    lastUpdateText: "⏱️ Last Sync Timestamp:",
    lastUpdateVal: "1 hour ago",
    zatcaAutoSyncDesc: "Data Governance: All rental collections and contracts are automatically registered in ZATCA sandbox. Any modifications inside ORCA are replicated in real time.",

    // Accounting tab translations
    accMonthlyRev: "Expected Revenue Pool",
    accCollectedAmt: "Actual Collected Rent",
    accArrears: "Total Arrears & Receivables",
    accAlertOverdue: "⚠️ Financial Warning: 12 invoices are past due. Automatic reminders have been sent to tenants.",
    financialOverviewTitle: "📈 Cashflow Monitor & Budgeting",
    financialOverviewDesc: "Performance indicators show consistent revenue growth combined with highly stabilized operational expenses.",
    janJun2026: "January - June 2026",
    revDistTitle: "💳 Revenue Categories & Source Breakdown",
    saleRev: "Unit Sales Revenue",
    rentRev: "Lease Contracts Revenue",
    otherRev: "Admin Service Fees",
    createInvoiceTitle: "📄 Create New Invoice & Billing Record",
    invoiceNo: "Auto-Generated Invoice ID",
    clientName: "Client / Tenant Name",
    invoiceValue: "Invoice Gross Value (SAR)",
    invoiceType: "Transaction Category",
    dueDate: "Due Date & Settlement",
    notes: "Notes & Additional Info",
    erpIntegrationTitle: "⚙️ ERP System Integration:",
    erpIntegrationDesc: "This billing voucher is automatically posted to the general ledger to adjust real-time budget balances.",
    createInvoiceBtn: "💾 Post & Create Invoice",
    sendToClient: "📧 Send Notification",
    printBtn: "🖨️ Print Receipt",
    recentInvoicesTitle: "📋 Invoices Journal & Receivables",
    colInvoiceNo: "Invoice ID",
    colClient: "Client Name",
    colValue: "Gross Value",
    colIssueDate: "Issue Date",
    colDueDate: "Due Date",
    statusPaid: "✓ Paid",
    statusPending: "⏳ Collecting",
    statusOverdue: "✗ Overdue",
    actionShow: "View Details",
    actionRemind: "Remind Tenant",
    profitAnalysisTitle: "📊 Profitability & Performance Analysis",
    actualProfit: "Actual Cash Flow Profit",
    expectedProfit: "Target Forecasted Profit",
    collectionRateText: "Collection rate efficiency is 86%. Remaining variance will be collected within the next 15 days.",

    // ZATCA Tab translations
    zatcaPortalTitle: "🛡️ ZATCA Compliance Command Center",
    zatcaPortalSubtitle: "Official technological integration gateway with the Zakat, Tax & Customs Authority",
    howItWorksTitle: "⚙️ E-Invoicing Life Cycle workflow",
    howItWorksStep1: "1. Data Entry & Audit in ORCA",
    howItWorksStep2: "2. Automatic Encrypted Payload Sent",
    howItWorksStep3: "3. Cryptographic CSID Signed",
    howItWorksStep3Desc: "Official Government Signed Certificate",
    recentZatcaRegistrations: "📤 Signed ZATCA Cryptographic Logs",
    colZatcaCert: "Certificate Serial Number (CSID)",
    complianceInfoTitle: "✅ Compliance Specifications & Rules",
    basicRequirements: "Basic Requirements & Assets",
    req1: "Valid National ID or Iqama for both parties",
    req2: "Municipal property deed and license index",
    req3: "Certified electronic signature approvals",
    req4: "Designated bank escrow account details",
    benefits: "Investment Benefits & Protections",
    benefit1: "Full legal guarantee of contract validity",
    benefit2: "Streamlined electronic payment installments",
    benefit3: "Recognized official records in court rulings",
    benefit4: "Accurate monthly automated VAT declarations",
    faqTitle: "❓ Integration Frequently Asked Questions",
    faq1Q: "How long does it take to register a contract on ZATCA?",
    faq1A: "Usually between 5 to 10 minutes. ORCA packages the encrypted payload and transmits it directly to the government sandbox API.",
    faq2Q: "Can a contract be modified or terminated after ZATCA registration?",
    faq2A: "Yes. Any changes made in ORCA are automatically synced, updating the governmental records and generating a fresh certificate.",
    faq3Q: "What happens if there is a network outage on government servers?",
    faq3A: "ORCA stores requests in a secure offline queue and attempts re-delivery hourly. System admins receive detailed error diagnostics."
  }
};

export default function AdvancedErpView({ tenantPlan, initialTab = "ijara" }: { tenantPlan?: string; initialTab?: "ijara" | "accounting" | "zataka" }) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isDark = theme === "dark";
  const isArabic = lang === "AR";
  const dir = isArabic ? "rtl" : "ltr";

  // Navigation state
  const [activeTab, setActiveTab] = useState<"ijara" | "accounting" | "zataka">(initialTab);

  // Dynamic States from database
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeContractsCount: 12,
    totalCollected: 450000,
    totalArrears: 120000,
    totalRevenue: 570000,
    complianceRate: 98,
  });
  const [contracts, setContracts] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  // Local state for simulator forms
  const [contractForm, setContractForm] = useState({
    unit: "",
    tenant: "",
    rent: "5000",
    months: "12",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  const [contractSubmitting, setContractSubmitting] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    client: "",
    amount: "650000",
    type: "إيجار شهري",
    dueDate: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  const [invoices, setInvoices] = useState<any[]>([
    { id: "INV-2026-001234", client: "محمد الدعيع", value: 650000, issueDate: "2026-06-01", dueDate: "2026-06-15", status: "مدفوعة" },
    { id: "INV-2026-001233", client: "فاطمة الأحمد", value: 500000, issueDate: "2026-05-28", dueDate: "2026-06-10", status: "قيد التحصيل" },
    { id: "INV-2026-001232", client: "علي الشهري", value: 450000, issueDate: "2026-05-20", dueDate: "2026-06-05", status: "متأخرة" }
  ]);

  const [zatcaRegistrations, setZatcaRegistrations] = useState<any[]>([
    { unit: "A-501", tenant: "محمد الدعيع", date: "2026-05-15", cert: "ZTK-2026-78945", status: "مسجل" },
    { unit: "B-302", tenant: "فاطمة الأحمد", date: "2026-05-10", cert: "ZTK-2026-78904", status: "مسجل" },
    { unit: "C-105", tenant: "علي الشهري", date: "2026-05-20", cert: "-", status: "قيد المعالجة" }
  ]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Load database values
  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, contractsRes, ledgerRes] = await Promise.all([
          getErpStatsAction(),
          getRentalContractsAction(),
          getLedgerEntriesAction(),
        ]);
        
        if (statsRes.success && statsRes.stats) {
          setStats({
            activeContractsCount: statsRes.stats.activeContractsCount,
            totalCollected: statsRes.stats.totalCollected,
            totalArrears: statsRes.stats.totalArrears,
            totalRevenue: statsRes.stats.totalRevenue,
            complianceRate: statsRes.stats.complianceRate,
          });
        }
        if (contractsRes.success && contractsRes.rentals) {
          setContracts(contractsRes.rentals);
        }
        if (ledgerRes.success && ledgerRes.entries) {
          setLedger(ledgerRes.entries);
        }
      } catch (err) {
        console.error("Failed to load dynamic ERP statistics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Toast trigger utility
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Mock states for actions
  const [zatkaStatus, setZatkaStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS">("IDLE");
  const [invoiceStatusMap, setInvoiceStatusMap] = useState<Record<string, "IDLE" | "PROCESSING" | "SUCCESS">>({});
  const [search, setSearch] = useState("");

  // Unified designs on all three plans: no locks
  const isLocked = false;

  const handleZatkaSubmit = () => {
    setZatkaStatus("PROCESSING");
    setTimeout(() => {
      setZatkaStatus("SUCCESS");
      showToast(t.zatcaSuccess, "success");
    }, 2000);
  };

  const handleInvoiceCreate = (id: string) => {
    setInvoiceStatusMap(prev => ({ ...prev, [id]: "PROCESSING" }));
    setTimeout(() => {
      setInvoiceStatusMap(prev => ({ ...prev, [id]: "SUCCESS" }));
      showToast(t.invoiceSuccess, "success");
    }, 2000);
  };

  // Form submission handlers
  const handleContractFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.unit || !contractForm.tenant) {
      showToast(isArabic ? "يرجى تعبئة كافة الحقول المطلوبة!" : "Please fill in all required fields!", "error");
      return;
    }
    setContractSubmitting(true);
    setTimeout(() => {
      setContractSubmitting(false);
      const newId = "c-" + Date.now();
      const rentAmount = Number(contractForm.rent);
      
      const newEntry = {
        id: newId,
        unit: contractForm.unit,
        tenant: contractForm.tenant,
        phone: "050" + Math.floor(1000000 + Math.random() * 9000000),
        rent: rentAmount * 12,
        paid: 0,
        due: contractForm.startDate,
        status: "غير مدفوع",
        months: Number(contractForm.months)
      };

      const newZatca = {
        unit: contractForm.unit,
        tenant: contractForm.tenant,
        date: new Date().toISOString().split('T')[0],
        cert: "ZTK-2026-" + Math.floor(10000 + Math.random() * 90000),
        status: "مسجل"
      };

      setContracts(prev => [newEntry, ...prev]);
      setZatcaRegistrations(prev => [newZatca, ...prev]);
      setStats(prev => ({
        ...prev,
        activeContractsCount: prev.activeContractsCount + 1,
        totalRevenue: prev.totalRevenue + (rentAmount * 12),
        totalArrears: prev.totalArrears + (rentAmount * 12),
      }));

      setContractForm({
        unit: "",
        tenant: "",
        rent: "5000",
        months: "12",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });

      showToast(isArabic ? "تم تسجيل العقد وإرساله لهيئة الزكاة والضريبة والجمارك بنجاح!" : "Contract registered and transmitted to ZATCA successfully!", "success");
    }, 1500);
  };

  const handleInvoiceFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.client || !invoiceForm.amount) {
      showToast(isArabic ? "يرجى تعبئة كافة الحقول المطلوبة!" : "Please fill in all required fields!", "error");
      return;
    }
    setInvoiceSubmitting(true);
    setTimeout(() => {
      setInvoiceSubmitting(false);
      const invId = "INV-2026-00" + Math.floor(1235 + Math.random() * 8000);
      const invoiceVal = Number(invoiceForm.amount);

      const newInv = {
        id: invId,
        client: invoiceForm.client,
        value: invoiceVal,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceForm.dueDate,
        status: "قيد التحصيل"
      };

      const newLedger = {
        id: "led-" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: isArabic 
          ? `ترحيل فاتورة ${invId} — ${invoiceForm.type} (${invoiceForm.client})`
          : `Post invoice ${invId} — ${invoiceForm.type} (${invoiceForm.client})`,
        type: "إيراد",
        amount: invoiceVal,
        cat: "إيجار"
      };

      setInvoices(prev => [newInv, ...prev]);
      setLedger(prev => [newLedger, ...prev]);
      setStats(prev => ({
        ...prev,
        totalRevenue: prev.totalRevenue + invoiceVal,
        totalArrears: prev.totalArrears + invoiceVal,
      }));

      setInvoiceForm({
        client: "",
        amount: "650000",
        type: "إيجار شهري",
        dueDate: new Date().toISOString().split('T')[0],
        notes: ""
      });

      showToast(isArabic ? "تم إنشاء الفاتورة وترحيل القيد المحاسبي المزدوج!" : "Invoice created and double-entry ledger updated!", "success");
    }, 1500);
  };

  // Helper to format numerals based on language
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const formatCurrency = (val: number): string => {
    const formatted = Math.round(val).toLocaleString('en-US');
    if (!isArabic) return formatted + " SAR";
    return toArabicNumerals(formatted) + " ر.س";
  };

  const filteredContracts = contracts.filter(c =>
    (c.unit || "").toString().toLowerCase().includes(search.toLowerCase()) ||
    (c.tenant || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full relative" dir={dir}>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl animate-bounce backdrop-blur-md ${
          toast.type === "error" 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
            : toast.type === "info"
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
        }`}>
          <i className={`ph-fill ${toast.type === "error" ? 'ph-x-circle' : toast.type === "info" ? 'ph-info' : 'ph-check-circle'} text-xl`}></i>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header view */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
            <i className="ph-bold ph-scales"></i> {isArabic ? "الامتثال والتحصيل المالي" : "Financial Compliance & Ledger"}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-100 dark:bg-[#151f32] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('ijara')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'ijara' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.ijaraTab}
          </button>
          <button 
            onClick={() => setActiveTab('accounting')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'accounting' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.accountingTab}
          </button>
          <button 
            onClick={() => setActiveTab('zataka')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'zataka' 
                ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.zakatab}
          </button>
        </div>
      </div>

      {/* Dynamic Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.activeContracts}</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">{toArabicNumerals(stats.activeContractsCount)}</h3>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.totalCollected}</p>
          <h3 className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalCollected)}</h3>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.totalArrears}</p>
          <h3 className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalArrears)}</h3>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.complianceRate}</p>
          <h3 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-en">{toArabicNumerals(stats.complianceRate)}%</h3>
        </div>
      </div>

      {/* Upsell Locked Screen in Basic Plan */}
      {isLocked && activeTab !== 'ijara' ? (
        <div className="relative overflow-hidden border border-amber-500/20 bg-amber-500/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 text-2xl shrink-0">
              <i className="ph-fill ph-lock-key"></i>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-2">{t.lockTitle}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">{t.lockDesc}</p>
            </div>
          </div>
          <button className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow cursor-pointer whitespace-nowrap">
            {t.lockBtn}
          </button>
        </div>
      ) : (
        <div className="fade-in space-y-6 md:space-y-8">
          
          {/* ==================== Tab 1: Rental Agreements & Collection ==================== */}
          {activeTab === 'ijara' && (
            <>
              {/* Alert compliance info */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <i className="ph ph-shield-check text-lg shrink-0"></i>
                <span>{t.housingAlert}</span>
              </div>

              {/* Form & Table layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Lease Creation Form Card */}
                <div className="lg:col-span-5 bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm h-fit">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                    <i className="ph ph-file-plus text-[#df7b62]"></i>
                    {t.newContractTitle}
                  </h3>
                  
                  <form onSubmit={handleContractFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.unitNumber} *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. A-501" 
                          required
                          value={contractForm.unit}
                          onChange={(e) => setContractForm(prev => ({ ...prev, unit: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.tenantName} *</label>
                        <input 
                          type="text" 
                          placeholder={isArabic ? "محمد العتيبي" : "Fahad Al-Dossari"} 
                          required
                          value={contractForm.tenant}
                          onChange={(e) => setContractForm(prev => ({ ...prev, tenant: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.monthlyRentVal} *</label>
                        <input 
                          type="number" 
                          required
                          value={contractForm.rent}
                          onChange={(e) => setContractForm(prev => ({ ...prev, rent: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.contractMonths} *</label>
                        <select 
                          value={contractForm.months}
                          onChange={(e) => setContractForm(prev => ({ ...prev, months: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        >
                          <option value="12">{isArabic ? "١٢ شهراً" : "12 Months"}</option>
                          <option value="24">{isArabic ? "٢٤ شهراً" : "24 Months"}</option>
                          <option value="36">{isArabic ? "٣٦ شهراً" : "36 Months"}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.startDate} *</label>
                        <input 
                          type="date" 
                          required
                          value={contractForm.startDate}
                          onChange={(e) => setContractForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.endDate} *</label>
                        <input 
                          type="date" 
                          required
                          value={contractForm.endDate}
                          onChange={(e) => setContractForm(prev => ({ ...prev, endDate: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* ZATCA Integration details box */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide">ZATCA</span>
                        {t.zatcaAutoSendText}
                      </div>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc list-inside space-y-1">
                        <li>{t.zatcaRegisterInstant}</li>
                        <li>{t.zatcaCertAutoSent}</li>
                      </ul>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button 
                        type="submit"
                        disabled={contractSubmitting}
                        className="flex-1 bg-[#df7b62] hover:bg-[#df7b62]/90 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {contractSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <i className="ph ph-shield-check"></i>
                        )}
                        {t.createAndSendZatca}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => showToast(isArabic ? "تم حفظ مسودة العقد بنجاح!" : "Draft contract saved successfully!", "info")}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm py-3 px-4 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer"
                      >
                        {t.saveDraft}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Contracts Table List Card */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-[#0b1120]/10">
                      <h2 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">{t.activeContractsTitle}</h2>
                      <div className="flex items-center border border-slate-250 dark:border-slate-800 rounded-full px-3 py-1.5 transition-all bg-slate-50 dark:bg-[#0b1120] focus-within:border-[#df7b62]">
                        <i className="ph ph-magnifying-glass text-slate-400 text-sm ml-2"></i>
                        <input 
                          type="text" 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t.searchPlaceholder} 
                          className="bg-transparent border-none outline-none text-xs w-48 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" 
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-right border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30 font-semibold">
                            <th className="p-4">{t.colUnit}</th>
                            <th className="p-4">{t.colTenant}</th>
                            <th className="p-4">{t.colRent}</th>
                            <th className="p-4">{t.colPaid}</th>
                            <th className="p-4">{t.colDuration}</th>
                            <th className="p-4">{t.colZatcaStatus}</th>
                            <th className="p-4 text-center">{t.colActions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                          {filteredContracts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                {isArabic ? "لا توجد عقود إيجار مسجلة" : "No lease agreements found."}
                              </td>
                            </tr>
                          ) : (
                            filteredContracts.map((c) => {
                              const status = c.status;
                              const invStatus = invoiceStatusMap[c.id] || "IDLE";
                              return (
                                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                  <td className="p-4 font-bold text-slate-900 dark:text-white">{c.unit}</td>
                                  <td className="p-4">{c.tenant}</td>
                                  <td className="p-4 font-en font-semibold">{formatCurrency(c.rent)}</td>
                                  <td className="p-4 font-en font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.paid)}</td>
                                  <td className="p-4 font-en text-slate-500 dark:text-slate-400 text-xs">{toArabicNumerals(c.due)}</td>
                                  <td className="p-4">
                                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                      {t.registered}
                                    </span>
                                  </td>
                                  <td className="p-4 flex justify-center gap-1.5">
                                    <button
                                      onClick={() => handleInvoiceCreate(c.id)}
                                      disabled={invStatus !== "IDLE"}
                                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                                        invStatus === "SUCCESS"
                                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                          : 'bg-[#df7b62]/10 text-[#df7b62] border border-[#df7b62]/20 hover:bg-[#df7b62] hover:text-white'
                                      }`}
                                    >
                                      {invStatus === "IDLE" && <i className="ph ph-receipt"></i>}
                                      {invStatus === "PROCESSING" && <div className="w-3 h-3 border-2 border-[#df7b62] border-t-transparent rounded-full animate-spin"></div>}
                                      {invStatus === "SUCCESS" && <i className="ph ph-check-circle"></i>}
                                      <span>
                                        {invStatus === "IDLE" ? t.invoiceBtn : invStatus === "PROCESSING" ? t.invoiceProcessing : t.invoiceSuccess}
                                      </span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ZATCA Compliance Analytics widget */}
                  <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                    <h3 className="text-slate-900 dark:text-white font-bold text-base mb-3">{t.zatcaComplianceTitle}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                        <strong className="text-emerald-500 text-lg md:text-xl block font-bold">{toArabicNumerals(245)}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold">{t.regInZatcaCount}</span>
                      </div>
                      <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-center">
                        <strong className="text-amber-500 text-lg md:text-xl block font-bold">{toArabicNumerals(3)}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold">{t.pendingInZatcaCount}</span>
                      </div>
                      <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 text-center">
                        <strong className="text-indigo-500 text-lg md:text-xl block font-bold">{toArabicNumerals(98)}%</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold">{t.successRate}</span>
                      </div>
                      <div className="bg-slate-100/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-250 dark:border-slate-800/80 text-center">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold mb-1">{t.lastUpdateText}</span>
                        <strong className="text-slate-900 dark:text-slate-200 text-xs font-bold block">{t.lastUpdateVal}</strong>
                      </div>
                    </div>
                    <p className="text-slate-550 dark:text-slate-400 text-xs mt-4 leading-relaxed bg-slate-50 dark:bg-[#0b1120]/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      {t.zatcaAutoSyncDesc}
                    </p>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ==================== Tab 2: Accounting, Ledger, and Cashflows ==================== */}
          {activeTab === 'accounting' && (
            <>
              {/* Overdue alert */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-sm font-medium">
                <i className="ph ph-warning-circle text-lg shrink-0"></i>
                <span>{t.accAlertOverdue}</span>
              </div>

              {/* Financial Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* SVG Revenue Chart */}
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-2 flex items-center gap-2">
                    <i className="ph ph-chart-bar text-emerald-500"></i>
                    {t.financialOverviewTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t.financialOverviewDesc}</p>
                  
                  {/* SVG Chart Drawing */}
                  <div className="bg-[#0b1120]/40 dark:bg-[#0b1120]/60 border border-slate-250 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-center items-center">
                    <svg viewBox="0 0 500 200" className="w-full h-[180px]">
                      {/* Grid Lines */}
                      <line x1="40" y1="30" x2="480" y2="30" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
                      <line x1="40" y1="80" x2="480" y2="80" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
                      <line x1="40" y1="130" x2="480" y2="130" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.8" />
                      <line x1="40" y1="170" x2="480" y2="170" stroke="#1e293b" strokeWidth="1" />

                      {/* Bar 1 (Jan) */}
                      <rect x="70" y="100" width="22" height="70" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="96" y="130" width="22" height="40" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Bar 2 (Feb) */}
                      <rect x="140" y="80" width="22" height="90" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="166" y="120" width="22" height="50" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Bar 3 (Mar) */}
                      <rect x="210" y="60" width="22" height="110" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="236" y="110" width="22" height="60" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Bar 4 (Apr) */}
                      <rect x="280" y="40" width="22" height="130" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="306" y="115" width="22" height="55" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Bar 5 (May) */}
                      <rect x="350" y="50" width="22" height="120" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="376" y="125" width="22" height="45" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Bar 6 (Jun) */}
                      <rect x="420" y="30" width="22" height="140" rx="3" fill="#10b981" fillOpacity="0.85" />
                      <rect x="446" y="135" width="22" height="35" rx="3" fill="#ef4444" fillOpacity="0.85" />

                      {/* Labels */}
                      <text x="94" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">JAN</text>
                      <text x="164" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">FEB</text>
                      <text x="234" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">MAR</text>
                      <text x="304" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">APR</text>
                      <text x="374" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">MAY</text>
                      <text x="444" y="190" fill="#64748b" fontSize="10" textAnchor="middle" className="font-semibold font-en">JUN</text>

                      {/* Legend */}
                      <circle cx="45" cy="15" r="4" fill="#10b981" />
                      <text x="55" y="18" fill="#64748b" fontSize="9" className="font-bold">{isArabic ? "الإيرادات" : "Revenue"}</text>
                      <circle cx="125" cy="15" r="4" fill="#ef4444" />
                      <text x="135" y="18" fill="#64748b" fontSize="9" className="font-bold">{isArabic ? "المصروفات" : "Expenses"}</text>
                    </svg>
                    <span className="text-[10px] text-slate-500 mt-2 font-semibold">{t.janJun2026}</span>
                  </div>
                </div>

                {/* Revenue Source breakdown distribution progress bars */}
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-2 flex items-center gap-2">
                      <i className="ph ph-folders text-indigo-500"></i>
                      {t.revDistTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{isArabic ? "تفصيل توزيع مصادر السيولة الواردة" : "Detailed source classification of inward cashflow"}</p>
                    
                    <div className="space-y-4">
                      {/* Sale revenue */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 dark:text-slate-400 font-semibold">{t.saleRev}</span>
                          <strong className="text-emerald-500 font-bold">{toArabicNumerals("65%")}</strong>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0b1120] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "65%" }}></div>
                        </div>
                      </div>

                      {/* Rent revenue */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 dark:text-slate-400 font-semibold">{t.rentRev}</span>
                          <strong className="text-[#df7b62] font-bold">{toArabicNumerals("25%")}</strong>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0b1120] rounded-full overflow-hidden">
                          <div className="h-full bg-[#df7b62] rounded-full" style={{ width: "25%" }}></div>
                        </div>
                      </div>

                      {/* Other revenue */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 dark:text-slate-400 font-semibold">{t.otherRev}</span>
                          <strong className="text-amber-500 font-bold">{toArabicNumerals("10%")}</strong>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0b1120] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                    {isArabic 
                      ? "✓ يتم تحديث تصنيف الموازنة تلقائياً بناءً على إدخال قيود الإيجار ونظام الفواتير المزدوج."
                      : "✓ Budget classification automatically updates based on double-entry rentals and ledger postings."}
                  </p>
                </div>

              </div>

              {/* Invoice generator and Ledger view */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Create Invoice Form Card */}
                <div className="lg:col-span-5 bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm h-fit">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                    <i className="ph ph-receipt-bold text-[#df7b62]"></i>
                    {t.createInvoiceTitle}
                  </h3>

                  <form onSubmit={handleInvoiceFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.invoiceNo}</label>
                        <input 
                          type="text" 
                          value="INV-2026-001235" 
                          disabled 
                          className="bg-slate-100 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-500 opacity-60 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.clientName} *</label>
                        <input 
                          type="text" 
                          placeholder={isArabic ? "محمد الدعيع" : "Ali Al-Dossari"} 
                          required
                          value={invoiceForm.client}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.invoiceValue} *</label>
                        <input 
                          type="number" 
                          required
                          value={invoiceForm.amount}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.invoiceType} *</label>
                        <select 
                          value={invoiceForm.type}
                          onChange={(e) => setInvoiceForm(prev => ({ ...prev, type: e.target.value }))}
                          className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                        >
                          <option value="قسط بيع وحدة">{isArabic ? "قسط بيع وحدة" : "Unit Installment"}</option>
                          <option value="إيجار شهري">{isArabic ? "إيجار شهري" : "Monthly Rent"}</option>
                          <option value="رسوم إدارية">{isArabic ? "رسوم إدارية" : "Administrative Fees"}</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.dueDate} *</label>
                      <input 
                        type="date" 
                        required
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.notes}</label>
                      <textarea 
                        placeholder={isArabic ? "أضف ملاحظات الفاتورة هنا..." : "Write invoice details..."}
                        value={invoiceForm.notes}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="bg-slate-50 dark:bg-[#0b1120] border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#df7b62] text-slate-900 dark:text-white h-20 resize-none"
                      />
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-400 leading-relaxed">
                      <strong>{t.erpIntegrationTitle}</strong> {t.erpIntegrationDesc}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="submit"
                        disabled={invoiceSubmitting}
                        className="flex-1 bg-[#df7b62] hover:bg-[#df7b62]/90 disabled:opacity-50 text-white font-bold text-xs py-3 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {invoiceSubmitting ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <i className="ph ph-floppy-disk"></i>
                        )}
                        {t.createInvoiceBtn}
                      </button>

                      <button 
                        type="button"
                        onClick={() => showToast(isArabic ? "تم إرسال الفاتورة عبر البريد بنجاح!" : "Invoice sent via email!", "info")}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 px-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
                      >
                        {t.sendToClient}
                      </button>

                      <button 
                        type="button"
                        onClick={() => showToast(isArabic ? "جاري تهيئة الطباعة..." : "Preparing print spool...", "info")}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 px-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
                      >
                        {t.printBtn}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Ledger / Invoices List Table */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* General Invoices Ledger */}
                  <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1120]/10 flex justify-between items-center">
                      <h2 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">{t.recentInvoicesTitle}</h2>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-right border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30 font-semibold">
                            <th className="p-4">{t.colInvoiceNo}</th>
                            <th className="p-4">{t.colClient}</th>
                            <th className="p-4">{t.colValue}</th>
                            <th className="p-4">{t.colIssueDate}</th>
                            <th className="p-4">{t.colDueDate}</th>
                            <th className="p-4">{t.colStatus}</th>
                            <th className="p-4 text-center">{t.colActions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                          {invoices.map((inv, index) => {
                            const isPaid = inv.status === "مدفوعة";
                            const isPending = inv.status === "قيد التحصيل";
                            return (
                              <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="p-4 font-bold text-slate-900 dark:text-white">{inv.id}</td>
                                <td className="p-4 font-medium">{inv.client}</td>
                                <td className="p-4 font-en font-bold text-[#df7b62]">{formatCurrency(inv.value)}</td>
                                <td className="p-4 font-en text-slate-500 text-xs">{toArabicNumerals(inv.issueDate)}</td>
                                <td className="p-4 font-en text-slate-500 text-xs">{toArabicNumerals(inv.dueDate)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                    isPaid 
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                      : isPending 
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  }`}>
                                    {isPaid ? t.statusPaid : isPending ? t.statusPending : t.statusOverdue}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <button 
                                    onClick={() => showToast(`${t.actionShow} ${inv.id}`, "info")}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer border border-slate-200 dark:border-slate-700/80"
                                  >
                                    {isPaid ? t.actionShow : t.actionRemind}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Profitability Analysis Card */}
                  <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                    <h3 className="text-slate-900 dark:text-white font-bold text-base mb-3">{t.profitAnalysisTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                        <strong className="text-emerald-500 text-lg md:text-xl font-bold font-en block">{formatCurrency(2450000)}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.actualProfit}</span>
                      </div>
                      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                        <strong className="text-indigo-500 text-lg md:text-xl font-bold font-en block">{formatCurrency(2850000)}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{t.expectedProfit}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-4 text-center md:text-right">
                      {t.collectionRateText}
                    </p>
                  </div>

                </div>

              </div>
            </>
          )}

          {/* ==================== Tab 3: ZATCA Compliance Portal ==================== */}
          {activeTab === 'zataka' && (
            <>
              {/* Stats overview boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm">
                  <span className="text-2xl font-black text-emerald-500 block font-en">{toArabicNumerals(245)}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{isArabic ? "عقود معتمدة و مسجلة" : "Contracts Approved & Sync"}</span>
                </div>
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm">
                  <span className="text-2xl font-black text-amber-500 block font-en">{toArabicNumerals(3)}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{isArabic ? "قيد التدقيق الفوري" : "Under Active Validation"}</span>
                </div>
                <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm">
                  <span className="text-2xl font-black text-[#df7b62] block font-en">{toArabicNumerals(98)}%</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{isArabic ? "معدل سلامة المطابقة" : "Compliance Safety Score"}</span>
                </div>
              </div>

              {/* ZATCA Telemetry Dashboard Box */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                    <i className="ph-fill ph-seal-check text-indigo-500"></i>
                    {t.zatcaPortalTitle}
                  </h3>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">{t.zatcaStatus}</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        {t.zatcaConnected}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">{t.zatcaCert}</span>
                      <span className="text-indigo-500 dark:text-indigo-400 font-bold">{t.zatcaValid}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleZatkaSubmit}
                  disabled={zatkaStatus !== "IDLE"}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 ${
                    zatkaStatus === "SUCCESS"
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-indigo-650 hover:bg-indigo-700 text-white hover:scale-[1.02]'
                  }`}
                >
                  {zatkaStatus === "IDLE" && <i className="ph ph-shield-check text-base"></i>}
                  {zatkaStatus === "PROCESSING" && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {zatkaStatus === "SUCCESS" && <i className="ph ph-check-circle text-base"></i>}
                  <span>
                    {zatkaStatus === "IDLE" ? t.zatcaSubmit : zatkaStatus === "PROCESSING" ? t.zatcaProcessing : t.zatcaSuccess}
                  </span>
                </button>
              </div>

              {/* How it works pipeline diagram widget */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <i className="ph ph-network text-indigo-500"></i>
                  {t.howItWorksTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  
                  <div className="bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-inner">
                    <strong className="text-[#df7b62] text-xl block mb-1">1</strong>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.howItWorksStep1}</span>
                  </div>

                  <div className="hidden md:flex justify-center text-[#df7b62] text-2xl font-bold">
                    <i className={`ph ${isArabic ? 'ph-arrow-left' : 'ph-arrow-right'}`}></i>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-inner">
                    <strong className="text-[#df7b62] text-xl block mb-1">2</strong>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.howItWorksStep2}</span>
                  </div>

                  <div className="hidden md:flex justify-center text-[#df7b62] text-2xl font-bold">
                    <i className={`ph ${isArabic ? 'ph-arrow-left' : 'ph-arrow-right'}`}></i>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-center shadow-md">
                    <strong className="text-emerald-500 text-xl block mb-1">3</strong>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">{t.howItWorksStep3}</span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">{t.howItWorksStep3Desc}</span>
                  </div>

                </div>
              </div>

              {/* ZATCA Telemetry Console log */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                <h4 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                  <i className="ph-fill ph-terminal text-[#df7b62]"></i>
                  {t.zatcaTelemetry}
                </h4>
                <div className="bg-slate-950 text-slate-300 font-mono text-xs rounded-xl p-4 space-y-2 h-[200px] overflow-y-auto no-scrollbar border border-slate-900 leading-relaxed text-left" dir="ltr">
                  <p className="text-indigo-400">INFO: [2026-05-31 22:15:02] Connected to ZATCA SandBox API endpoint.</p>
                  <p className="text-emerald-400">SUCCESS: [2026-05-31 22:15:05] Cryptographic CSID certificate verified. (Expires 2027-05-31)</p>
                  <p className="text-[#df7b62]">AGENT: [Sanad] Initialized automatic daily audit log scan.</p>
                  <p className="text-slate-500">DEBUG: Loading collected payments since last transaction cycle...</p>
                  <p className="text-emerald-400">SUCCESS: [2026-05-31 22:20:00] Signed payload verified by ZATCA gateway. E-invoice hash generated successfully.</p>
                  {zatkaStatus === "PROCESSING" && (
                    <p className="text-amber-400 animate-pulse">&gt;&gt;&gt; Transmitting batch ledger reporting payload. Waiting for response...</p>
                  )}
                  {zatkaStatus === "SUCCESS" && (
                    <>
                      <p className="text-indigo-400">&gt;&gt;&gt; Payload transmission completed. Status code: 200 OK.</p>
                      <p className="text-emerald-400 font-bold">SUCCESS: [ZATCA GATEWAY] Audit report matched. Tax clearance certificate updated.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Recent ZATCA registration certificate hashes */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50/50 dark:bg-[#0b1120]/10 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">{t.recentZatcaRegistrations}</h3>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-right border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30 font-semibold">
                        <th className="p-4">{t.colUnit}</th>
                        <th className="p-4">{t.colTenant}</th>
                        <th className="p-4">{isArabic ? "تاريخ التوثيق" : "Documentation Date"}</th>
                        <th className="p-4 font-en">{t.colZatcaCert}</th>
                        <th className="p-4">{t.colZatcaStatus}</th>
                        <th className="p-4 text-center">{t.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {zatcaRegistrations.map((z, index) => {
                        const isReg = z.status === "مسجل";
                        return (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">{z.unit}</td>
                            <td className="p-4 font-medium">{z.tenant}</td>
                            <td className="p-4 font-en text-slate-500 text-xs">{toArabicNumerals(z.date)}</td>
                            <td className="p-4 font-en text-indigo-500 font-semibold">{z.cert}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                isReg 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {isReg ? t.registered : t.processing}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => showToast(isArabic ? "جاري تنزيل ملف PDF المشفر..." : "Downloading signed ZATCA PDF...", "info")}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer border border-slate-200 dark:border-slate-700/80"
                              >
                                {isArabic ? "تنزيل الشهادة" : "Download CSID"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compliance matrices: guidelines grid */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <i className="ph ph-notebook text-indigo-500"></i>
                  {t.complianceInfoTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  
                  <div className="bg-slate-50 dark:bg-[#0b1120]/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-[#df7b62] font-bold text-sm border-b border-slate-250 dark:border-slate-800/80 pb-2">{t.basicRequirements}</h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-none">
                      <li className="flex items-center gap-2">
                        <i className="ph ph-check text-emerald-500 font-bold"></i>
                        {t.req1}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-check text-emerald-500 font-bold"></i>
                        {t.req2}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-check text-emerald-500 font-bold"></i>
                        {t.req3}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-check text-emerald-500 font-bold"></i>
                        {t.req4}
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0b1120]/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-[#df7b62] font-bold text-sm border-b border-slate-250 dark:border-slate-800/80 pb-2">{t.benefits}</h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-none">
                      <li className="flex items-center gap-2">
                        <i className="ph ph-star-bold text-amber-500"></i>
                        {t.benefit1}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-star-bold text-amber-500"></i>
                        {t.benefit2}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-star-bold text-amber-500"></i>
                        {t.benefit3}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="ph ph-star-bold text-amber-500"></i>
                        {t.benefit4}
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* FAQ Section with accordion toggles */}
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <i className="ph ph-question text-[#df7b62]"></i>
                  {t.faqTitle}
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-850 mt-2">
                  
                  {/* Q1 */}
                  <div className="py-4">
                    <button 
                      onClick={() => setFaqOpenIndex(faqOpenIndex === 0 ? null : 0)}
                      className="w-full flex justify-between items-center text-right font-bold text-xs md:text-sm text-slate-900 dark:text-white hover:text-[#df7b62] transition-colors cursor-pointer"
                    >
                      <span>{t.faq1Q}</span>
                      <i className={`ph ${faqOpenIndex === 0 ? 'ph-caret-up' : 'ph-caret-down'} text-slate-500`}></i>
                    </button>
                    {faqOpenIndex === 0 && (
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-[#0b1120]/25 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/55">
                        {t.faq1A}
                      </p>
                    )}
                  </div>

                  {/* Q2 */}
                  <div className="py-4">
                    <button 
                      onClick={() => setFaqOpenIndex(faqOpenIndex === 1 ? null : 1)}
                      className="w-full flex justify-between items-center text-right font-bold text-xs md:text-sm text-slate-900 dark:text-white hover:text-[#df7b62] transition-colors cursor-pointer"
                    >
                      <span>{t.faq2Q}</span>
                      <i className={`ph ${faqOpenIndex === 1 ? 'ph-caret-up' : 'ph-caret-down'} text-slate-500`}></i>
                    </button>
                    {faqOpenIndex === 1 && (
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-[#0b1120]/25 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/55">
                        {t.faq2A}
                      </p>
                    )}
                  </div>

                  {/* Q3 */}
                  <div className="py-4">
                    <button 
                      onClick={() => setFaqOpenIndex(faqOpenIndex === 2 ? null : 2)}
                      className="w-full flex justify-between items-center text-right font-bold text-xs md:text-sm text-slate-900 dark:text-white hover:text-[#df7b62] transition-colors cursor-pointer"
                    >
                      <span>{t.faq3Q}</span>
                      <i className={`ph ${faqOpenIndex === 2 ? 'ph-caret-up' : 'ph-caret-down'} text-slate-500`}></i>
                    </button>
                    {faqOpenIndex === 2 && (
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-[#0b1120]/25 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/55">
                        {t.faq3A}
                      </p>
                    )}
                  </div>

                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* Double entry ledger entries log list table (rendered globally below context depending on page) */}
      {activeTab === 'accounting' && !isLocked && (
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mt-8">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1120]/10 flex items-center justify-between">
            <h2 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">{t.ledgerTitle}</h2>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30 font-semibold">
                  <th className="p-4">{t.colDate}</th>
                  <th className="p-4">{t.colCat}</th>
                  <th className="p-4">{t.colDesc}</th>
                  <th className="p-4">{t.colType}</th>
                  <th className="p-4">{t.colAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      {isArabic ? "لا توجد قيود مسجلة حالياً." : "No registered ledger entries found."}
                    </td>
                  </tr>
                ) : (
                  ledger.map((l, index) => {
                    const isRev = l.type === "إيراد" || l.type === "Revenue";
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-en text-slate-500 text-xs">{toArabicNumerals(l.date)}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            {l.cat === "إيجار" || l.cat === "Rent" ? t.rentCat : t.payrollCat}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{l.desc}</td>
                        <td className="p-4 font-semibold">
                          <span className={`inline-flex items-center gap-1.5 ${isRev ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isRev ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isRev ? t.revenue : t.expense}
                          </span>
                        </td>
                        <td className={`p-4 font-en font-black text-sm md:text-base ${isRev ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isRev ? "+" : "-"}{formatCurrency(l.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer copyright mock details */}
      <div className="text-center text-slate-400 dark:text-slate-550 border-t border-slate-200 dark:border-slate-850 pt-6 mt-12 text-xs">
        <p className="font-semibold">ORCA CRM — {isArabic ? "منصة حوكمة التطوير العقاري المتكاملة" : "Integrated Real Estate Governance ERP System"} © ٢٠٢٦</p>
      </div>

    </div>
  );
}
