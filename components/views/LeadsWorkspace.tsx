// components/views/LeadsWorkspace.tsx — ORCA Leads visual contract
"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/context/AppContext";
import type { LeadItem } from "./pipeline/KanbanCard";
import { displayPerson, displayGeo, displayEnum } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import { TimeField } from "@/components/ui/date-time/TimeField";
import { formatDisplayDate, formatDisplayTime } from '@/lib/display/dateTime';

const PAGE_SIZE = 5;

const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Tour Scheduled",
  "Offer Sent",
  "Negotiation",
  "Closed",
];

type Opportunity = {
  id: string;
  leadId: string;
  value: number;
  probability: number;
  closeDate: string;
  status: string;
  unitId: string | null;
};

type UnitOption = {
  id: string;
  unitNumber: string;
  priceSar: number;
  status: string;
  projectName: string;
};

type Offer = {
  id: string;
  linkedOpportunityId: string;
  unitId: string | null;
  price: number;
  validUntil: string;
  status: string;
  createdAt?: string | null;
};

type Tour = {
  id: string;
  leadId: string;
  opportunityId: string | null;
  unitId: string | null;
  startAt: string;
  endAt: string | null;
  location: string;
  status: string;
  auditLog?: string | null;
};

type OpportunityForm = {
  value: string;
  probability: string;
  closeDate: string;
  closeDateText: string;
  unitId: string;
};

type OpportunityFormErrors = Partial<Record<keyof OpportunityForm, string>> & {
  form?: string;
};

type OfferForm = {
  opportunityId: string;
  price: string;
  validUntil: string;
  validUntilText: string;
};

type TourForm = {
  offerId: string;
  startDate: string;
  startDateText: string;
  time: string;
  location: string;
};

type DetailTab =
  | "summary"
  | "contacts"
  | "tasks"
  | "tours"
  | "offers"
  | "opportunities"
  | "pipeline";

type Copy = {
  breadcrumb: string;
  title: string;
  subtitle: string;
  totalLeads: string;
  newLeads: string;
  qualified: string;
  conversion: string;
  leadRegistry: string;
  thisWeek: string;
  readyFollowUp: string;
  closedRate: string;
  searchPlaceholder: string;
  leadsList: string;
  lead: string;
  status: string;
  source: string;
  owner: string;
  score: string;
  page: string;
  of: string;
  previous: string;
  next: string;
  loading: string;
  noLeads: string;
  selectLead: string;
  city: string;
  notSpecified: string;
  summary: string;
  contacts: string;
  tasks: string;
  tours: string;
  offers: string;
  opportunities: string;
  pipeline: string;
  leadInfo: string;
  currentStatus: string;
  lastActivity: string;
  assignedTo: string;
  stage: string;
  noContacts: string;
  noTasks: string;
  noTours: string;
  noOffers: string;
  noOpportunities: string;
  leadsUnit: string;
  createOpportunity: string;
  opportunityListTitle: string;
  opportunityLead: string;
  opportunityValue: string;
  opportunityProbability: string;
  opportunityCloseDate: string;
  opportunityStatus: string;
  opportunityUnit: string;
  opportunityUnitPlaceholder: string;
  opportunityNoUnit: string;
  unitsLoading: string;
  noAvailableUnits: string;
  unitsLoadFailed: string;
  opportunitiesLoading: string;
  saveOpportunity: string;
  savingOpportunity: string;
  cancel: string;
  valueRequired: string;
  invalidValue: string;
  invalidProbability: string;
  invalidDate: string;
  unitRequired: string;
  opportunityCreateFailed: string;
  offerListTitle: string;
  createOffer: string;
  offerOpportunity: string;
  offerPrice: string;
  offerValidUntil: string;
  offerUnitReadonly: string;
  offerNoOpportunity: string;
  offerOpportunityRequired: string;
  offerCreateFailed: string;
  saveOffer: string;
  savingOffer: string;
  acceptOffer: string;
  acceptingOffer: string;
  offerAccepted: string;
  legacyOfferBlocked: string;
  tourListTitle: string;
  scheduleTour: string;
  tourOffer: string;
  tourDate: string;
  tourTime: string;
  tourLocation: string;
  tourCreateFailed: string;
  saveTour: string;
  savingTour: string;
  noOfferTours: string;
  offersLoading: string;
  toursLoading: string;
};

const copy: Record<"ar" | "en", Copy> = {
  ar: {
    breadcrumb: "العمليات / العملاء المحتملين",
    title: "إدارة العملاء المحتملين",
    subtitle: "مركز تشغيل العملاء المحتملين: اختر عميلاً من القائمة لعرض التفاصيل والمتابعة.",
    totalLeads: "إجمالي العملاء",
    newLeads: "عملاء جدد",
    qualified: "عملاء مؤهلون",
    conversion: "معدل التحويل",
    leadRegistry: "سجل العملاء المحتملين",
    thisWeek: "الأسبوع الحالي",
    readyFollowUp: "جاهزون للمتابعة",
    closedRate: "نسبة الصفقات المغلقة",
    searchPlaceholder: "ابحث باسم العميل أو المدينة أو المصدر أو المسؤول",
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
    noLeads: "لا يوجد عملاء محتملون مطابقون للبحث الحالي.",
    selectLead: "اختر عميلاً من القائمة لعرض التفاصيل هنا",
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
    stage: "المرحلة",
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
    noOfferTours: "لا توجد جولات مرتبطة بعروض هذا العميل",
    offersLoading: "جاري تحميل العروض...",
    toursLoading: "جاري تحميل الجولات...",
  },
  en: {
    breadcrumb: "Operations / Leads",
    title: "Leads Management",
    subtitle: "Lead operating workspace: select a lead from the list to view details and follow up.",
    totalLeads: "Total Leads",
    newLeads: "New Leads",
    qualified: "Qualified",
    conversion: "Conversion",
    leadRegistry: "Lead registry",
    thisWeek: "This week",
    readyFollowUp: "Ready to follow up",
    closedRate: "Closed deal rate",
    searchPlaceholder: "Search by lead name, city, source, or owner",
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
    noLeads: "No leads match the current search.",
    selectLead: "Select a lead from the list to view details here",
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
    stage: "Stage",
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
    noOfferTours: "No tours linked to this lead's offers",
    offersLoading: "Loading offers...",
    toursLoading: "Loading tours...",
  },
};

