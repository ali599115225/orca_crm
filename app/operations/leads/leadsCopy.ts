// app/operations/leads/leadsCopy.ts
// Bilingual copy for the Leads list + detail pages. Extends the central
// `Copy` contract (components/leads/types) without modifying it, so the
// shared dialogs/panels keep working unchanged.
import type { Copy } from "@/components/leads/types";
import type { LeadActionErrorCode } from "@/lib/leads/model";

export interface LeadsExtraCopy {
  addLead: string;
  statusFilter: string;
  allStatuses: string;
  sortLabel: string;
  sortNewest: string;
  sortOldest: string;
  sortScore: string;
  sortName: string;
  showArchived: string;
  archivedBadge: string;
  retry: string;
  loadError: string;
  resultsCount: string;
  createdAtLabel: string;
  formTitleCreate: string;
  formTitleEdit: string;
  firstNameLabel: string;
  lastNameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  projectLabel: string;
  noProject: string;
  assigneeLabel: string;
  unassigned: string;
  sourceLabel: string;
  save: string;
  saving: string;
  leadCreated: string;
  leadUpdated: string;
  restoreAndOpen: string;
  back: string;
  overviewTab: string;
  communicationTab: string;
  historyTab: string;
  changeStatus: string;
  assignAction: string;
  editAction: string;
  archiveAction: string;
  restoreAction: string;
  archiveReasonLabel: string;
  archiveReasonPlaceholder: string;
  archiveConfirm: string;
  archivedInfo: string;
  archivedBy: string;
  archiveReasonShown: string;
  statusUpdated: string;
  assignUpdated: string;
  leadArchivedMsg: string;
  leadRestoredMsg: string;
  sendEmail: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  send: string;
  sending: string;
  emailSent: string;
  noEmails: string;
  noActivities: string;
  noHistory: string;
  emailDirectionOut: string;
  emailDirectionIn: string;
  taskDue: string;
  taskAssignee: string;
  projectInfo: string;
  advisorInfo: string;
  advisorEmail: string;
  contactInfo: string;
  registrationDate: string;
  lastContact: string;
  scoreLabel: string;
  activityBy: string;
  detailLoadFailed: string;
}

export type LeadsCopy = Copy & LeadsExtraCopy;

