// lib/i18n/translations.ts
// Unified translation dictionary for ORCA CRM
// Keys: translationKey → { ar: string; en: string }

export type Lang = 'AR' | 'EN';
export type TranslationDict = Record<string, { ar: string; en: string }>;

export const dict: TranslationDict = {

  // ── Header ─────────────────────────────────────
  'header.operations':        { ar: 'العمليات',           en: 'Operations' },
  'header.overview':           { ar: 'نظرة عامة',           en: 'Overview' },
  'header.searchPlaceholder':  { ar: 'البحث داخل الصفحة الحالية...', en: 'Search current page...' },
  'header.searchLabel':        { ar: 'بحث',                en: 'Search' },
  'header.changeLanguage':     { ar: 'تغيير اللغة',         en: 'Change Language' },
  'header.lightMode':          { ar: 'الوضع الفاتح',        en: 'Light Mode' },
  'header.darkMode':           { ar: 'الوضع الداكن',        en: 'Dark Mode' },
  'header.logout':             { ar: 'تسجيل الخروج',        en: 'Logout' },
  'header.openMenu':           { ar: 'فتح القائمة',         en: 'Open Menu' },

  // ── Sidebar Sections ────────────────────────────
  'sidebar.sales':              { ar: 'المبيعات والعملاء',      en: 'Sales & Clients' },
  'sidebar.properties':         { ar: 'العقارات والعقود',      en: 'Properties & Contracts' },
  'sidebar.marketing':          { ar: 'التسويق والذكاء',       en: 'Marketing & Intelligence' },
  'sidebar.operations':         { ar: 'العمليات',              en: 'Operations' },
  'sidebar.preview':            { ar: 'معاينة محدودة',         en: 'Limited Preview' },
  'sidebar.settings':           { ar: 'الإعدادات',              en: 'Settings' },

  // ── Sidebar Items ───────────────────────────────
  'nav.dashboard':              { ar: 'لوحة التحكم',            en: 'Dashboard' },
  'nav.leads':                  { ar: 'العملاء المحتملون',       en: 'Leads' },
  'nav.offers':                 { ar: 'العروض العقارية',         en: 'Offers' },
  'nav.tours':                  { ar: 'الجولات العقارية',        en: 'Property Tours' },
  'nav.projects':               { ar: 'المشاريع العقارية',       en: 'Projects' },
  'nav.properties':             { ar: 'العقارات',               en: 'Properties' },
  'nav.rental':                 { ar: 'العقود والمدفوعات',       en: 'Contracts & Payments' },
  'nav.calculator':             { ar: 'حاسبة التمويل السكني',    en: 'Mortgage Calculator' },
  'nav.marketing':              { ar: 'الإعلان والتسويق',        en: 'Advertising & Marketing' },
  'nav.campaigns':              { ar: 'الحملات',                en: 'Campaigns' },
  'nav.sales':                  { ar: 'أداء المبيعات',           en: 'Sales Performance' },
  'nav.agents':                 { ar: 'الوكلاء الذكيون',         en: 'AI Agents' },
  'nav.tasks':                  { ar: 'المهام والتذكيرات',       en: 'Tasks & Reminders' },
  'nav.documents':              { ar: 'مستودع المستندات',        en: 'Document Repository' },
  'nav.helpdesk':               { ar: 'مركز الدعم',              en: 'Support Center' },
  'nav.email':                  { ar: 'البريد الإلكتروني',       en: 'Email' },
  'nav.whatsapp':               { ar: 'واتساب',                 en: 'WhatsApp' },
  'nav.settings':               { ar: 'الإعدادات',              en: 'Settings' },

  // ── Sidebar Badges ──────────────────────────────
  'badge.preview':              { ar: 'معاينة',   en: 'Preview' },
  'badge.comingSoon':           { ar: 'قريباً',   en: 'Soon' },
  'badge.paused':               { ar: 'متوقف',    en: 'Paused' },

  // ── Dashboard Welcome ───────────────────────────
  'dash.welcome':               { ar: 'مرحباً بك،',           en: 'Welcome back,' },
  'dash.welcomeDesc':           { ar: 'مراقبة فورية لمؤشرات المبيعات ونشاط الجولات، مدعومة بمكتبة الإجراءات السريعة ومساعد التنبؤات التلقائي.', en: 'Real-time sales metrics, property tours tracking, quick workflow actions, and predictive AI analytics.' },
  'dash.todayDate':             { ar: 'تاريخ اليوم',           en: "Today's Date" },

  // ── Dashboard KPI Cards ─────────────────────────
  'kpi.closedContracts':         { ar: 'العقود المغلقة',              en: 'Closed Contracts' },
  'kpi.closedContracts.desc':    { ar: 'إجمالي عقود المبيعات الموثقة',   en: 'Total validated sales agreements' },
  'kpi.sentOffers':              { ar: 'العروض المرسلة',               en: 'Sent Offers' },
  'kpi.sentOffers.desc':         { ar: 'عروض الأسعار قيد التفاوض',      en: 'Outbound price quotations under negotiation' },
  'kpi.dailyTours':              { ar: 'جولات اليوم',                 en: 'Daily Tours' },
  'kpi.dailyTours.desc':         { ar: 'زيارات المعاينة الميدانية اليوم', en: 'Tours and visits scheduled for today' },
  'kpi.totalLeads':              { ar: 'إجمالي العملاء',              en: 'Total Leads' },
  'kpi.totalLeads.desc':         { ar: 'العملاء المسجلون في قاعدة البيانات', en: 'Prospects registered in CRM database' },
  'kpi.whatsappConvos':          { ar: 'محادثات واتساب',              en: 'WhatsApp Conversations' },
  'kpi.whatsappConvos.desc':     { ar: 'إجمالي المحادثات النشطة عبر واتساب', en: 'Total active WhatsApp conversations' },
  'kpi.whatsappNewLeads':        { ar: 'عملاء جدد من واتساب',          en: 'New WhatsApp Leads' },
  'kpi.whatsappNewLeads.desc':   { ar: 'عملاء جدد آخر 7 أيام',          en: 'New WhatsApp leads in last 7 days' },
  'kpi.unreadMessages':          { ar: 'رسائل غير مقروءة',            en: 'Unread Messages' },
  'kpi.unreadMessages.desc':     { ar: 'رسائل واتساب واردة بانتظار الرد', en: 'Inbound WhatsApp messages pending reply' },

  // ── Dashboard Quick Actions ─────────────────────
  'action.quick':               { ar: 'إجراء سريع',              en: 'Quick Actions' },
  'action.quickDesc':            { ar: 'قم بإصدار العقود والوثائق للوحدات العقارية الشاغرة وربطها بالعميل فوراً.', en: 'Instantly generate new sales agreements, register buyer details and update inventory.' },
  'action.issueContract':        { ar: 'إصدار عقد جديد',          en: 'Issue New Contract' },

  // ── Dashboard AI Panel ──────────────────────────
  'ai.title':                   { ar: 'مساعد التنبؤات والتحليلات',     en: 'Predictive AI Analytics' },
  'ai.title.sub':               { ar: 'مؤشرات توقعات الإغلاق وقنوات التواصل', en: 'Sales closure predictions & optimal contact windows' },
  'ai.status':                  { ar: 'محدث',                   en: 'Synced' },
  'ai.contactTimes':            { ar: 'أفضل أوقات التواصل',       en: 'Optimal Call Times' },
  'ai.closePrediction':         { ar: 'المتوقع إغلاقهم',          en: 'Propensity to Close' },
  'ai.campaignGuidance':         { ar: 'التسويق المقترح',          en: 'Campaign Guidance' },
  'ai.noSlots':                 { ar: 'لا توجد أوقات مقترحة.',      en: 'No slots computed.' },
  'ai.noCandidates':            { ar: 'لا توجد صفقات مرشحة.',      en: 'No closing candidates.' },
  'ai.salesOptimal':            { ar: 'المبيعات مستقرة.',          en: 'Sales are optimal.' },
  'ai.footer':                  { ar: 'معالجة التنبؤات قائمة على خوارزميات التعلم الآلي.', en: 'Predictions based on automated machine learning inputs.' },

  // ── Dashboard Pipeline ──────────────────────────
  'pipeline.title':             { ar: 'مسار الصفقات الحية',        en: 'Pipeline Snapshot' },
  'pipeline.desc':              { ar: 'توزيع العملاء حسب مرحلة البيع', en: 'Lead distribution by sales stage' },
  'pipeline.live':              { ar: 'بيانات حية',              en: 'Live' },
  'pipeline.percent':           { ar: 'من الإجمالي',             en: 'of total' },
  'pipeline.empty':             { ar: 'لا توجد بيانات متاحة لعرض مسار الصفقات.', en: 'No pipeline data available.' },
  'pipeline.inquiry':           { ar: 'استفسار',    en: 'Inquiry' },
  'pipeline.tour':              { ar: 'جولة',       en: 'Tour' },
  'pipeline.offer':             { ar: 'عرض',        en: 'Offer' },
  'pipeline.close':             { ar: 'إغلاق',      en: 'Close' },

  // ── Dashboard Tasks ─────────────────────────────
  'tasks.title':                { ar: 'مهام اليوم العاجلة',        en: "Today's Urgent Tasks" },
  'tasks.count':                { ar: 'مستحقة اليوم',            en: 'due today' },
  'tasks.singular':             { ar: 'مهمة',                  en: 'task' },
  'tasks.plural':               { ar: 'مهام',                  en: 'tasks' },
  'tasks.priority.high':        { ar: 'عالية',    en: 'High' },
  'tasks.priority.medium':      { ar: 'متوسطة',   en: 'Medium' },
  'tasks.priority.low':         { ar: 'منخفضة',   en: 'Low' },
  'tasks.empty':                { ar: 'لا توجد مهام مستحقة اليوم',  en: 'No tasks due today' },
  'tasks.empty.sub':            { ar: 'جميع المهام منجزة في وقتها', en: 'All tasks are on schedule' },

  // ── Dashboard Recent Requests ───────────────────
  'requests.title':             { ar: 'أحدث الطلبات الاستثمارية',   en: 'Recent Requests' },
  'requests.desc':              { ar: 'آخر العملاء المسجلين في النظام', en: 'Latest leads registered' },
  'requests.empty':             { ar: 'لا توجد طلبات حديثة',        en: 'No recent requests' },

  // ── Status Labels ───────────────────────────────
  'status.new':                 { ar: 'جديد',     en: 'New' },
  'status.active':              { ar: 'نشط',      en: 'Active' },
  'status.pending':             { ar: 'معلق',     en: 'Pending' },
  'status.completed':           { ar: 'مكتمل',    en: 'Completed' },
  'status.expired':             { ar: 'منتهي',    en: 'Expired' },

  // ── Tab Names (Header breadcrumbs) ──────────────
  'tab.analytics':              { ar: 'لوحة التحكم',           en: 'Dashboard' },
  'tab.leads':                  { ar: 'العملاء المحتملين',      en: 'Leads' },
  'tab.projects':               { ar: 'المشاريع العقارية',      en: 'Projects' },
  'tab.rental':                 { ar: 'العقود والمدفوعات',      en: 'Contracts & Payments' },
  'tab.calculator':             { ar: 'حاسبة التمويل السكني',   en: 'Mortgage Calculator' },
  'tab.sales':                  { ar: 'أداء المبيعات',          en: 'Sales Performance' },
  'tab.marketing':              { ar: 'الإعلان والتسويق',       en: 'Advertising & Marketing' },
  'tab.agents':                 { ar: 'الوكلاء الذكيون',        en: 'AI Agents' },
  'tab.tasks':                  { ar: 'المهام والتذكيرات',      en: 'Tasks & Reminders' },
  'tab.helpdesk':               { ar: 'مركز الدعم',             en: 'Support Center' },
  'tab.whatsapp':               { ar: 'واتساب',                en: 'WhatsApp' },
  'tab.settings':               { ar: 'الإعدادات',             en: 'Settings' },
  'tab.offers':                 { ar: 'العروض العقارية',        en: 'Offers' },
  'tab.tours':                  { ar: 'الجولات العقارية',       en: 'Property Tours' },
  'tab.documents':              { ar: 'مستودع المستندات',       en: 'Documents' },
  'tab.email':                  { ar: 'البريد الإلكتروني',      en: 'Email' },

  // ── Common ──────────────────────────────────────
  'common.theme':               { ar: 'السمة',       en: 'Theme' },
  'common.language':            { ar: 'اللغة',       en: 'Language' },
  'common.profile':             { ar: 'الملف الشخصي', en: 'Profile' },
};

// ── Translation Function ──────────────────────────
export function t(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key; // fallback: return key itself
  return lang === 'AR' ? entry.ar : entry.en;
}