const detailTabs: Array<{ id: DetailTab; labelKey: keyof Copy }> = [
  { id: "summary", labelKey: "summary" },
  { id: "contacts", labelKey: "contacts" },
  { id: "tasks", labelKey: "tasks" },
  { id: "tours", labelKey: "tours" },
  { id: "offers", labelKey: "offers" },
  { id: "opportunities", labelKey: "opportunities" },
  { id: "pipeline", labelKey: "pipeline" },
];

function isTechnicalId(value?: string | null): boolean {
  if (!value) return false;

  const normalized = String(value).trim();

  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    normalized,
  );
}

function formatNumber(value: unknown, isArabic: boolean): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString(isArabic ? "ar-SA" : "en-US")
    : "0";
}

function formatPipelineCount(value: unknown): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue.toLocaleString("en-US") : "0";
}

function formatCurrency(value: unknown, isArabic: boolean): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue)
    ? `${numberValue.toLocaleString(isArabic ? "ar-SA" : "en-US")} ${isArabic ? "ر.س" : "SAR"}`
    : isArabic
      ? "0 ر.س"
      : "0 SAR";
}

function formatDate(value: string | null | undefined, isArabic: boolean, fallback: string): string {
  if (!value) return fallback;

  return formatDisplayDate(value) || fallback;
}

function normalizeDateFieldText(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join("-");
}

function parseDateFieldToIso(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return "";

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return iso;
}

function getStageLabel(stageId: string, displayLocale: DisplayLocale): string {
  return displayEnum(stageId, 'leadStatus', displayLocale);
}

function getStageCounts(leads: LeadItem[]) {
  const map: Record<string, number> = {};

  PIPELINE_STAGES.forEach((stage) => {
    map[stage] = leads.filter((lead) => lead.stage === stage).length;
  });

  return map;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{message}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs font-semibold text-red-500">{message}</p>;
}

function LeadStatusBadge({
  status,
  displayLocale,
}: {
  status?: string | null;
  displayLocale: DisplayLocale;
}) {
  const label = displayEnum(status, 'leadStatus', displayLocale);

  return (
    <span className="inline-flex min-h-[28px] min-w-[96px] items-center justify-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 text-xs font-semibold text-[var(--nc-text-primary)]">
      {label}
    </span>
  );
}

function PaginationBar({
  page,
  totalPages,
  labels,
  isArabic,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  labels: Copy;
  isArabic: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-sm text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        {labels.page} {formatNumber(page, isArabic)} {labels.of}{" "}
        {formatNumber(totalPages, isArabic)}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.previous}
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.next}
        </button>
      </div>
    </div>
  );
}