export const leadsCopy: Record<"ar" | "en", LeadsCopy> = {
  ar: {
    breadcrumb: "العمليات / العملاء المحتملين",
    title: "إدارة العملاء المحتملين",
    subtitle: "قائمة العملاء المحتملين: ابحث ورشّح وافتح أي عميل لعرض صفحته الكاملة.",
    totalLeads: "إجمالي العملاء",
    newLeads: "عملاء جدد",
    qualified: "عملاء مؤهلون",
    conversion: "معدل التحويل",
    leadRegistry: "سجل العملاء المحتملين",
    thisWeek: "الحالة: جديد",
    readyFollowUp: "جاهزون للمتابعة",
    closedRate: "نسبة الصفقات المكتملة",
    searchPlaceholder: "ابحث بالاسم أو الجوال أو المدينة أو المصدر",
    leadsList: "قائمة العملاء",
    lead: "العميل",
    status: "الحالة",
    source: "المصدر",
    owner: "المسؤول",
    score: "الدرجة",
    page: "صفحة",
    of: "من",
    previous: "السابق",
    next: "التالي",
    loading: "جاري تحميل العملاء المحتملين...",
    noLeads: "لا يوجد عملاء محتملون بعد",
    selectLead: "افتح عميلاً من القائمة لعرض التفاصيل",
    city: "المدينة",
    notSpecified: "غير محدد",
    summary: "الملخص",
    contacts: "جهات الاتصال",
    tasks: "المهام",
    tours: "الجولات",
    offers: "العروض",
    opportunities: "الفرص",
    pipeline: "مسار الصفقات",
    leadInfo: "بيانات العميل",
    currentStatus: "الحالة الحالية",
    lastActivity: "آخر نشاط",
    assignedTo: "المسؤول",
    stage: "الحالة",
    noContacts: "لا توجد جهات اتصال مرتبطة بهذا العميل",
    noTasks: "لا توجد مهام مرتبطة بهذا العميل",
    noTours: "لا توجد جولات مجدولة لهذا العميل",
    noOffers: "لا توجد عروض مرتبطة بهذا العميل",
    noOpportunities: "لا توجد فرص مرتبطة بهذا العميل",
    leadsUnit: "عميل",
    createOpportunity: "إنشاء فرصة",
    opportunityListTitle: "فرص العميل",
    opportunityLead: "العميل",
    opportunityValue: "قيمة الصفقة",
    opportunityProbability: "الاحتمالية",
    opportunityCloseDate: "تاريخ الإغلاق المتوقع",
    opportunityStatus: "الحالة",
    opportunityUnit: "الوحدة",
    opportunityUnitPlaceholder: "اختر الوحدة",
    opportunityNoUnit: "بدون وحدة",
    unitsLoading: "جاري تحميل الوحدات...",
    noAvailableUnits: "لا توجد وحدات متاحة",
    unitsLoadFailed: "تعذر تحميل الوحدات",
    opportunitiesLoading: "جاري تحميل الفرص...",
    saveOpportunity: "حفظ الفرصة",
    savingOpportunity: "جاري الحفظ...",
    cancel: "إلغاء",
    valueRequired: "قيمة الصفقة مطلوبة",
    invalidValue: "أدخل قيمة صفقة صحيحة",
    invalidProbability: "أدخل احتمالية بين 1 و100",
    invalidDate: "أدخل التاريخ بصيغة يوم-شهر-سنة",
    unitRequired: "الوحدة مطلوبة",
    opportunityCreateFailed: "فشل إنشاء الفرصة",
    offerListTitle: "عروض العميل",
    createOffer: "إنشاء عرض",
    offerOpportunity: "الفرصة",
    offerPrice: "سعر العرض",
    offerValidUntil: "تاريخ الصلاحية",
    offerUnitReadonly: "الوحدة من الفرصة",
    offerNoOpportunity: "لا توجد فرصة بوحدة صالحة لإنشاء عرض",
    offerOpportunityRequired: "اختر فرصة مرتبطة بوحدة",
    offerCreateFailed: "فشل إنشاء العرض",
    saveOffer: "حفظ العرض",
    savingOffer: "جاري حفظ العرض...",
    acceptOffer: "قبول العرض",
    acceptingOffer: "جاري القبول...",
    offerAccepted: "تم قبول العرض",
    legacyOfferBlocked: "هذا العرض بلا وحدة، وتم حجبه بأمان",
    tourListTitle: "جولات العميل",
    scheduleTour: "حجز جولة",
    tourOffer: "العرض",
    tourDate: "تاريخ الجولة",
    tourTime: "وقت الجولة",
    tourLocation: "موقع الجولة",
    tourCreateFailed: "فشل حجز الجولة",
    saveTour: "حفظ الجولة",
    savingTour: "جاري الحفظ...",
    noOfferTours: "لا توجد جولات مرتبطة بهذا العميل",
    offersLoading: "جاري تحميل العروض...",
    toursLoading: "جاري تحميل الجولات...",
    // Extra copy
    addLead: "عميل جديد",
    statusFilter: "تصفية بالحالة",
    allStatuses: "كل الحالات",
    sortLabel: "الترتيب",
    sortNewest: "الأحدث أولاً",
    sortOldest: "الأقدم أولاً",
    sortScore: "الأعلى تقييماً",
    sortName: "الاسم (أ-ي)",
    showArchived: "عرض المؤرشفين",
    archivedBadge: "مؤرشف",
    retry: "إعادة المحاولة",
    loadError: "تعذر تحميل البيانات، حاول مرة أخرى.",
    resultsCount: "نتيجة",
    createdAtLabel: "تاريخ الإنشاء",
    formTitleCreate: "تسجيل عميل محتمل جديد",
    formTitleEdit: "تعديل بيانات العميل",
    firstNameLabel: "الاسم الأول",
    lastNameLabel: "اسم العائلة",
    phoneLabel: "رقم الجوال",
    emailLabel: "البريد الإلكتروني",
    projectLabel: "المشروع",
    noProject: "بدون مشروع",
    assigneeLabel: "إسناد إلى",
    unassigned: "غير مسند",
    sourceLabel: "المصدر",
    save: "حفظ",
    saving: "جاري الحفظ...",
    leadCreated: "تم تسجيل العميل بنجاح",
    leadUpdated: "تم تحديث بيانات العميل",
    restoreAndOpen: "استعادة العميل وفتح صفحته",
    back: "العودة للعملاء",
    overviewTab: "نظرة عامة",
    communicationTab: "التواصل والنشاط",
    historyTab: "السجل",
    changeStatus: "تغيير الحالة",
    assignAction: "الإسناد",
    editAction: "تعديل",
    archiveAction: "أرشفة",
    restoreAction: "استعادة",
    archiveReasonLabel: "سبب الأرشفة",
    archiveReasonPlaceholder: "اذكر سبب الأرشفة (إلزامي)",
    archiveConfirm: "تأكيد الأرشفة",
    archivedInfo: "هذا العميل مؤرشف",
    archivedBy: "أرشفه",
    archiveReasonShown: "السبب",
    statusUpdated: "تم تحديث الحالة",
    assignUpdated: "تم تحديث الإسناد",
    leadArchivedMsg: "تمت أرشفة العميل",
    leadRestoredMsg: "تمت استعادة العميل",
    sendEmail: "إرسال بريد",
    emailTo: "إلى",
    emailSubject: "الموضوع",
    emailBody: "محتوى البريد",
    send: "إرسال",
    sending: "جاري الإرسال...",
    emailSent: "تم إرسال البريد بنجاح",
    noEmails: "لا توجد رسائل بريد مسجلة لهذا العميل",
    noActivities: "لا توجد أنشطة مسجلة لهذا العميل",
    noHistory: "لا توجد أحداث مسجلة لهذا العميل",
    emailDirectionOut: "صادر",
    emailDirectionIn: "وارد",
    taskDue: "الاستحقاق",
    taskAssignee: "المكلف",
    projectInfo: "المشروع",
    advisorInfo: "المستشار",
    advisorEmail: "بريد المستشار",
    contactInfo: "بيانات التواصل",
    registrationDate: "تاريخ التسجيل",
    lastContact: "آخر تواصل",
    scoreLabel: "التقييم",
    activityBy: "بواسطة",
    detailLoadFailed: "تعذر تحميل بيانات العميل",
  },
  en: {
    breadcrumb: "Operations / Leads",
    title: "Leads Management",
    subtitle: "Leads list: search, filter, and open any lead to view its full page.",
    totalLeads: "Total Leads",
    newLeads: "New Leads",
    qualified: "Qualified",
    conversion: "Conversion",
    leadRegistry: "Lead registry",
    thisWeek: "Status: New",
    readyFollowUp: "Ready to follow up",
    closedRate: "Won deal rate",
    searchPlaceholder: "Search by name, phone, city, or source",
    leadsList: "Leads List",
    lead: "Lead",
    status: "Status",
    source: "Source",
    owner: "Owner",
    score: "Score",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    loading: "Loading leads...",
    noLeads: "No leads yet",
    selectLead: "Open a lead from the list to view details",
    city: "City",
    notSpecified: "Not specified",
    summary: "Summary",
    contacts: "Contacts",
    tasks: "Tasks",
    tours: "Tours",
    offers: "Offers",
    opportunities: "Opportunities",
    pipeline: "Pipeline",
    leadInfo: "Lead Info",
    currentStatus: "Current Status",
    lastActivity: "Last Activity",
    assignedTo: "Assigned To",
    stage: "Status",
    noContacts: "No contacts linked to this lead",
    noTasks: "No tasks linked to this lead",
    noTours: "No tours scheduled for this lead",
    noOffers: "No offers linked to this lead",
    noOpportunities: "No opportunities linked to this lead",
    leadsUnit: "leads",
    createOpportunity: "Create opportunity",
    opportunityListTitle: "Lead opportunities",
    opportunityLead: "Lead",
    opportunityValue: "Deal value",
    opportunityProbability: "Probability",
    opportunityCloseDate: "Expected close date",
    opportunityStatus: "Status",
    opportunityUnit: "Unit",
    opportunityUnitPlaceholder: "Select unit",
    opportunityNoUnit: "No unit",
    unitsLoading: "Loading units...",
    noAvailableUnits: "No available units",
    unitsLoadFailed: "Failed to load units",
    opportunitiesLoading: "Loading opportunities...",
    saveOpportunity: "Save opportunity",
    savingOpportunity: "Saving...",
    cancel: "Cancel",
    valueRequired: "Deal value is required",
    invalidValue: "Enter a valid deal value",
    invalidProbability: "Enter a probability between 1 and 100",
    invalidDate: "Enter the date as day-month-year",
    unitRequired: "Unit is required",
    opportunityCreateFailed: "Failed to create opportunity",
    offerListTitle: "Lead offers",
    createOffer: "Create offer",
    offerOpportunity: "Opportunity",
    offerPrice: "Offer price",
    offerValidUntil: "Valid until",
    offerUnitReadonly: "Unit from opportunity",
    offerNoOpportunity: "No opportunity with a valid unit is available for an offer",
    offerOpportunityRequired: "Select an opportunity linked to a unit",
    offerCreateFailed: "Failed to create offer",
    saveOffer: "Save offer",
    savingOffer: "Saving offer...",
    acceptOffer: "Accept offer",
    acceptingOffer: "Accepting...",
    offerAccepted: "Offer accepted",
    legacyOfferBlocked: "This offer has no unit and is safely blocked",
    tourListTitle: "Lead tours",
    scheduleTour: "Schedule tour",
    tourOffer: "Offer",
    tourDate: "Tour date",
    tourTime: "Tour time",
    tourLocation: "Tour location",
    tourCreateFailed: "Failed to schedule tour",
    saveTour: "Save tour",
    savingTour: "Saving...",
    noOfferTours: "No tours linked to this lead",
    offersLoading: "Loading offers...",
    toursLoading: "Loading tours...",
    // Extra copy
    addLead: "New lead",
    statusFilter: "Filter by status",
    allStatuses: "All statuses",
    sortLabel: "Sort",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortScore: "Highest score",
    sortName: "Name (A-Z)",
    showArchived: "Show archived",
    archivedBadge: "Archived",
    retry: "Retry",
    loadError: "Failed to load data, please try again.",
    resultsCount: "results",
    createdAtLabel: "Created",
    formTitleCreate: "Register a new lead",
    formTitleEdit: "Edit lead details",
    firstNameLabel: "First name",
    lastNameLabel: "Last name",
    phoneLabel: "Phone number",
    emailLabel: "Email",
    projectLabel: "Project",
    noProject: "No project",
    assigneeLabel: "Assign to",
    unassigned: "Unassigned",
    sourceLabel: "Source",
    save: "Save",
    saving: "Saving...",
    leadCreated: "Lead registered successfully",
    leadUpdated: "Lead details updated",
    restoreAndOpen: "Restore lead and open its page",
    back: "Back to leads",
    overviewTab: "Overview",
    communicationTab: "Communication & Activity",
    historyTab: "History",
    changeStatus: "Change status",
    assignAction: "Assignment",
    editAction: "Edit",
    archiveAction: "Archive",
    restoreAction: "Restore",
    archiveReasonLabel: "Archive reason",
    archiveReasonPlaceholder: "State the archive reason (required)",
    archiveConfirm: "Confirm archive",
    archivedInfo: "This lead is archived",
    archivedBy: "Archived by",
    archiveReasonShown: "Reason",
    statusUpdated: "Status updated",
    assignUpdated: "Assignment updated",
    leadArchivedMsg: "Lead archived",
    leadRestoredMsg: "Lead restored",
    sendEmail: "Send email",
    emailTo: "To",
    emailSubject: "Subject",
    emailBody: "Email body",
    send: "Send",
    sending: "Sending...",
    emailSent: "Email sent successfully",
    noEmails: "No email messages recorded for this lead",
    noActivities: "No activities recorded for this lead",
    noHistory: "No recorded events for this lead",
    emailDirectionOut: "Outbound",
    emailDirectionIn: "Inbound",
    taskDue: "Due",
    taskAssignee: "Assignee",
    projectInfo: "Project",
    advisorInfo: "Advisor",
    advisorEmail: "Advisor email",
    contactInfo: "Contact info",
    registrationDate: "Registered",
    lastContact: "Last contact",
    scoreLabel: "Score",
    activityBy: "by",
    detailLoadFailed: "Failed to load lead data",
  },
};

