// components/views/LeadsWorkspace.tsx — ORCA Leads visual contract
"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { formatLeadStatus } from "@/lib/ui-status";
import type { LeadItem } from "./pipeline/KanbanCard";

const PAGE_SIZE = 10;

const STAGES = [
  { id: "New", titleAr: "جديد", titleEn: "New" },
  { id: "Contacted", titleAr: "تم التواصل", titleEn: "Contacted" },
  { id: "Qualified", titleAr: "مؤهل", titleEn: "Qualified" },
  { id: "Tour Scheduled", titleAr: "مجدول للزيارة", titleEn: "Tour Scheduled" },
  { id: "Offer Sent", titleAr: "أرسل العرض", titleEn: "Offer Sent" },
  { id: "Negotiation", titleAr: "تفاوض", titleEn: "Negotiation" },
  { id: "Closed", titleAr: "مغلق", titleEn: "Closed" },
];

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
  open: string;
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
    open: "فتح",
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
    open: "Open",
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

function formatSource(source?: string | null, isArabic = true): string {
  const arMap: Record<string, string> = {
    WHATSAPP: "واتساب",
    WEBSITE: "موقع إلكتروني",
    REFERRAL: "إحالة",
    "Google Ads": "إعلانات Google",
    "Meta Ads": "إعلانات Meta",
    "Snapchat Ads": "إعلانات سناب",
    "TikTok Ads": "إعلانات TikTok",
    "إعلانات TikTok": "إعلانات TikTok",
    "TikTok إعلانات": "إعلانات TikTok",
    "إعلانات Meta": "إعلانات Meta",
    "Meta إعلانات": "إعلانات Meta",
    "إعلانات Google": "إعلانات Google",
    "Google إعلانات": "إعلانات Google",
    "إعلانات Snapchat": "إعلانات سناب",
    "Snapchat إعلانات": "إعلانات سناب",
  };

  const enMap: Record<string, string> = {
    WHATSAPP: "WhatsApp",
    WEBSITE: "Website",
    REFERRAL: "Referral",
    "إعلانات TikTok": "TikTok Ads",
    "TikTok إعلانات": "TikTok Ads",
    "إعلانات Meta": "Meta Ads",
    "Meta إعلانات": "Meta Ads",
    "إعلانات Google": "Google Ads",
    "Google إعلانات": "Google Ads",
    "إعلانات Snapchat": "Snapchat Ads",
    "Snapchat إعلانات": "Snapchat Ads",
  };

  const normalized = String(source || "").trim();
  const map = isArabic ? arMap : enMap;

  return map[normalized] || normalized || (isArabic ? "غير محدد" : "Not specified");
}

function isTechnicalId(value?: string | null): boolean {
  if (!value) return false;

  const normalized = String(value).trim();

  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    normalized,
  );
}

function formatOwner(value: unknown, notSpecified: string): string {
  if (!value) return notSpecified;

  const normalized = String(value).trim();

  if (!normalized || normalized === "—" || normalized === "-") return notSpecified;
  if (isTechnicalId(normalized)) return notSpecified;

  return normalized;
}

function formatNumber(value: unknown, isArabic: boolean): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString(isArabic ? "ar-SA" : "en-US")
    : "0";
}

