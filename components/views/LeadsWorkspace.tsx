// components/views/LeadsWorkspace.tsx — v4 Fixed Operating Workspace
"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import { SmartCard } from "@/components/ui/SmartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusCell } from "@/components/ui/orca-table/cells/StatusCell";
import { MoneyCell } from "@/components/ui/orca-table/cells/MoneyCell";
import { DateCell } from "@/components/ui/orca-table/cells/DateCell";
import { formatLeadStatus, formatTaskStatus, formatTourStatus, formatOfferStatus, formatOpportunityStatus } from "@/lib/ui-status";
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
    { header: isArabic ? "الحالة" : "Status", accessor: (l: LeadItem) => <StatusCell status={l.stage} format={formatLeadStatus} />, headerClassName: "text-center" },
    { header: isArabic ? "المصدر" : "Source", accessor: (l: LeadItem) => <span className="text-xs text-[var(--nc-text-dim)]">{l.source || "—"}</span> },
    { header: isArabic ? "آخر تواصل" : "Last Contact", accessor: () => <DateCell value={new Date().toISOString()} /> },
    { header: isArabic ? "المسؤول" : "Owner", accessor: (l: LeadItem) => <span className="text-xs">{l.assignedTo || "—"}</span> },
    { header: isArabic ? "القيمة" : "Value", accessor: (l: LeadItem) => <span className="font-mono text-xs">{l.leadScore}/100</span> },
  ] as Column<LeadItem>[];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[var(--nc-text-dim)]">{isArabic ? "جاري التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-4" style={{ height: "calc(100vh - 76px)", maxWidth: 1600, margin: "0 auto" }} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0" style={{ height: 104 }}>
        <SmartCard elevation="elevated" className="p-4 flex flex-col justify-between overflow-hidden">
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "إجمالي العملاء" : "Total Leads"}</span>
          <span className="text-3xl font-black">{totalLeads}</span>
          <span className="text-xs text-[var(--nc-text-dim)] truncate">10 صفوف ظاهرة قبل Pagination</span>
        </SmartCard>
        <SmartCard elevation="elevated" className="p-4 flex flex-col justify-between overflow-hidden">
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "عملاء جدد" : "New Leads"}</span>
          <span className="text-3xl font-black">{newLeads}</span>
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "ارتفاع ثابت لكل كرت" : "Fixed height"}</span>
        </SmartCard>
        <SmartCard elevation="elevated" className="p-4 flex flex-col justify-between overflow-hidden">
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "عملاء مؤهلون" : "Qualified"}</span>
          <span className="text-3xl font-black">{qualified}</span>
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "كرت موحد المقاس" : "Equal height"}</span>
        </SmartCard>
        <SmartCard elevation="elevated" className="p-4 flex flex-col justify-between overflow-hidden">
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "معدل التحويل" : "Conversion"}</span>
          <span className="text-3xl font-black">{totalLeads > 0 ? Math.round((stageCounts["Closed"] || 0) / totalLeads * 100) : 0}%</span>
          <span className="text-xs text-[var(--nc-text-dim)] truncate">{isArabic ? "لا يتمدد الكرت" : "Fixed height"}</span>
        </SmartCard>
      </div>

      {/* Master-Detail Workspace */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: "minmax(0, 0.46fr) minmax(0, 0.54fr)" }}>
        {/* Master Table */}
        <SmartCard elevation="default" className="flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--nc-glass-border)] flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-base">{isArabic ? "قائمة العملاء" : "Leads List"}</h3>
            <span className="text-xs text-[var(--nc-text-dim)]">{totalLeads} {isArabic ? "عميل" : "leads"}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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
                  <div className="min-w-0">
                    <h4 className="font-black text-lg truncate">{selectedLead.firstName} {selectedLead.lastName || ""}</h4>
                    <p className="text-xs text-[var(--nc-text-dim)] truncate">{selectedLead.city || ""} · {selectedLead.source || ""}</p>
                  </div>
                  <StatusCell status={selectedLead.stage} format={formatLeadStatus} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-11 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-3 flex flex-col justify-center overflow-hidden">
                    <span className="text-[9px] text-[var(--nc-text-dim)] truncate">{isArabic ? "النقاط" : "Score"}</span>
                    <span className="text-sm font-bold truncate">{selectedLead.leadScore || "—"}</span>
                  </div>
                  <div className="h-11 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-3 flex flex-col justify-center overflow-hidden">
                    <span className="text-[9px] text-[var(--nc-text-dim)] truncate">{isArabic ? "المدينة" : "City"}</span>
                    <span className="text-sm font-bold truncate">{selectedLead.city || "—"}</span>
                  </div>
                  <div className="h-11 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-3 flex flex-col justify-center overflow-hidden">
                    <span className="text-[9px] text-[var(--nc-text-dim)] truncate">{isArabic ? "المصدر" : "Source"}</span>
                    <span className="text-sm font-bold truncate">{selectedLead.source || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-3 py-2 border-b border-[var(--nc-glass-border)] shrink-0 flex-wrap" style={{ maxHeight: 80, overflow: 'hidden' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors ${
                      detailTab === tab.id
                        ? 'bg-[var(--nc-foreground)] text-[var(--nc-bg)] border-[var(--nc-foreground)]'
                        : 'bg-[var(--nc-surface)] border-[var(--nc-glass-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Detail Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                {detailTab === "summary" && (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {[
                      { title: isArabic ? "بيانات العميل" : "Lead Info", body: `${selectedLead.firstName} ${selectedLead.lastName || ""} · ${selectedLead.city || ""} · ${selectedLead.source || "—"}` },
                      { title: isArabic ? "آخر نشاط" : "Last Activity", body: (detailData as any)?.updatedAt ? new Date((detailData as any).updatedAt).toLocaleDateString('ar-SA') : "—" },
                      { title: isArabic ? "الفرصة الحالية" : "Current Opportunity", body: (detailData as any)?.leadScore ? `${(detailData as any).leadScore}/100` : "—" },
                      { title: isArabic ? "إجراء قادم" : "Next Action", body: selectedLead.stage || "—" },
                    ].map((card, i) => (
                      <div key={i} className="border border-[var(--nc-glass-border)] rounded-2xl bg-[var(--nc-surface)] p-4 flex flex-col justify-between overflow-hidden" style={{ height: 148 }}>
                        <div>
                          <h4 className="font-bold text-sm mb-2 truncate">{card.title}</h4>
                          <p className="text-xs text-[var(--nc-text-dim)] line-clamp-3">{card.body}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--nc-glass-border)]">
                          <StatusCell status={selectedLead.stage} format={formatLeadStatus} activeClass="bg-emerald-500/10 text-emerald-400" badgeClass="bg-blue-500/10 text-blue-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === "pipeline" && (
                  <div className="space-y-2">
                    {STAGES.map(stage => {
                      const count = stageCounts[stage.id] || 0;
                      return (
                        <div key={stage.id} className="h-14 border border-[var(--nc-glass-border)] rounded-xl bg-[var(--nc-surface)] px-4 flex items-center justify-between">
                          <span className="font-bold text-sm">{lang === 'AR' ? stage.titleAr : stage.titleEn}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--nc-text-dim)]">{count} {isArabic ? "عميل" : "leads"}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">{count}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!["summary", "pipeline"].includes(detailTab) && (
                  <div className="flex items-center justify-center h-40 border border-dashed border-[var(--nc-glass-border)] rounded-2xl text-[var(--nc-text-dim)] text-sm">
                    {isArabic ? "هذا التبويب قيد التطوير" : "Tab under development"}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--nc-text-dim)] text-sm">
              {isArabic ? "اختر عميلاً من الجدول لعرض التفاصيل" : "Select a lead to view details"}
            </div>
          )}
        </SmartCard>
      </div>
    </div>
  );
}