/** Localized labels for lead audit-history actions — never raw enums. */
export function leadHistoryActionLabel(action: string, lang: "ar" | "en"): string {
  const map: Record<string, { ar: string; en: string }> = {
    LEAD_CREATED: { ar: "تسجيل العميل", en: "Lead created" },
    CREATE_LEAD: { ar: "تسجيل العميل", en: "Lead created" },
    LEAD_UPDATED: { ar: "تعديل البيانات", en: "Details updated" },
    LEAD_STATUS_UPDATED: { ar: "تغيير الحالة", en: "Status changed" },
    LEAD_STATUS_CHANGED: { ar: "تغيير الحالة", en: "Status changed" },
    MOVE_LEAD: { ar: "تغيير الحالة", en: "Status changed" },
    LEAD_ASSIGNED: { ar: "تحديث الإسناد", en: "Assignment updated" },
    LEAD_ARCHIVED: { ar: "أرشفة العميل", en: "Lead archived" },
    LEAD_RESTORED: { ar: "استعادة العميل", en: "Lead restored" },
    LEAD_DETAIL_READ: { ar: "اطلاع على الملف", en: "Profile viewed" },
  };
  const entry = map[action];
  if (entry) return entry[lang];
  return lang === "ar" ? "حدث على السجل" : "Record event";
}

