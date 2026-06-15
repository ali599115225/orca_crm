// components/views/LeadsWorkspace.tsx — v4 Fixed Operating Workspace
"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatLeadStatus } from "@/lib/ui-status";
import type { LeadItem } from "./pipeline/KanbanCard";

const STAGES = [
  { id: "New", titleAr: "جديد", titleEn: "New" },
  { id: "Contacted", titleAr: "تم التواصل", titleEn: "Contacted" },
  { id: "Qualified", titleAr: "مؤهل", titleEn: "Qualified" },
  { id: "Tour Scheduled", titleAr: "مجدول للزيارة", titleEn: "Tour Scheduled" },
  { id: "Offer Sent", titleAr: "أرسل العرض", titleEn: "Offer Sent" },
  { id: "Negotiation", titleAr: "تفاوض", titleEn: "Negotiation" },
  { id: "Closed", titleAr: "مغلق", titleEn: "Closed" },
];

function formatSource(source?: string | null): string {
  const map: Record<string, string> = {
    WHATSAPP: "واتساب", WEBSITE: "موقع إلكتروني", REFERRAL: "إحالة",
    "Google Ads": "إعلانات Google", "Meta Ads": "إعلانات Meta",
    "Snapchat Ads": "إعلانات سناب", "TikTok Ads": "إعلانات TikTok",
    "إعلانات TikTok": "إعلانات TikTok", "TikTok إعلانات": "إعلانات TikTok",
    "إعلانات Meta": "إعلانات Meta", "Meta إعلانات": "إعلانات Meta",
    "إعلانات Google": "إعلانات Google", "Google إعلانات": "إعلانات Google",
    "إعلانات Snapchat": "إعلانات سناب", "Snapchat إعلانات": "إعلانات سناب",
  };
  const normalized = String(source || "").trim();
  return map[normalized] || normalized || "غير محدد";
}

// Check if a value looks like a UUID/hash and should not be shown to users
function isTechnicalId(value?: string | null): boolean {
  if (!value) return false;
  const normalized = String(value).trim();
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(normalized);
}

function formatOwner(value?: string | null): string {
  if (!value) return "غير محدد";
  const normalized = String(value).trim();
  if (!normalized || normalized === "—" || normalized === "-") return "غير محدد";
  if (isTechnicalId(normalized)) return "غير محدد";
  return normalized;
}

function LeadStatusBadge({ status }: { status?: string | null }) {
  const label = formatLeadStatus(status);
  return (
    <span className="inline-flex h-7 min-w-[86px] items-center justify-center rounded-full border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] px-3 text-xs font-bold text-[var(--nc-foreground)]">
      {label}
    </span>
  );
}

function getStageCounts(leads: LeadItem[]) {
  const map: Record<string, number> = {};
  STAGES.forEach(s => { map[s.id] = leads.filter(l => l.stage === s.id).length; });
  return map;
}