export default function LeadsWorkspace() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const displayLocale: DisplayLocale = isArabic ? 'ar' : 'en';
  const labels = isArabic ? copy.ar : copy.en;
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "text-right" : "text-left";

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [detailData, setDetailData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [leadPage, setLeadPage] = useState(1);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [toursLoading, setToursLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [opportunitySaving, setOpportunitySaving] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);
  const [tourSaving, setTourSaving] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [unitSelectOpen, setUnitSelectOpen] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>({
    value: "",
    probability: "50",
    closeDate: "",
    closeDateText: "",
    unitId: "",
  });
  const [opportunityErrors, setOpportunityErrors] = useState<OpportunityFormErrors>({});
  const [offerForm, setOfferForm] = useState<OfferForm>({
    opportunityId: "",
    price: "",
    validUntil: "",
    validUntilText: "",
  });
  const [offerErrors, setOfferErrors] = useState<Partial<Record<keyof OfferForm, string>> & { form?: string }>({});
  const [tourForm, setTourForm] = useState<TourForm>({
    offerId: "",
    startDate: "",
    startDateText: "",
    time: "10:00",
    location: "",
  });
  const [tourErrors, setTourErrors] = useState<Partial<Record<keyof TourForm, string>> & { form?: string }>({});

  const leadDisplayName = (lead: LeadItem): string =>
    displayPerson(`${lead.firstName || ''} ${lead.lastName || ''}`, displayLocale, { route: '/operations/leads', entityId: lead.id });

  const leadDisplayCity = (lead: LeadItem): string =>
    displayGeo(lead.city, 'city', displayLocale, { route: '/operations/leads' });

  const leadDisplaySource = (lead: LeadItem): string =>
    displayEnum(lead.source, 'leadSource', displayLocale);

  const leadDisplayStatus = (status?: string | null): string =>
    displayEnum(status, 'leadStatus', displayLocale);

  const leadDisplayOwner = (value?: string | null): string =>
    displayPerson(value, displayLocale, { route: '/operations/leads' });

  const leadInitials = (lead: LeadItem): string => {
    const dn = leadDisplayName(lead);
    const parts = dn.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  };

  const loadLeads = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/v1/leads");
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setLeads(json.data);
        if (!selectedLead && json.data.length > 0) {
          setSelectedLead(json.data[0]);
          setDetailData(json.data[0]);
        }
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      setOpportunitiesLoading(true);

      const opportunitiesRes = await fetch("/api/v1/opportunities");
      const opportunitiesJson = await opportunitiesRes.json();

      if (opportunitiesJson.success && Array.isArray(opportunitiesJson.data)) {
        setOpportunities(opportunitiesJson.data);
      } else {
        setOpportunities([]);
      }
    } catch {
      setOpportunities([]);
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      setOffersLoading(true);

      const res = await fetch("/api/v1/offers");
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setOffers(json.data);
      } else {
        setOffers([]);
      }
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const loadTours = async () => {
    try {
      setToursLoading(true);

      const res = await fetch("/api/v1/tours");
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setTours(json.data);
      } else {
        setTours([]);
      }
    } catch {
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      setUnitsLoading(true);
      setUnitsError(null);

      const unitsRes = await fetch("/api/properties");
      const unitsJson = await unitsRes.json();

      if (!unitsRes.ok || !unitsJson.success || !Array.isArray(unitsJson.data)) {
        throw new Error(unitsJson.error || labels.unitsLoadFailed);
      }

      setUnits(
        unitsJson.data.map((unit: any) => ({
          id: unit.id,
          unitNumber: unit.unitNumber || unit.sku || unit.id,
          priceSar: Number(unit.price ?? unit.priceSar ?? 0),
          status: unit.status || "",
          projectName:
            typeof unit.project === "string"
              ? unit.project
              : unit.project?.name || "",
        })),
      );
    } catch (error: any) {
      setUnits([]);
      setUnitsError(error?.message || labels.unitsLoadFailed);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  useEffect(() => {
    if (detailTab === "opportunities" && selectedLead) {
      void loadOpportunities();
      void loadUnits();
    }
    if (detailTab === "offers" && selectedLead) {
      void loadOpportunities();
      void loadOffers();
      void loadUnits();
    }
    if (detailTab === "tours" && selectedLead) {
      void loadOpportunities();
      void loadOffers();
      void loadTours();
      void loadUnits();
    }
  }, [detailTab, selectedLead?.id]);

  useEffect(() => {
    if (!showOpportunityModal && !showOfferModal && !showTourModal) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowOpportunityModal(false);
        setShowOfferModal(false);
        setShowTourModal(false);
        setUnitSelectOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOpportunityModal, showOfferModal, showTourModal]);

  const handleSelect = async (lead: LeadItem) => {
    setSelectedLead(lead);
    setDetailTab("summary");

    try {
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      const found = (json.data || []).find((item: any) => item.id === lead.id);

      setDetailData(found || lead);
    } catch {
      setDetailData(lead);
    }
  };

  const resetOpportunityForm = () => {
    setOpportunityForm({
      value: "",
      probability: "50",
      closeDate: "",
      closeDateText: "",
      unitId: "",
    });
    setOpportunityErrors({});
    setUnitSelectOpen(false);
  };

  const openOpportunityModal = () => {
    resetOpportunityForm();
    setShowOpportunityModal(true);
    void loadUnits();
  };

  const closeOpportunityModal = () => {
    if (opportunitySaving) return;

    setShowOpportunityModal(false);
    resetOpportunityForm();
  };

  const validateOpportunityForm = () => {
    const errors: OpportunityFormErrors = {};
    const valueNumber = Number(opportunityForm.value);
    const probabilityNumber = Number(opportunityForm.probability);

    if (!opportunityForm.value.trim()) {
      errors.value = labels.valueRequired;
    } else if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      errors.value = labels.invalidValue;
    }

    if (!Number.isFinite(probabilityNumber) || probabilityNumber < 1 || probabilityNumber > 100) {
      errors.probability = labels.invalidProbability;
    }

    if (opportunityForm.closeDateText && (!opportunityForm.closeDate || opportunityForm.closeDateText.length !== 10)) {
      errors.closeDate = labels.invalidDate;
    }

    if (!selectableUnits.some((unit) => unit.id === opportunityForm.unitId)) {
      errors.unitId = labels.unitRequired;
    }

    setOpportunityErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleCreateOpportunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedLead || !validateOpportunityForm()) return;

    try {
      setOpportunitySaving(true);
      setOpportunityErrors({});

      const res = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          value: opportunityForm.value,
          probability: opportunityForm.probability,
          closeDate: opportunityForm.closeDate,
          unitId: opportunityForm.unitId,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.opportunityCreateFailed);
      }

      setShowOpportunityModal(false);
      resetOpportunityForm();
      await Promise.all([loadOpportunities(), loadUnits()]);
    } catch (error: any) {
      setOpportunityErrors({
        form: error?.message || labels.opportunityCreateFailed,
      });
    } finally {
      setOpportunitySaving(false);
    }
  };

  const resetOfferForm = () => {
    setOfferForm({
      opportunityId: "",
      price: "",
      validUntil: "",
      validUntilText: "",
    });
    setOfferErrors({});
  };

  const resetTourForm = () => {
    setTourForm({
      offerId: "",
      startDate: "",
      startDateText: "",
      time: "10:00",
      location: "",
    });
    setTourErrors({});
  };

  const openOfferModal = () => {
    const firstOpportunity = selectedLeadOpportunities.find((opportunity) => opportunity.unitId);
    resetOfferForm();
    if (firstOpportunity) {
      setOfferForm({
        opportunityId: firstOpportunity.id,
        price: String(Number(firstOpportunity.value || 0)),
        validUntil: "",
        validUntilText: "",
      });
    }
    setShowOfferModal(true);
    void Promise.all([loadOpportunities(), loadOffers(), loadUnits()]);
  };

  const openTourModal = (offer: Offer) => {
    resetTourForm();
    const unit = units.find((item) => item.id === offer.unitId);
    setTourForm({
      offerId: offer.id,
      startDate: "",
      startDateText: "",
      time: "10:00",
      location: unit
        ? `${unit.projectName ? `${unit.projectName} - ` : ""}${unit.unitNumber}`
        : "",
    });
    setShowTourModal(true);
  };

  const closeOfferModal = () => {
    if (offerSaving) return;
    setShowOfferModal(false);
    resetOfferForm();
  };

  const closeTourModal = () => {
    if (tourSaving) return;
    setShowTourModal(false);
    resetTourForm();
  };

  const handleCreateOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedOpportunity = selectedLeadOpportunities.find((opportunity) => opportunity.id === offerForm.opportunityId);
    const errors: Partial<Record<keyof OfferForm, string>> & { form?: string } = {};

    if (!selectedOpportunity?.unitId) errors.opportunityId = labels.offerOpportunityRequired;
    if (!offerForm.price || Number(offerForm.price) <= 0) errors.price = labels.invalidValue;
    if (offerForm.validUntilText && (!offerForm.validUntil || offerForm.validUntilText.length !== 10)) {
      errors.validUntil = labels.invalidDate;
    }

    setOfferErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedOpportunity) return;

    try {
      setOfferSaving(true);
      const res = await fetch(`/api/v1/opportunities/${selectedOpportunity.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: offerForm.price,
          validUntil: offerForm.validUntil,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.offerCreateFailed);
      }

      setShowOfferModal(false);
      resetOfferForm();
      await Promise.all([loadOffers(), loadOpportunities(), loadLeads()]);
    } catch (error: any) {
      setOfferErrors({ form: error?.message || labels.offerCreateFailed });
    } finally {
      setOfferSaving(false);
    }
  };

  const handleScheduleTour = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedOffer = offers.find((offer) => offer.id === tourForm.offerId);
    const errors: Partial<Record<keyof TourForm, string>> & { form?: string } = {};

    if (!selectedOffer?.unitId) errors.offerId = labels.legacyOfferBlocked;
    if (!tourForm.startDate || tourForm.startDateText.length !== 10) errors.startDate = labels.invalidDate;
    if (!tourForm.location.trim()) errors.location = labels.tourLocation;

    setTourErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedOffer) return;

    try {
      setTourSaving(true);
      
      const startAt = `${tourForm.startDate}T${tourForm.time || "10:00"}:00`;
      
      const res = await fetch("/api/v1/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          startAt,
          location: tourForm.location.trim(),
          attendees: 1,
          notes: labels.scheduleTour,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.tourCreateFailed);
      }

      setShowTourModal(false);
      resetTourForm();
      await Promise.all([loadTours(), loadOffers(), loadLeads()]);
    } catch (error: any) {
      setTourErrors({ form: error?.message || labels.tourCreateFailed });
    } finally {
      setTourSaving(false);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!offer.unitId || acceptingOfferId) return;

    try {
      setAcceptingOfferId(offer.id);
      const res = await fetch(`/api/v1/offers/${offer.id}/accept`, { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || labels.offerCreateFailed);
      }

      await Promise.all([loadOffers(), loadOpportunities(), loadTours(), loadLeads()]);
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return leads;

    return leads.filter((lead) => {
      return (
        leadDisplayName(lead).toLowerCase().includes(term) ||
        leadDisplayCity(lead).toLowerCase().includes(term) ||
        leadDisplaySource(lead).toLowerCase().includes(term) ||
        leadDisplayOwner(lead.assignedTo).toLowerCase().includes(term) ||
        leadDisplayStatus(lead.stage).toLowerCase().includes(term)
      );
    });
  }, [leads, searchTerm, isArabic]);

  const leadTotalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const pagedLeads = filteredLeads.slice((leadPage - 1) * PAGE_SIZE, leadPage * PAGE_SIZE);
  const stageCounts = getStageCounts(leads);
  const totalLeads = leads.length;
  const newLeads = stageCounts.New || 0;
  const qualified = stageCounts.Qualified || 0;
  const conversion = totalLeads > 0 ? Math.round(((stageCounts.Closed || 0) / totalLeads) * 100) : 0;
  const selectedLeadOpportunities = selectedLead
    ? opportunities.filter((opportunity) => opportunity.leadId === selectedLead.id)
    : [];
  const selectedLeadOpportunityIds = new Set(selectedLeadOpportunities.map((opportunity) => opportunity.id));
  const selectedLeadOffers = offers.filter((offer) => selectedLeadOpportunityIds.has(offer.linkedOpportunityId));
  const selectedLeadOfferIds = new Set(selectedLeadOffers.map((offer) => offer.id));
  const selectedLeadTours = tours.filter((tour) => {
    if (selectedLead && tour.leadId === selectedLead.id) return true;
    if (tour.opportunityId && selectedLeadOpportunityIds.has(tour.opportunityId)) return true;
    if (!tour.auditLog) return false;
    try {
      const parsed = JSON.parse(tour.auditLog);
      return parsed?.offerId ? selectedLeadOfferIds.has(parsed.offerId) : false;
    } catch {
      return false;
    }
  });
  const offerableOpportunities = selectedLeadOpportunities.filter((opportunity) => opportunity.unitId);
  const offerFormOpportunity = offerableOpportunities.find((opportunity) => opportunity.id === offerForm.opportunityId);
  const offerFormUnit = units.find((unit) => unit.id === offerFormOpportunity?.unitId);
  const selectableUnits = units.filter((unit) => unit.status.toLowerCase() !== "sold");
  const selectedUnit = selectableUnits.find((unit) => unit.id === opportunityForm.unitId);
  const hasValidSelectedUnit = selectableUnits.some((unit) => unit.id === opportunityForm.unitId);

  if (loading) {
    return (
      <section dir={direction} className="min-h-full px-4 pb-8 pt-8 lg:px-6">
        <div className="mx-auto flex min-h-[240px] w-full max-w-[1500px] items-center justify-center rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)]">
          <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loading}</p>
        </div>
      </section>
    );
  }

  return (
    <section dir={direction} className="min-h-full px-4 pb-8 pt-8 lg:px-6">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <div>
          <p className="text-xs text-[var(--nc-text-secondary)]">{labels.breadcrumb}</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--nc-text-primary)]">{labels.title}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{labels.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: labels.totalLeads, value: totalLeads, note: labels.leadRegistry },
            { label: labels.newLeads, value: newLeads, note: labels.thisWeek },
            { label: labels.qualified, value: qualified, note: labels.readyFollowUp },
            { label: labels.conversion, value: `${conversion}%`, note: labels.closedRate },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="flex min-h-[104px] flex-col justify-between rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm"
            >
              <span className="text-sm text-[var(--nc-text-secondary)]">{kpi.label}</span>
              <span className="text-2xl font-bold text-[var(--nc-text-primary)]">
                {typeof kpi.value === "number" ? formatNumber(kpi.value, isArabic) : kpi.value}
              </span>
              <span className="text-xs text-[var(--nc-text-secondary)]">{kpi.note}</span>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]">
          <div className="h-fit rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
            {selectedLead ? (
              <div className="space-y-3">
                <div className="border-b border-[var(--nc-border)] pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-xl font-bold text-[var(--nc-text-primary)]">
                      {leadInitials(selectedLead)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-[var(--nc-text-primary)]">
                        {leadDisplayName(selectedLead)}
                      </h2>
                      <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                        {leadDisplayCity(selectedLead)} · {leadDisplaySource(selectedLead)}
                      </p>
                    </div>

                    <LeadStatusBadge status={selectedLead.stage} displayLocale={displayLocale} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: labels.score,
                        value: selectedLead.leadScore ? `${selectedLead.leadScore}/100` : labels.notSpecified,
                      },
                      { label: labels.city, value: leadDisplayCity(selectedLead) },
                      { label: labels.source, value: leadDisplaySource(selectedLead) },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="min-h-[52px] rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3"
                      >
                        <p className="truncate text-xs text-[var(--nc-text-secondary)]">{stat.label}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-[var(--nc-text-primary)]">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detailTabs.map((tab) => {
                    const active = detailTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDetailTab(tab.id)}
                        className={
                          active
                            ? "nc-btn-primary min-h-[34px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                            : "nc-btn-ghost min-h-[34px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                        }
                      >
                        {labels[tab.labelKey]}
                      </button>
                    );
                  })}
                </div>

                {detailTab === "summary" && (
                  <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
                    {[
                      {
                        title: labels.leadInfo,
                        body: `${leadDisplayName(selectedLead)} · ${leadDisplayCity(selectedLead)} · ${leadDisplaySource(selectedLead)}`,
                      },
                      {
                        title: labels.currentStatus,
                        body: `${labels.stage}: ${leadDisplayStatus(selectedLead.stage)} · ${labels.score}: ${
                          selectedLead.leadScore || 0
                        }/100`,
                      },
                      {
                        title: labels.lastActivity,
                        body: (detailData as any)?.updatedAt
                          ? formatDisplayDate((detailData as any).updatedAt)
                          : labels.notSpecified,
                      },
                      {
                        title: labels.assignedTo,
                        body: leadDisplayOwner(selectedLead.assignedTo),
                      },
                    ].map((row, index, rows) => (
                      <div
                        key={row.title}
                        className={`grid min-h-[48px] grid-cols-[minmax(110px,0.34fr)_minmax(0,1fr)] items-center gap-3 py-2 ${
                          index < rows.length - 1 ? "border-b border-[var(--nc-border)]" : ""
                        }`}
                      >
                        <span className="text-xs font-bold text-[var(--nc-text-primary)]">{row.title}</span>
                        <span className="truncate text-xs leading-6 text-[var(--nc-text-secondary)]">{row.body}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === "contacts" && <EmptyState message={labels.noContacts} />}
                {detailTab === "tasks" && <EmptyState message={labels.noTasks} />}
                {detailTab === "tours" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
                      <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.tourListTitle}</h3>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
                    </div>
                    {toursLoading ? (
                      <EmptyState message={labels.toursLoading} />
                    ) : selectedLeadTours.length === 0 ? (
                      <EmptyState message={labels.noOfferTours} />
                    ) : (
                      <div className="space-y-2">
                        {selectedLeadTours.map((tour) => {
                          const unit = units.find((item) => item.id === tour.unitId);
                          return (
                            <div key={tour.id} className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">{tour.location}</p>
                                  <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                                    {unit ? `${unit.projectName ? `${unit.projectName} · ` : ""}${unit.unitNumber}` : labels.opportunityNoUnit}
                                  </p>
                                </div>
                                <div className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                                  {formatDate(tour.startAt, isArabic, labels.notSpecified)} · {formatDisplayTime(tour.startAt)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {detailTab === "offers" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.offerListTitle}</h3>
                        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={openOfferModal}
                        disabled={offerableOpportunities.length === 0}
                        className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {labels.createOffer}
                      </button>
                    </div>
                    {offerableOpportunities.length === 0 && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                        {labels.offerNoOpportunity}
                      </div>
                    )}
                    {offersLoading ? (
                      <EmptyState message={labels.offersLoading} />
                    ) : selectedLeadOffers.length === 0 ? (
                      <EmptyState message={labels.noOffers} />
                    ) : (
                      <div className="space-y-2">
                        {selectedLeadOffers.map((offer) => {
                          const opportunity = opportunities.find((item) => item.id === offer.linkedOpportunityId);
                          const unit = units.find((item) => item.id === offer.unitId);
                          const legacyBlocked = !offer.unitId;

                          return (
                            <div key={offer.id} className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                                    {formatCurrency(offer.price, isArabic)}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                                    {unit
                                      ? `${unit.projectName ? `${unit.projectName} · ` : ""}${unit.unitNumber}`
                                      : labels.legacyOfferBlocked}
                                  </p>
                                  {opportunity && (
                                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                                      {labels.offerOpportunity}: {formatCurrency(opportunity.value, isArabic)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openTourModal(offer)}
                                    disabled={legacyBlocked}
                                    className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {labels.scheduleTour}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleAcceptOffer(offer)}
                                    disabled={legacyBlocked || offer.status === "ACCEPTED" || acceptingOfferId === offer.id}
                                    className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {acceptingOfferId === offer.id
                                      ? labels.acceptingOffer
                                      : offer.status === "ACCEPTED"
                                        ? labels.offerAccepted
                                        : labels.acceptOffer}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {detailTab === "opportunities" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {labels.opportunityListTitle}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                          {leadDisplayName(selectedLead)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openOpportunityModal}
                        className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold"
                      >
                        {labels.createOpportunity}
                      </button>
                    </div>

                    {opportunitiesLoading ? (
                      <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-6 text-center">
                        <p className="text-sm font-medium text-[var(--nc-text-secondary)]">
                          {labels.opportunitiesLoading}
                        </p>
                      </div>
                    ) : selectedLeadOpportunities.length === 0 ? (
                      <EmptyState message={labels.noOpportunities} />
                    ) : (
                      <div className="space-y-2">
                        {selectedLeadOpportunities.map((opportunity) => {
                          const unit = units.find((item) => item.id === opportunity.unitId);

                          return (
                            <div
                              key={opportunity.id}
                              className="grid gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                                  {formatCurrency(opportunity.value, isArabic)}
                                </p>
                                <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                                  {unit
                                    ? `${unit.projectName ? `${unit.projectName} · ` : ""}${unit.unitNumber}`
                                    : labels.opportunityNoUnit}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nc-text-secondary)] sm:justify-end">
                                <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-semibold text-[var(--nc-text-primary)]">
                                  {formatNumber(opportunity.probability, isArabic)}%
                                </span>
                                <span>
                                  {formatDate(opportunity.closeDate, isArabic, labels.notSpecified)}
                                </span>
                                <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-semibold text-[var(--nc-text-primary)]">
                                  {displayEnum(opportunity.status, "generalStatus", displayLocale) || opportunity.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {detailTab === "pipeline" && (
                  <div className="relative">
                    <div
                      tabIndex={0}
                      aria-label={labels.pipeline}
                      className="max-h-[220px] space-y-1.5 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {PIPELINE_STAGES.map((stage) => {
                        const count = stageCounts[stage] || 0;

                        return (
                          <div
                            key={stage}
                            className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2"
                          >
                            <span className="truncate text-sm font-semibold text-[var(--nc-text-primary)]">
                              {getStageLabel(stage, displayLocale)}
                            </span>
                            <span className="whitespace-nowrap text-xs text-[var(--nc-text-secondary)]">
                              {formatPipelineCount(count)} {labels.leadsUnit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 rounded-b-2xl bg-gradient-to-t from-[var(--nc-surface)] to-transparent" />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message={labels.selectLead} />
            )}
          </div>

          <div className="h-fit rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.leadsList}</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {formatNumber(filteredLeads.length, isArabic)} {labels.leadsUnit}
                </p>
              </div>

              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setLeadPage(1);
                }}
                placeholder={labels.searchPlaceholder}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm text-[var(--nc-text-primary)] outline-none lg:max-w-md"
              />
            </div>

            {filteredLeads.length > 0 ? (
              <div className="overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                      <th className={`w-[30%] px-3 py-3 ${textAlign} font-semibold`}>{labels.lead}</th>
                      <th className={`w-[16%] px-3 py-3 text-center font-semibold`}>{labels.status}</th>
                      <th className={`w-[22%] px-3 py-3 ${textAlign} font-semibold`}>{labels.source}</th>
                      <th className={`w-[18%] px-3 py-3 ${textAlign} font-semibold`}>{labels.owner}</th>
                      <th className={`w-[14%] px-3 py-3 text-center font-semibold`}>{labels.score}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedLeads.map((lead) => {
                      const selected = selectedLead?.id === lead.id;

                      return (
                        <tr
                          key={lead.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            void handleSelect(lead);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void handleSelect(lead);
                            }
                          }}
                          className={
                            selected
                              ? "cursor-pointer border-b border-[var(--nc-border)] bg-[var(--nc-surface-soft)] outline-none"
                              : "cursor-pointer border-b border-[var(--nc-border)] outline-none transition-colors hover:bg-[var(--nc-surface-soft)]"
                          }
                        >
                          <td className="truncate px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                            {leadDisplayName(lead)}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex justify-center">
                              <LeadStatusBadge status={lead.stage} displayLocale={displayLocale} />
                            </span>
                          </td>

                          <td className="truncate px-3 py-3 text-[var(--nc-text-secondary)]">
                            {leadDisplaySource(lead)}
                          </td>

                          <td className="truncate px-3 py-3 text-[var(--nc-text-secondary)]">
                            {leadDisplayOwner(lead.assignedTo)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center font-mono text-xs text-[var(--nc-text-secondary)]">
                            {formatNumber(lead.leadScore || 0, isArabic)}/100
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <PaginationBar
                  page={leadPage}
                  totalPages={leadTotalPages}
                  labels={labels}
                  isArabic={isArabic}
                  onPrevious={() => setLeadPage((page) => Math.max(1, page - 1))}
                  onNext={() => setLeadPage((page) => Math.min(leadTotalPages, page + 1))}
                />
              </div>
            ) : (
              <EmptyState message={labels.noLeads} />
            )}
          </div>
        </div>
      </div>

      {showOfferModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOfferModal();
          }}
        >
          <form
            onSubmit={handleCreateOffer}
            dir={direction}
            className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.createOffer}</h2>
                <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
              </div>
              <button type="button" onClick={closeOfferModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)]">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {offerErrors.form && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                  {offerErrors.form}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerOpportunity}</label>
                <select
                  value={offerForm.opportunityId}
                  onChange={(event) => {
                    const opportunity = offerableOpportunities.find((item) => item.id === event.target.value);
                    setOfferForm((form) => ({
                      ...form,
                      opportunityId: event.target.value,
                      price: opportunity ? String(Number(opportunity.value || 0)) : "",
                    }));
                    setOfferErrors((errors) => ({ ...errors, opportunityId: undefined, form: undefined }));
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
                >
                  <option value="">{labels.offerOpportunityRequired}</option>
                  {offerableOpportunities.map((opportunity) => {
                    const unit = units.find((item) => item.id === opportunity.unitId);
                    return (
                      <option key={opportunity.id} value={opportunity.id}>
                        {formatCurrency(opportunity.value, isArabic)} - {unit ? unit.unitNumber : labels.opportunityNoUnit}
                      </option>
                    );
                  })}
                </select>
                <FieldError message={offerErrors.opportunityId} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerPrice}</label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.price}
                    onChange={(event) => {
                      setOfferForm((form) => ({ ...form, price: event.target.value }));
                      setOfferErrors((errors) => ({ ...errors, price: undefined, form: undefined }));
                    }}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
                  />
                  <FieldError message={offerErrors.price} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerValidUntil}</label>
                  <input
                    type="text"
                    value={offerForm.validUntilText}
                    dir="ltr"
                    lang="en-CA"
                    inputMode="numeric"
                    pattern="\d{2}-\d{2}-\d{4}"
                    onChange={(event) => {
                      const validUntilText = normalizeDateFieldText(event.target.value);
                      const validUntil = parseDateFieldToIso(validUntilText);
                      setOfferForm((form) => ({ ...form, validUntil, validUntilText }));
                      setOfferErrors((errors) => ({ ...errors, validUntil: undefined, form: undefined }));
                    }}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-left text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
                  />
                  <FieldError message={offerErrors.validUntil} />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">{labels.offerUnitReadonly}</p>
                <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
                  {offerFormUnit
                    ? `${offerFormUnit.projectName ? `${offerFormUnit.projectName} · ` : ""}${offerFormUnit.unitNumber}`
                    : labels.opportunityNoUnit}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeOfferModal} className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold">
                {labels.cancel}
              </button>
              <button type="submit" disabled={offerSaving || !offerFormOpportunity?.unitId} className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60">
                {offerSaving ? labels.savingOffer : labels.saveOffer}
              </button>
            </div>
          </form>
        </div>
      )}

      {showTourModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTourModal();
          }}
        >
          <form
            onSubmit={handleScheduleTour}
            dir={direction}
            className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.scheduleTour}</h2>
                <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
              </div>
              <button type="button" onClick={closeTourModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)]">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {tourErrors.form && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                  {tourErrors.form}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.tourDate}</label>
                  <input
                    type="text"
                    value={tourForm.startDateText}
                    dir="ltr"
                    lang="en-CA"
                    inputMode="numeric"
                    pattern="\d{2}-\d{2}-\d{4}"
                    onChange={(event) => {
                      const startDateText = normalizeDateFieldText(event.target.value);
                      const startDate = parseDateFieldToIso(startDateText);
                      setTourForm((form) => ({ ...form, startDate, startDateText }));
                      setTourErrors((errors) => ({ ...errors, startDate: undefined, form: undefined }));
                    }}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-left text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
                  />
                  <FieldError message={tourErrors.startDate} />
                </div>
                <div dir="ltr">
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)] text-right">{labels.tourTime}</label>
                  <TimeField value={tourForm.time} onChange={(v) => setTourForm(f => ({ ...f, time: v }))} className="w-full" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.tourLocation}</label>
                <input
                  value={tourForm.location}
                  onChange={(event) => {
                    setTourForm((form) => ({ ...form, location: event.target.value }));
                    setTourErrors((errors) => ({ ...errors, location: undefined, form: undefined }));
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
                />
                <FieldError message={tourErrors.location} />
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeTourModal} className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold">
                {labels.cancel}
              </button>
              <button type="submit" disabled={tourSaving} className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60">
                {tourSaving ? labels.savingTour : labels.saveTour}
              </button>
            </div>
          </form>
        </div>
      )}

      {showOpportunityModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-opportunity-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOpportunityModal();
            }
          }}
        >
          <form
            onSubmit={handleCreateOpportunity}
            dir={direction}
            className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
              <div className="min-w-0">
                <h2 id="create-opportunity-title" className="text-base font-bold text-[var(--nc-text-primary)]">
                  {labels.createOpportunity}
                </h2>
                <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                  {labels.opportunityLead}: {leadDisplayName(selectedLead)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOpportunityModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)] transition-colors hover:text-[var(--nc-text-primary)]"
                aria-label={labels.cancel}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                  {labels.opportunityLead}
                </p>
                <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
                  {leadDisplayName(selectedLead)}
                </p>
              </div>

              {opportunityErrors.form && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                  {opportunityErrors.form}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                    {labels.opportunityValue}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={opportunityForm.value}
                    onChange={(event) => {
                      setOpportunityForm((form) => ({ ...form, value: event.target.value }));
                      setOpportunityErrors((errors) => ({ ...errors, value: undefined, form: undefined }));
                    }}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#C8A45D]"
                    inputMode="numeric"
                  />
                  <FieldError message={opportunityErrors.value} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                    {labels.opportunityProbability}
                  </label>
                  <div className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 focus-within:border-[#C8A45D]">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={opportunityForm.probability}
                      onChange={(event) => {
                        setOpportunityForm((form) => ({ ...form, probability: event.target.value }));
                        setOpportunityErrors((errors) => ({ ...errors, probability: undefined, form: undefined }));
                      }}
                      className="min-w-0 flex-1 accent-[#C8A45D]"
                    />
                    <span className="w-12 text-center text-sm font-bold text-[var(--nc-text-primary)]">
                      {formatNumber(opportunityForm.probability, isArabic)}%
                    </span>
                  </div>
                  <FieldError message={opportunityErrors.probability} />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                  {labels.opportunityCloseDate}
                </label>
                <input
                  type="text"
                  value={opportunityForm.closeDateText}
                  dir="ltr"
                  lang="en-CA"
                  onChange={(event) => {
                    const closeDateText = normalizeDateFieldText(event.target.value);
                    const closeDate = parseDateFieldToIso(closeDateText);

                    setOpportunityForm((form) => ({ ...form, closeDate, closeDateText }));
                    setOpportunityErrors((errors) => ({ ...errors, closeDate: undefined, form: undefined }));
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-left text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#C8A45D]"
                  inputMode="numeric"
                  pattern="\d{2}-\d{2}-\d{4}"
                />
                <FieldError message={opportunityErrors.closeDate} />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                  {labels.opportunityUnit}
                </label>
                <button
                  type="button"
                  onClick={() => setUnitSelectOpen((open) => !open)}
                  className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors hover:border-[#C8A45D]"
                  aria-expanded={unitSelectOpen}
                  aria-busy={unitsLoading}
                >
                  <span className="min-w-0 truncate text-start">
                    {unitsLoading
                      ? labels.unitsLoading
                      : selectedUnit
                      ? `${selectedUnit.projectName ? `${selectedUnit.projectName} · ` : ""}${selectedUnit.unitNumber} (${formatCurrency(selectedUnit.priceSar, isArabic)})`
                      : labels.opportunityUnitPlaceholder}
                  </span>
                  <span className="shrink-0 text-[var(--nc-text-secondary)]" aria-hidden="true">
                    {unitSelectOpen ? "^" : "v"}
                  </span>
                </button>
                <FieldError message={opportunityErrors.unitId} />

                {unitSelectOpen && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-1 shadow-lg">
                    {unitsLoading ? (
                      <div className="px-3 py-3 text-sm font-semibold text-[var(--nc-text-secondary)]">
                        {labels.unitsLoading}
                      </div>
                    ) : unitsError ? (
                      <div className="px-3 py-3 text-sm font-semibold text-red-500">
                        {unitsError}
                      </div>
                    ) : selectableUnits.length === 0 ? (
                      <div className="px-3 py-3 text-sm font-semibold text-[var(--nc-text-secondary)]">
                        {labels.noAvailableUnits}
                      </div>
                    ) : (
                      selectableUnits.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setOpportunityForm((form) => ({ ...form, unitId: unit.id }));
                            setOpportunityErrors((errors) => ({ ...errors, unitId: undefined, form: undefined }));
                            setUnitSelectOpen(false);
                          }}
                          className={
                            opportunityForm.unitId === unit.id
                              ? "flex w-full items-center justify-between gap-3 rounded-lg bg-[#C8A45D]/15 px-3 py-2 text-start text-sm font-bold text-[var(--nc-text-primary)]"
                              : "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm font-semibold text-[var(--nc-text-primary)] transition-colors hover:bg-[var(--nc-surface-soft)]"
                          }
                        >
                          <span className="min-w-0 truncate">
                            {unit.projectName ? `${unit.projectName} · ` : ""}
                            {unit.unitNumber}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--nc-text-secondary)]">
                            {formatCurrency(unit.priceSar, isArabic)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeOpportunityModal}
                className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={opportunitySaving || unitsLoading || !hasValidSelectedUnit}
                className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {opportunitySaving ? labels.savingOpportunity : labels.saveOpportunity}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