function getLeadName(lead: LeadItem): string {
  return `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "—";
}

function getStageLabel(stageId: string, isArabic: boolean): string {
  const stage = STAGES.find((item) => item.id === stageId);

  return stage ? (isArabic ? stage.titleAr : stage.titleEn) : stageId;
}

function getStageCounts(leads: LeadItem[]) {
  const map: Record<string, number> = {};

  STAGES.forEach((stage) => {
    map[stage.id] = leads.filter((lead) => lead.stage === stage.id).length;
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

function LeadStatusBadge({ status }: { status?: string | null }) {
  const label = formatLeadStatus(status);

  return (
    <span className="inline-flex min-h-[28px] min-w-[92px] items-center justify-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 text-xs font-semibold text-[var(--nc-text-primary)]">
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

  useEffect(() => {
    void loadLeads();
  }, []);

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

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return leads;

    return leads.filter((lead) => {
      return (
        getLeadName(lead).toLowerCase().includes(term) ||
        String(lead.city || "").toLowerCase().includes(term) ||
        formatSource(lead.source, isArabic).toLowerCase().includes(term) ||
        formatOwner(lead.assignedTo, labels.notSpecified).toLowerCase().includes(term) ||
        formatLeadStatus(lead.stage).toLowerCase().includes(term)
      );
    });
  }, [leads, searchTerm, isArabic, labels.notSpecified]);

  const leadTotalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const pagedLeads = filteredLeads.slice((leadPage - 1) * PAGE_SIZE, leadPage * PAGE_SIZE);
  const stageCounts = getStageCounts(leads);
  const totalLeads = leads.length;
  const newLeads = stageCounts.New || 0;
  const qualified = stageCounts.Qualified || 0;
  const conversion = totalLeads > 0 ? Math.round(((stageCounts.Closed || 0) / totalLeads) * 100) : 0;

  if (loading) {
    return (
      <section dir={direction} className="min-h-full px-4 pb-8 pt-6 lg:px-6">
        <div className="mx-auto flex min-h-[240px] w-full max-w-[1500px] items-center justify-center rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)]">
          <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loading}</p>
        </div>
      </section>
    );
  }

  return (
    <section dir={direction} className="min-h-full px-4 pb-8 pt-6 lg:px-6">
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]">
          <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
            {selectedLead ? (
              <div className="space-y-4">
                <div className="border-b border-[var(--nc-border)] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-xl font-bold text-[var(--nc-text-primary)]">
                      {selectedLead.firstName?.[0] || "؟"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-[var(--nc-text-primary)]">
                        {getLeadName(selectedLead)}
                      </h2>
                      <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                        {selectedLead.city || labels.notSpecified} · {formatSource(selectedLead.source, isArabic)}
                      </p>
                    </div>

                    <LeadStatusBadge status={selectedLead.stage} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: labels.score,
                        value: selectedLead.leadScore ? `${selectedLead.leadScore}/100` : labels.notSpecified,
                      },
                      { label: labels.city, value: selectedLead.city || labels.notSpecified },
                      { label: labels.source, value: formatSource(selectedLead.source, isArabic) },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="min-h-[56px] rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3"
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
                            ? "nc-btn-primary min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                            : "nc-btn-ghost min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                        }
                      >
                        {labels[tab.labelKey]}
                      </button>
                    );
                  })}
                </div>

                {detailTab === "summary" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        title: labels.leadInfo,
                        body: `${getLeadName(selectedLead)} · ${selectedLead.city || labels.notSpecified} · ${formatSource(
                          selectedLead.source,
                          isArabic,
                        )}`,
                      },
                      {
                        title: labels.currentStatus,
                        body: `${labels.stage}: ${formatLeadStatus(selectedLead.stage)} · ${labels.score}: ${
                          selectedLead.leadScore || 0
                        }/100`,
                      },
                      {
                        title: labels.lastActivity,
                        body: (detailData as any)?.updatedAt
                          ? new Date((detailData as any).updatedAt).toLocaleDateString(
                              isArabic ? "ar-SA" : "en-US",
                              { year: "numeric", month: "long", day: "numeric" },
                            )
                          : labels.notSpecified,
                      },
                      {
                        title: labels.assignedTo,
                        body: formatOwner(selectedLead.assignedTo, labels.notSpecified),
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="min-h-[132px] rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4"
                      >
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{card.title}</h3>
                        <p className="mt-2 text-xs leading-6 text-[var(--nc-text-secondary)]">{card.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === "contacts" && <EmptyState message={labels.noContacts} />}
                {detailTab === "tasks" && <EmptyState message={labels.noTasks} />}
                {detailTab === "tours" && <EmptyState message={labels.noTours} />}
                {detailTab === "offers" && <EmptyState message={labels.noOffers} />}
                {detailTab === "opportunities" && <EmptyState message={labels.noOpportunities} />}

                {detailTab === "pipeline" && (
                  <div className="space-y-2">
                    {STAGES.map((stage) => {
                      const count = stageCounts[stage.id] || 0;

                      return (
                        <div
                          key={stage.id}
                          className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3"
                        >
                          <span className="text-sm font-semibold text-[var(--nc-text-primary)]">
                            {getStageLabel(stage.id, isArabic)}
                          </span>
                          <span className="text-xs text-[var(--nc-text-secondary)]">
                            {formatNumber(count, isArabic)} {labels.leadsUnit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message={labels.selectLead} />
            )}
          </div>

          <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                      <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.lead}</th>
                      <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.status}</th>
                      <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.source}</th>
                      <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.owner}</th>
                      <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.score}</th>
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
                          <td className="px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                            {getLeadName(lead)}
                          </td>

                          <td className="px-3 py-3">
                            <LeadStatusBadge status={lead.stage} />
                          </td>

                          <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                            {formatSource(lead.source, isArabic)}
                          </td>

                          <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                            {formatOwner(lead.assignedTo, labels.notSpecified)}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs text-[var(--nc-text-secondary)]">
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
    </section>
  );
}