export default function LeadsWorkspace() {
  const { t, lang } = useApp();
  const isArabic = lang === 'AR';
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [detailTab, setDetailTab] = useState("summary");
  const [detailData, setDetailData] = useState<any>(null);

  const loadLeads = async () => {
    try {
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setLeads(json.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadLeads(); }, []);

  const handleSelect = async (lead: LeadItem) => {
    setSelectedLead(lead);
    setDetailTab("summary");
    try {
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      const found = (json.data || []).find((l: any) => l.id === lead.id);
      setDetailData(found || lead);
    } catch { setDetailData(lead); }
  };

  const stageCounts = getStageCounts(leads);
  const totalLeads = leads.length;
  const newLeads = stageCounts["New"] || 0;
  const qualified = stageCounts["Qualified"] || 0;

  const tabs = [
    { id: "summary", label: isArabic ? "الملخص" : "Summary" },
    { id: "contacts", label: isArabic ? "جهات اتصال" : "Contacts" },
    { id: "tasks", label: isArabic ? "المهام" : "Tasks" },
    { id: "tours", label: isArabic ? "الجولات" : "Tours" },
    { id: "offers", label: isArabic ? "العروض" : "Offers" },
    { id: "opportunities", label: isArabic ? "الفرص" : "Opportunities" },
    { id: "pipeline", label: isArabic ? "مسار الصفقات" : "Pipeline" },
  ];

  const columns = [
    { header: isArabic ? "العميل" : "Lead", accessor: (l: LeadItem) => <span className="font-extrabold text-sm">{l.firstName} {l.lastName || ""}</span> },
    { header: isArabic ? "الحالة" : "Status", accessor: (l: LeadItem) => <LeadStatusBadge status={l.stage} />, headerClassName: "text-center" },
    { header: isArabic ? "المصدر" : "Source", accessor: (l: LeadItem) => <span className="text-xs text-[var(--nc-text-dim)]">{formatSource(l.source)}</span> },
    { header: isArabic ? "مسؤول" : "Owner", accessor: (l: LeadItem) => <span className="text-xs">{formatOwner(l.assignedTo)}</span> },
    { header: isArabic ? "الدرجة" : "Score", accessor: (l: LeadItem) => <span className="font-mono text-xs">{l.leadScore}/100</span> },
  ] as Column<LeadItem>[];

  const renderEmptyTab = (message: string) => (
    <div className="flex items-center justify-center h-40 border border-dashed border-[var(--nc-glass-border)] rounded-2xl text-[var(--nc-text-dim)] text-sm px-4 text-center">
      {message}
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[var(--nc-text-dim)]">{isArabic ? "جاري التحميل..." : "Loading..."}</div>;
  }

  return (
    <>
    <style>{`
      .leads-scroll-hidden { scrollbar-width: none; -ms-overflow-style: none; }
      .leads-scroll-hidden::-webkit-scrollbar { display: none; width: 0; height: 0; }
    `}</style>
    <div className="flex flex-col gap-4 px-5 py-4" style={{ height: "calc(100vh - 76px)", maxWidth: 1600, margin: "0 auto" }} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="shrink-0">
        <div className="text-xs text-[var(--nc-text-dim)] mb-1">{isArabic ? "العمليات / العملاء المحتملين" : "Operations / Leads"}</div>
        <h1 className="text-2xl font-black text-[var(--nc-foreground)]">{isArabic ? "إدارة العملاء المحتملين" : "Leads Management"}</h1>
        <p className="text-sm text-[var(--nc-text-dim)] mt-1">{isArabic ? "مركز تشغيل ثابت: اختر عميلاً من القائمة لعرض التفاصيل والمتابعة" : "Fixed workspace: select a lead to view details and follow up"}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0" style={{ height: 104 }}>
        {[
          { label: isArabic ? "إجمالي العملاء" : "Total Leads", val: totalLeads, note: isArabic ? "سجل العملاء المحتملين" : "Lead registry" },
          { label: isArabic ? "عملاء جدد" : "New Leads", val: newLeads, note: isArabic ? "الأسبوع الحالي" : "This week" },
          { label: isArabic ? "عملاء مؤهلون" : "Qualified", val: qualified, note: isArabic ? "جاهزون للمتابعة" : "Ready to follow up" },
          { label: isArabic ? "معدل التحويل" : "Conversion", val: totalLeads > 0 ? Math.round((stageCounts["Closed"] || 0) / totalLeads * 100) + '%' : '0%', note: isArabic ? "نسبة الصفقات المغلقة" : "Closed deal rate" },
        ].map((kpi, i) => (
          <SmartCard key={i} elevation="elevated" className="p-4 flex flex-col justify-between overflow-hidden">
            <span className="text-xs text-[var(--nc-text-dim)] truncate">{kpi.label}</span>
            <span className="text-3xl font-black">{kpi.val}</span>
            <span className="text-xs text-[var(--nc-text-dim)] truncate">{kpi.note}</span>
          </SmartCard>
        ))}
      </div>

      {/* Master-Detail Workspace */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: "minmax(0, 0.54fr) minmax(0, 0.46fr)" }}>
        {/* Detail Panel */}
        <SmartCard elevation="default" className="flex flex-col min-h-0 overflow-hidden">
          {selectedLead ? (
            <>
              {/* Detail Header */}
              <div className="px-4 py-3 border-b border-[var(--nc-glass-border)] shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)] font-black text-xl shrink-0">
                    {selectedLead.firstName?.[0] || "؟"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-lg truncate">{selectedLead.firstName} {selectedLead.lastName || ""}</h4>
                    <p className="text-xs text-[var(--nc-text-dim)] truncate">{selectedLead.city || "غير محدد"} · {formatSource(selectedLead.source)}</p>
                  </div>
                  <LeadStatusBadge status={selectedLead.stage} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: isArabic ? "الدرجة" : "Score", value: selectedLead.leadScore ? `${selectedLead.leadScore}/100` : "غير محدد" },
                    { label: isArabic ? "المدينة" : "City", value: selectedLead.city || "غير محدد" },
                    { label: isArabic ? "المصدر" : "Source", value: formatSource(selectedLead.source) },
                  ].map((stat, i) => (
                    <div key={i} className="h-11 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-3 flex flex-col justify-center overflow-hidden">
                      <span className="text-[9px] text-[var(--nc-text-dim)] truncate">{stat.label}</span>
                      <span className="text-sm font-bold truncate">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-3 py-2 border-b border-[var(--nc-glass-border)] shrink-0 flex-wrap" style={{ maxHeight: 80, overflow: 'hidden' }}>
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setDetailTab(tab.id)}
                    className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors ${
                      detailTab === tab.id
                        ? 'bg-[var(--nc-foreground)] text-[var(--nc-bg)] border-[var(--nc-foreground)]'
                        : 'bg-[var(--nc-surface)] border-[var(--nc-glass-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
                    }`}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Detail Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 leads-scroll-hidden">
                {detailTab === "summary" && (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {[
                      { title: isArabic ? "بيانات العميل" : "Lead Info", body: `${selectedLead.firstName} ${selectedLead.lastName || ""}${selectedLead.city ? " · " + selectedLead.city : ""} · ${formatSource(selectedLead.source)}` },
                      { title: isArabic ? "الحالة الحالية" : "Current Status", body: `المرحلة: ${formatLeadStatus(selectedLead.stage)} · الدرجة: ${selectedLead.leadScore}/100` },
                      { title: isArabic ? "آخر نشاط" : "Last Activity", body: (detailData as any)?.updatedAt ? new Date((detailData as any).updatedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "غير محدد" },
                      { title: isArabic ? "المسؤول" : "Assigned To", body: formatOwner(selectedLead.assignedTo) },
                    ].map((card, i) => (
                      <div key={i} className="border border-[var(--nc-glass-border)] rounded-2xl bg-[var(--nc-surface)] p-4 flex flex-col justify-between overflow-hidden" style={{ height: 148 }}>
                        <div>
                          <h4 className="font-bold text-sm mb-2 truncate">{card.title}</h4>
                          <p className="text-xs text-[var(--nc-text-dim)] line-clamp-3">{card.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === "contacts" && renderEmptyTab(isArabic ? "لا توجد جهات اتصال مرتبطة بهذا العميل" : "No contacts linked to this lead")}
                {detailTab === "tasks" && renderEmptyTab(isArabic ? "لا توجد مهام مرتبطة بهذا العميل" : "No tasks linked to this lead")}
                {detailTab === "tours" && renderEmptyTab(isArabic ? "لا توجد جولات مجدولة لهذا العميل" : "No tours scheduled for this lead")}
                {detailTab === "offers" && renderEmptyTab(isArabic ? "لا توجد عروض مرتبطة بهذا العميل" : "No offers linked to this lead")}
                {detailTab === "opportunities" && renderEmptyTab(isArabic ? "لا توجد فرص مرتبطة بهذا العميل" : "No opportunities linked to this lead")}

                {detailTab === "pipeline" && (
                  <div className="space-y-2">
                    {STAGES.map(stage => {
                      const count = stageCounts[stage.id] || 0;
                      return (
                        <div key={stage.id} className="h-14 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-4 flex items-center justify-between">
                          <span className="font-bold text-sm">{lang === 'AR' ? stage.titleAr : stage.titleEn}</span>
                          <span className="text-xs text-[var(--nc-text-dim)]">{count} {isArabic ? "عميل" : "leads"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--nc-text-dim)] text-sm p-8">
              <p className="text-center">{isArabic ? "اختر عميلاً من القائمة لعرض التفاصيل هنا" : "Select a lead from the list to view details here"}</p>
            </div>
          )}
        </SmartCard>

        {/* Master Table */}
        <SmartCard elevation="default" className="flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--nc-glass-border)] flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-base">{isArabic ? "قائمة العملاء" : "Leads List"}</h3>
            <span className="text-xs text-[var(--nc-text-dim)]">{totalLeads} {isArabic ? "عميل" : "leads"}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto leads-scroll-hidden">
            <DataTable
              columns={columns}
              data={leads}
              pageSize={10}
              selectedId={selectedLead?.id}
              getId={(l) => l.id}
              onRowClick={(l) => handleSelect(l)}
              emptyMessage={isArabic ? "لا يوجد عملاء" : "No leads"}
            />
          </div>
        </SmartCard>
      </div>
    </div>
    </>
  );
}