/** Localized labels for task statuses — never raw enums. */
export function taskStatusLabel(status: string, lang: "ar" | "en"): string {
  const map: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: "معلقة", en: "Pending" },
    COMPLETED: { ar: "مكتملة", en: "Completed" },
    OVERDUE: { ar: "متأخرة", en: "Overdue" },
  };
  const entry = map[status];
  if (entry) return entry[lang];
  return lang === "ar" ? "غير محدد" : "Not specified";
}

/** Localized labels for common activity types with a safe generic fallback. */
export function activityTypeLabel(type: string, lang: "ar" | "en"): string {
  const map: Record<string, { ar: string; en: string }> = {
    CALL: { ar: "مكالمة", en: "Call" },
    EMAIL: { ar: "بريد إلكتروني", en: "Email" },
    WHATSAPP: { ar: "واتساب", en: "WhatsApp" },
    SMS: { ar: "رسالة نصية", en: "SMS" },
    NOTE: { ar: "ملاحظة", en: "Note" },
    MEETING: { ar: "اجتماع", en: "Meeting" },
    VISIT: { ar: "زيارة", en: "Visit" },
    STATUS_CHANGE: { ar: "تغيير حالة", en: "Status change" },
  };
  const entry = map[String(type || "").toUpperCase()];
  if (entry) return entry[lang];
  return lang === "ar" ? "نشاط" : "Activity";
}

