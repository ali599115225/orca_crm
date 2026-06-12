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

  // ── Search ───────────────────────────────────────
  'search.noResults':           { ar: 'لا توجد نتائج مطابقة', en: 'No matching results' },

  // ── Preview / AI Section Labels ──────────────────
  'dash.previewLabel':          { ar: 'معاينة محدودة',          en: 'Limited Preview' },
  'dash.previewDesc':           { ar: 'هذه الميزة قيد التطوير وقد لا تعكس الحالة النهائية للمنتج.', en: 'This feature is under development and may not reflect the final product state.' },

  // ── Leads Page ────────────────────────────────────
  'leads.pageTitle':            { ar: 'مركز العملاء المحتملين',     en: 'Leads Operating Hub' },
  'leads.pageDesc':             { ar: 'إدارة العملاء من الاستفسار حتى الإغلاق وربطهم بالمهام والجولات والعروض.', en: 'Manage leads from inquiry to close with tasks, tours, offers, and follow-ups.' },
  'leads.addLead':              { ar: 'إضافة عميل محتمل',          en: 'Add Lead' },
  'leads.import':               { ar: 'استيراد',                 en: 'Import' },
  'leads.importPending':         { ar: 'يحتاج تفعيل لاحق',         en: 'requires activation' },
  'leads.totalLeads':           { ar: 'إجمالي العملاء',           en: 'Total Leads' },
  'leads.dueToday':             { ar: 'متابعة اليوم',            en: 'Due Today' },
  'leads.highProbability':      { ar: 'احتمالية عالية',          en: 'High Probability' },
  'leads.activeLeads':          { ar: 'عملاء نشطون',             en: 'Active Leads' },
  'leads.clearFilters':         { ar: 'مسح الفلاتر',             en: 'Clear Filters' },
  'leads.viewPipeline':         { ar: 'المسار',                 en: 'Pipeline' },
  'leads.viewList':             { ar: 'قائمة',                  en: 'List' },
  'leads.viewBoard':            { ar: 'لوحة',                   en: 'Board' },
  'leads.selectLeadHint':       { ar: 'اختر عميلاً لعرض التفاصيل والإجراءات', en: 'Select a lead to view details and actions' },
  'leads.viewDetails':          { ar: 'عرض التفاصيل الكاملة',   en: 'View Full Details' },
  'leads.filterOwner':          { ar: 'المسؤول',                 en: 'Owner' },
  'leads.filterSource':         { ar: 'المصدر',                  en: 'Source' },
  'leads.filterStage':          { ar: 'المرحلة',                 en: 'Stage' },
  'leads.filterProject':        { ar: 'المشروع',                 en: 'Project' },
  'leads.filterTemperature':    { ar: 'درجة الاحتمالية',          en: 'Score' },
  'leads.filterOverdue':        { ar: 'المتأخرين فقط',           en: 'Overdue Only' },
  'leads.searchInLeads':        { ar: 'ابحث في العملاء...',       en: 'Search leads...' },
  'leads.resultsCount':         { ar: 'نتيجة',                  en: 'result' },
  'leads.resultsCount.plural':  { ar: 'نتائج',                  en: 'results' },

  // ── Lead Detail Fields ────────────────────────────
  'lead.name':                  { ar: 'الاسم',       en: 'Name' },
  'lead.phone':                 { ar: 'الجوال',      en: 'Phone' },
  'lead.email':                 { ar: 'البريد الإلكتروني', en: 'Email' },
  'lead.source':                { ar: 'المصدر',      en: 'Source' },
  'lead.stage':                 { ar: 'المرحلة',     en: 'Stage' },
  'lead.score':                 { ar: 'الاحتمالية',  en: 'Score' },
  'lead.lastContact':           { ar: 'آخر تواصل',    en: 'Last Contact' },
  'lead.nextFollowUp':          { ar: 'المتابعة القادمة', en: 'Next Follow-up' },
  'lead.assignedTo':            { ar: 'المسؤول',     en: 'Assigned To' },
  'lead.project':               { ar: 'المشروع المهتم به', en: 'Interested Project' },
  'lead.city':                  { ar: 'المدينة',     en: 'City' },
  'lead.createdAt':             { ar: 'تاريخ التسجيل', en: 'Registered' },

  // ── Lead Actions ──────────────────────────────────
  'action.call':                { ar: 'اتصال',       en: 'Call' },
  'action.whatsapp':            { ar: 'واتساب',      en: 'WhatsApp' },
  'action.email':               { ar: 'إيميل',       en: 'Email' },
  'action.task':                { ar: 'مهمة',        en: 'Task' },
  'action.tour':                { ar: 'جولة',        en: 'Tour' },
  'action.offer':               { ar: 'عرض',         en: 'Offer' },
  'action.opportunity':         { ar: 'فرصة',        en: 'Opportunity' },
  'action.contract':            { ar: 'عقد',         en: 'Contract' },
  'action.noPhone':              { ar: 'لا يوجد رقم جوال', en: 'No phone number' },
  'action.noEmail':              { ar: 'لا يوجد بريد إلكتروني', en: 'No email address' },
  'action.whatsappPending':      { ar: 'قيد التفعيل', en: 'Activation pending' },
  'action.contractPending':      { ar: 'يحتاج ربط عقد', en: 'Contract requires setup' },

  // ── Pipeline Stages (Leads) ───────────────────────
  'leads.stage.inquiry':        { ar: 'استفسار',     en: 'Inquiry' },
  'leads.stage.firstContact':   { ar: 'تواصل أولي',   en: 'First Contact' },
  'leads.stage.tour':           { ar: 'جولة',        en: 'Tour' },
  'leads.stage.offer':          { ar: 'عرض',         en: 'Offer' },
  'leads.stage.negotiation':    { ar: 'تفاوض',       en: 'Negotiation' },
  'leads.stage.closed':         { ar: 'إغلاق',       en: 'Closed' },
  'leads.stage.lost':           { ar: 'مفقود',       en: 'Lost' },

  // ── Contacts Tab ──────────────────────────────────
  'contacts.title':             { ar: 'جهات اتصال',   en: 'Contacts' },
  'contacts.create':            { ar: 'إضافة جهة اتصال', en: 'Add Contact' },
  'contacts.noContacts':        { ar: 'لا توجد جهات اتصال', en: 'No contacts found' },

  // ── Opportunities Tab ─────────────────────────────
  'opps.title':                 { ar: 'الفرص',       en: 'Opportunities' },
  'opps.create':                { ar: 'إنشاء فرصة',   en: 'Create Opportunity' },
  'opps.noOpportunities':       { ar: 'لا توجد فرص',  en: 'No opportunities found' },

  // ── Tours Tab ─────────────────────────────────────
  'tours.title':                { ar: 'الجولات العقارية', en: 'Property Tours' },
  'tours.create':               { ar: 'جدولة جولة',   en: 'Schedule Tour' },
  'tours.noTours':              { ar: 'لا توجد جولات', en: 'No tours found' },

  // ── Offers Tab ────────────────────────────────────
  'offers.title':               { ar: 'العروض العقارية', en: 'Property Offers' },
  'offers.create':              { ar: 'إنشاء عرض',    en: 'Create Offer' },
  'offers.noOffers':            { ar: 'لا توجد عروض', en: 'No offers found' },

  // ── Tasks Tab ─────────────────────────────────────
  'tasksTab.title':             { ar: 'المهام والأنشطة', en: 'Tasks & Activities' },
  'tasksTab.noTasks':           { ar: 'لا توجد مهام', en: 'No tasks found' },

  // ── Insights Tab ──────────────────────────────────
  'insights.title':             { ar: 'الرؤى الذكية',  en: 'Smart Insights' },
  'insights.aiScore':           { ar: 'تقييم ذكي',    en: 'AI Score' },
  'insights.recommendation':    { ar: 'التوصية',      en: 'Recommendation' },
};

// ── Translation Function ──────────────────────────
export function t(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key; // fallback: return key itself
  return lang === 'AR' ? entry.ar : entry.en;
}
