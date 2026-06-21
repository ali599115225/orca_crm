// components/views/LeadsWorkspace.tsx — ORCA Leads visual contract
"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { displayPerson, displayGeo, displayEnum, displayEntity } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import { formatDisplayDate, formatDisplayTime } from '@/lib/display/dateTime';

import type {
  DetailTab,
  LeadItem,
  Opportunity,
  Offer,
  Tour,
  UnitOption,
  OpportunityForm,
  OpportunityFormErrors,
  OfferForm,
  TourForm,
  Copy,
} from "../leads/types";

import LeadsKpis from "../leads/LeadsKpis";
import LeadsList from "../leads/LeadsList";
import LeadDetails from "../leads/LeadDetails";
import CreateOpportunityDialog from "../leads/dialogs/CreateOpportunityDialog";
import CreateOfferDialog from "../leads/dialogs/CreateOfferDialog";
import ScheduleTourDialog from "../leads/dialogs/ScheduleTourDialog";

const PAGE_SIZE = 5;

import {
  PIPELINE_STAGES,
  formatNumber,
  formatPipelineCount,
  formatCurrency,
  formatDate,
  normalizeDateFieldText,
  parseDateFieldToIso,
  getStageLabel,
  EmptyState,
  FieldError,
  LeadStatusBadge,
  PaginationBar,
} from "../leads/helpers";

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