/**
 * Localize a service failure for display. Raw server text or enum-like
 * codes are never shown directly to the user.
 */
export function localizeLeadError(
  result: { error?: string; code?: LeadActionErrorCode } | null | undefined,
  lang: "ar" | "en",
): string {
  const code = result?.code;
  const ar: Record<string, string> = {
    UNAUTHORIZED: "يجب تسجيل الدخول أولاً.",
    FORBIDDEN: "لا تملك صلاحية تنفيذ هذه العملية.",
    NOT_FOUND: "العميل غير موجود أو لا يتبع هذه المنشأة.",
    VALIDATION: "تحقق من الحقول المدخلة.",
    DUPLICATE_ACTIVE: "هذا الرقم مسجل مسبقًا لعميل قائم.",
    DUPLICATE_ARCHIVED: "هذا الرقم يعود لعميل مؤرشف — يمكن استعادته.",
    PLAN_LIMIT: "وصلت لحد الباقة الحالية لعدد العملاء.",
    INTERNAL: "تعذر تنفيذ العملية، حاول مرة أخرى.",
  };
  const en: Record<string, string> = {
    UNAUTHORIZED: "Please sign in first.",
    FORBIDDEN: "You do not have permission to perform this action.",
    NOT_FOUND: "The lead was not found in this organization.",
    VALIDATION: "Please review the entered fields.",
    DUPLICATE_ACTIVE: "This phone number already belongs to an existing lead.",
    DUPLICATE_ARCHIVED: "This phone number belongs to an archived lead — it can be restored.",
    PLAN_LIMIT: "You reached the current plan limit for leads.",
    INTERNAL: "The operation could not be completed, please try again.",
  };

  const table = lang === "ar" ? ar : en;
  if (code && table[code]) {
    // Arabic server messages for validation/duplicates carry helpful,
    // human-written context (e.g. the existing lead's name) — prefer them
    // when they exist and are not raw code-prefixed strings.
    if (
      lang === "ar" &&
      result?.error &&
      !/^[A-Z_]+:/.test(result.error) &&
      (code === "VALIDATION" || code === "DUPLICATE_ACTIVE" || code === "DUPLICATE_ARCHIVED" || code === "PLAN_LIMIT")
    ) {
      return result.error;
    }
    return table[code];
  }
  return table.INTERNAL;
}