function getStageCounts(leads: LeadItem[]) {
  const map: Record<string, number> = {};

  PIPELINE_STAGES.forEach((stage) => {
    map[stage] = leads.filter((lead) => lead.stage === stage).length;
  });

  return map;
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

  const leadDisplayName = (lead: LeadItem): string => {
    const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim().replace(/\s+/g, " ");
    if (name) return name;
    const phone = (lead.phone || "").trim();
    return phone || labels.notSpecified;
  };

  const leadDisplayCity = (lead: LeadItem): string =>
    displayGeo(lead.city, 'city', displayLocale, { route: '/operations/leads' });

  const leadDisplaySource = (lead: LeadItem): string =>
    displayEnum(lead.source, 'leadSource', displayLocale);

  const leadDisplayStatus = (status?: string | null): string =>
    displayEnum(status, 'leadStatus', displayLocale);

  const leadDisplayOwner = (value?: string | null): string =>
    displayPerson(value, displayLocale, { route: '/operations/leads' });

  const unitDisplayLabel = (unit?: UnitOption | null): string => {
    if (!unit) return labels.opportunityNoUnit;

    const project = displayEntity(unit.projectName, "project", displayLocale, {
      route: "/operations/leads",
      entityId: unit.id,
      fieldName: "projectName",
    });
    const unitNumber = displayEntity(unit.unitNumber, "unit", displayLocale, {
      route: "/operations/leads",
      entityId: unit.id,
      fieldName: "unitNumber",
    });
    const parts = [project, unitNumber].filter((part) => part && part !== labels.notSpecified);

    return parts.length > 0 ? parts.join(" · ") : labels.opportunityNoUnit;
  };

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
        ? unitDisplayLabel(unit)
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

        <LeadsKpis
          labels={labels}
          totalLeads={totalLeads}
          newLeads={newLeads}
          qualified={qualified}
          conversion={conversion}
          isArabic={isArabic}
          formatNumber={formatNumber}
        />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]">
          <LeadDetails
            labels={labels}
            selectedLead={selectedLead}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            detailTabs={detailTabs}
            isArabic={isArabic}
            displayLocale={displayLocale}
            leadInitials={leadInitials}
            leadDisplayName={leadDisplayName}
            leadDisplayCity={leadDisplayCity}
            leadDisplaySource={leadDisplaySource}
            leadDisplayStatus={leadDisplayStatus}
            leadDisplayOwner={leadDisplayOwner}
            formatNumber={formatNumber}
            formatDate={formatDate}
            formatDisplayTime={formatDisplayTime}
            formatCurrency={formatCurrency}
            detailData={detailData}
            toursLoading={toursLoading}
            selectedLeadTours={selectedLeadTours}
            units={units}
            unitDisplayLabel={unitDisplayLabel}
            offersLoading={offersLoading}
            selectedLeadOffers={selectedLeadOffers}
            opportunities={opportunities}
            offerableOpportunities={offerableOpportunities}
            acceptingOfferId={acceptingOfferId}
            openOfferModal={openOfferModal}
            openTourModal={openTourModal}
            handleAcceptOffer={handleAcceptOffer}
            openOpportunityModal={openOpportunityModal}
            opportunitiesLoading={opportunitiesLoading}
            selectedLeadOpportunities={selectedLeadOpportunities}
            stageCounts={stageCounts}
            getStageLabel={getStageLabel}
            formatPipelineCount={formatPipelineCount}
            pipelineStages={PIPELINE_STAGES}
          />

          <LeadsList
            labels={labels}
            filteredLeads={filteredLeads}
            pagedLeads={pagedLeads}
            selectedLead={selectedLead}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            leadPage={leadPage}
            setLeadPage={setLeadPage}
            leadTotalPages={leadTotalPages}
            isArabic={isArabic}
            textAlign={textAlign}
            displayLocale={displayLocale}
            handleSelect={handleSelect}
            leadDisplayName={leadDisplayName}
            leadDisplaySource={leadDisplaySource}
            leadDisplayOwner={leadDisplayOwner}
            formatNumber={formatNumber}
          />
        </div>
      </div>

      {showOfferModal && selectedLead && (
        <CreateOfferDialog
          labels={labels}
          selectedLead={selectedLead}
          offerForm={offerForm}
          setOfferForm={setOfferForm}
          offerErrors={offerErrors}
          setOfferErrors={setOfferErrors}
          offerableOpportunities={offerableOpportunities}
          units={units}
          isArabic={isArabic}
          direction={direction}
          offerSaving={offerSaving}
          offerFormOpportunity={offerFormOpportunity}
          offerFormUnit={offerFormUnit}
          closeOfferModal={closeOfferModal}
          handleCreateOffer={handleCreateOffer}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
        />
      )}

      {showTourModal && selectedLead && (
        <ScheduleTourDialog
          labels={labels}
          selectedLead={selectedLead}
          tourForm={tourForm}
          setTourForm={setTourForm}
          tourErrors={tourErrors}
          setTourErrors={setTourErrors}
          direction={direction}
          tourSaving={tourSaving}
          closeTourModal={closeTourModal}
          handleScheduleTour={handleScheduleTour}
          leadDisplayName={leadDisplayName}
          normalizeDateFieldText={normalizeDateFieldText}
          parseDateFieldToIso={parseDateFieldToIso}
        />
      )}

      {showOpportunityModal && selectedLead && (
        <CreateOpportunityDialog
          labels={labels}
          selectedLead={selectedLead}
          opportunityForm={opportunityForm}
          setOpportunityForm={setOpportunityForm}
          opportunityErrors={opportunityErrors}
          setOpportunityErrors={setOpportunityErrors}
          unitSelectOpen={unitSelectOpen}
          setUnitSelectOpen={setUnitSelectOpen}
          unitsLoading={unitsLoading}
          selectedUnit={selectedUnit}
          hasValidSelectedUnit={hasValidSelectedUnit}
          unitsError={unitsError}
          selectableUnits={selectableUnits}
          opportunitySaving={opportunitySaving}
          isArabic={isArabic}
          direction={direction}
          closeOpportunityModal={closeOpportunityModal}
          handleCreateOpportunity={handleCreateOpportunity}
          leadDisplayName={leadDisplayName}
          unitDisplayLabel={unitDisplayLabel}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          normalizeDateFieldText={normalizeDateFieldText}
          parseDateFieldToIso={parseDateFieldToIso}
        />
      )}
    </section>
  );
}
