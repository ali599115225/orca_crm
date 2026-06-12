"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useApp } from "@/app/context/AppContext";
import type { LeadItem } from "./KanbanCard";

const STAGES = [
  { id: "New", titleAr: "جديد", titleEn: "New" },
  { id: "Contacted", titleAr: "تم التواصل", titleEn: "Contacted" },
  { id: "Qualified", titleAr: "مؤهل", titleEn: "Qualified" },
  { id: "Tour Scheduled", titleAr: "مجدول للزيارة", titleEn: "Tour Scheduled" },
  { id: "Offer Sent", titleAr: "أرسل العرض", titleEn: "Offer Sent" },
  { id: "Negotiation", titleAr: "تفاوض", titleEn: "Negotiation" },
  { id: "Closed", titleAr: "مغلق", titleEn: "Closed" },
];

const STAGE_ACCENT: Record<string, string> = {
  New: "#3B82F6", Contacted: "#0EA5E9", Qualified: "#8B5CF6",
  "Tour Scheduled": "#F59E0B", "Offer Sent": "#EC4899",
  Negotiation: "#F97316", Closed: "#22C55E",
};

const MOCK_NAMES = [
  { first: "عبدالرحمن", last: "المالكي" }, { first: "سلطان", last: "العتيبي" },
  { first: "فهد", last: "الدوسري" }, { first: "تركي", last: "الشمراني" },
  { first: "بدر", last: "القحطاني" }, { first: "ماجد", last: "الزهراني" },
  { first: "خالد", last: "الحربي" }, { first: "ناصر", last: "الغامدي" },
  { first: "سعود", last: "السديري" }, { first: "عمر", last: "الشمري" },
  { first: "يوسف", last: "المطيري" }, { first: "راشد", last: "البقمي" },
  { first: "حمد", last: "البلوي" }, { first: "مشعل", last: "العتيبي" },
  { first: "وليد", last: "الأحمدي" }, { first: "عبدالعزيز", last: "الفهيد" },
  { first: "صالح", last: "الراجحي" }, { first: "محمد", last: "العمري" },
  { first: "أحمد", last: "السبيعي" }, { first: "إبراهيم", last: "الموسى" },
  { first: "سامي", last: "الحازمي" }, { first: "نايف", last: "الشمري" },
  { first: "عبدالله", last: "الغامدي" }, { first: "فيصل", last: "الزهراني" },
  { first: "موسى", last: "القحطاني" }, { first: "هاني", last: "الدوسري" },
  { first: "وائل", last: "الحربي" }, { first: "جابر", last: "العتيبي" },
  { first: "سعد", last: "المطيري" }, { first: "فواز", last: "الشهري" },
  { first: "نواف", last: "الرشيد" }, { first: "عاصم", last: "البلوي" },
];
const MOCK_SRC = ["إعلانات سناب", "حملة ميتا", "زيارة مباشرة", "إحالة عميل", "موقع إلكتروني", "واتساب", "إعلانات جوجل"];
const MOCK_CITIES = ["الرياض", "جدة", "الدمام", "مكة", "تبوك", "أبها", "الخبر"];

function genMockLeads(): LeadItem[] {
  const r: LeadItem[] = [];
  let idx = 0;
  for (const s of STAGES) {
    for (let i = 0; i < 6; i++) {
      const p = MOCK_NAMES[idx % MOCK_NAMES.length];
      r.push({ id: `mock_${s.id}_${i}`, firstName: p.first, lastName: p.last,
        city: MOCK_CITIES[i % MOCK_CITIES.length], source: MOCK_SRC[i % MOCK_SRC.length],
        leadScore: 40 + Math.floor(Math.random() * 55), stage: s.id, projectId: null,
        assignedTo: ["رائد", "فواز", "عبدالرحمن", "سعود", "عمر", "بدر"][i % 6] });
      idx++;
    }
  }
  return r;
}
const DEF_MOCK = genMockLeads();

export default function LeadsPipelineV2({ wiredFilter }: { wiredFilter?: string | null }) {
  const router = useRouter();
  const { t, lang } = useApp();
  const [leads, setLeads] = useState<LeadItem[]>(DEF_MOCK);
  const [filtered, setFiltered] = useState<LeadItem[]>(DEF_MOCK);
  const [selLead, setSelLead] = useState<LeadItem | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState("overview");
  const [filterSource, setFilterSource] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [detailData, setDetailData] = useState<any>(null);

  const loadLeads = async () => {
    try {
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const merged = [...json.data];
        for (const s of STAGES) {
          const real = json.data.filter((l: LeadItem) => (l.stage || "New") === s.id);
          const need = 6 - real.length;
          for (let i = 0; i < need; i++) {
            const m = DEF_MOCK.find(l => l.stage === s.id && !merged.some(x => x.id === l.id));
            if (m) merged.push({ ...m, id: `${m.id}_${Date.now()}_${i}` });
          }
        }
        setLeads(merged);
      }
    } catch {}
  };

  useEffect(() => { loadLeads(); }, []);
  useEffect(() => {
    let r = leads;
    if (filterAgent) r = r.filter(l => l.assignedTo?.includes(filterAgent));
    if (filterSource) r = r.filter(l => l.source.includes(filterSource));
    // ── Apply wiredFilter from LeadsTabs chips ──
    if (wiredFilter === "highProb") r = r.filter(l => l.leadScore >= 75);
    if (wiredFilter === "dueToday") r = r.filter(l => l.leadScore > 60);
    if (wiredFilter === "active") r = r.filter(l => l.stage !== "Closed" && l.stage !== "New");
    // "total" shows all — no filter needed
    setFiltered(r);
  }, [leads, filterSource, filterAgent, wiredFilter]);

  const stageLeads = (stage: string) => filtered.filter(l => l.stage === stage);
  const toggle = (stage: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(stage) ? next.delete(stage) : next.add(stage);
    return next;
  });

  const handleSelect = async (lead: LeadItem) => {
    setSelLead(lead);
    try {
      const res = await fetch(`/api/v1/leads`);
      const json = await res.json();
      const found = (json.data || []).find((l: any) => l.id === lead.id);
      setDetailData(found || lead);
    } catch { setDetailData(lead); }
  };

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const moved = leads.find(l => l.id === draggableId);
    if (!moved) return;
    const optimistic = leads.map(l => l.id === draggableId ? { ...l, stage: destination.droppableId } : l);
    setLeads(optimistic);
    if (!draggableId.startsWith("mock_")) {
      try {
        await fetch(`/api/v1/leads/${draggableId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: destination.droppableId }),
        });
      } catch { loadLeads(); }
    }
  };

  return (
    <div style={{ height: "calc(100vh - 160px)", display: "flex", flexDirection: "column", gap: 0 }}>
      <STYLES />
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Filter Bar — Source + Agent dropdowns only (chips are in LeadsTabs) */}
        <div className="lv2-actionbar">
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="lv2-filter">
            <option value="">{t("leads.filterSource")}</option>
            {MOCK_SRC.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="lv2-filter">
            <option value="">{t("leads.filterOwner")}</option>
            {["رائد", "فواز", "عبدالرحمن", "سعود", "عمر", "بدر"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="lv2-action-item lv2-action-info" style={{ marginLeft: 'auto', cursor: 'default' }}>
            <span className="lv2-action-num">{filtered.length}</span>
            <span className="lv2-action-lbl">{t("leads.totalLeads")}</span>
          </span>
        </div>

        {/* Main split */}
        <div className="lv2-main">
          {/* Left: Pipeline List */}
          <div className="lv2-pipeline">
            {STAGES.map(stage => (
              <div key={stage.id} className="lv2-stage">
                <div className="lv2-stage-header" onClick={() => toggle(stage.id)}>
                  <div className="lv2-stage-left">
                    <span className="lv2-dot" style={{ background: STAGE_ACCENT[stage.id] }} />
                    <span className="lv2-stage-title">{lang === "AR" ? stage.titleAr : stage.titleEn}</span>
                    <span className="lv2-stage-count">{stageLeads(stage.id).length}</span>
                  </div>
                  <span className={`lv2-chevron${collapsed.has(stage.id) ? "" : " lv2-chevron-open"}`}>▾</span>
                </div>
                {!collapsed.has(stage.id) && (
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`lv2-stage-body${snapshot.isDraggingOver ? " lv2-stage-dragover" : ""}`}>
                        {stageLeads(stage.id).map((lead, i) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={i}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                className={`lv2-lead${snapshot.isDragging ? " lv2-lead-drag" : ""}${selLead?.id === lead.id ? " lv2-lead-sel" : ""}`}
                                onClick={() => handleSelect(lead)}>
                                <div className="lv2-lead-meta">
                                  <span className="lv2-lead-name">{lead.firstName} {lead.lastName || ""}</span>
                                  <span className="lv2-lead-score" style={{
                                    color: lead.leadScore >= 75 ? "#22C55E" : lead.leadScore >= 50 ? "#F59E0B" : "#94A3B8"
                                  }}>{lead.leadScore}</span>
                                </div>
                                <div className="lv2-lead-sub">
                                  <span>{lead.source}</span>
                                  <span>·</span>
                                  <span>{lead.city}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            ))}
          </div>

          {/* Right: Detail Panel */}
          <div className="lv2-detail">
            {!selLead ? (
              <div className="lv2-empty">{t("leads.selectLeadHint")}</div>
            ) : (
              <>
                <div className="lv2-detail-header">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <h3 className="lv2-detail-name">{selLead.firstName} {selLead.lastName || ""}</h3>
                    <span className="lv2-detail-score" style={{ background: (detailData?.leadScore || selLead.leadScore) >= 75 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", borderColor: (detailData?.leadScore || selLead.leadScore) >= 75 ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)" }}>
                      {detailData?.leadScore || selLead.leadScore}
                    </span>
                  </div>
                  {/* ── Cross-module Action Buttons ── */}
                  <div className="lv2-actions">
                    {(() => {
                      const d = detailData as any;
                      const lid = selLead.id;
                      const lname = `${selLead.firstName} ${selLead.lastName || ""}`.trim();
                      const lphone = d?.phone || "";
                      const lemail = d?.email || "";
                      return (
                        <>
                    <a href={`tel:${lphone}`} className={`lv2-act-btn ${!lphone ? "lv2-act-disabled" : ""}`} title={!lphone ? t("action.noPhone") : t("action.call")}>
                      <span className="lv2-act-icon">📞</span><span className="lv2-act-label">{t("action.call")}</span>
                    </a>
                    <button onClick={() => router.push(`/operations/whatsapp?leadId=${lid}&phone=${encodeURIComponent(lphone)}&name=${encodeURIComponent(lname)}`)} className="lv2-act-btn lv2-act-soon" title={t("action.whatsappPending")}>
                      <span className="lv2-act-icon">💬</span><span className="lv2-act-label">{t("action.whatsapp")}</span>
                      <span className="lv2-act-badge">{t("action.whatsappPending")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/email?leadId=${lid}&email=${encodeURIComponent(lemail)}&name=${encodeURIComponent(lname)}`)} className={`lv2-act-btn ${!lemail ? "lv2-act-disabled" : ""}`} title={!lemail ? t("action.noEmail") : t("action.email")}>
                      <span className="lv2-act-icon">✉️</span><span className="lv2-act-label">{t("action.email")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/tasks?leadId=${lid}&name=${encodeURIComponent(lname)}`)} className="lv2-act-btn">
                      <span className="lv2-act-icon">✅</span><span className="lv2-act-label">{t("action.task")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/tours?leadId=${lid}&name=${encodeURIComponent(lname)}`)} className="lv2-act-btn">
                      <span className="lv2-act-icon">🗺️</span><span className="lv2-act-label">{t("action.tour")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/offers?leadId=${lid}&name=${encodeURIComponent(lname)}`)} className="lv2-act-btn">
                      <span className="lv2-act-icon">📋</span><span className="lv2-act-label">{t("action.offer")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/leads?tab=opportunities&leadId=${lid}`)} className="lv2-act-btn">
                      <span className="lv2-act-icon">🎯</span><span className="lv2-act-label">{t("action.opportunity")}</span>
                    </button>
                    <button onClick={() => router.push(`/operations/rental?leadId=${lid}&name=${encodeURIComponent(lname)}`)} className="lv2-act-btn lv2-act-soon" title={t("action.contractPending")}>
                      <span className="lv2-act-icon">📄</span><span className="lv2-act-label">{t("action.contract")}</span>
                    </button>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => router.push(`/operations/leads/${selLead.id}`)}
                    style={{
                      padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                      background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: "6px", color: "#3B82F6", cursor: "pointer", marginTop: "8px",
                    }}
                  >
                    {t("leads.viewDetails") || (lang === "AR" ? "عرض التفاصيل الكاملة" : "View Full Details")} →
                  </button>
                </div>
                <div className="lv2-detail-meta">
                  <span>{selLead.city}</span><span>·</span><span>{selLead.source}</span><span>·</span><span>{selLead.assignedTo || t("leads.filterOwner")}</span>
                </div>
                <div className="lv2-tabs">
                  {["overview", "notes", "tasks", "activities"].map(tab => (
                    <button key={tab} onClick={() => setDetailTab(tab)}
                      className={`lv2-tab${detailTab === tab ? " lv2-tab-active" : ""}`}>
                      {lang === "AR" ? { overview: "نظرة عامة", notes: "ملاحظات", tasks: "مهام", activities: "نشاطات" }[tab] : { overview: "Overview", notes: "Notes", tasks: "Tasks", activities: "Activities" }[tab]}
                    </button>
                  ))}
                </div>
                <div className="lv2-detail-body">
                  {detailTab === "overview" && (
                    <div className="lv2-overview">
                      <div className="lv2-field"><label>{t("lead.stage")}</label><span>{selLead.stage}</span></div>
                      <div className="lv2-field"><label>{t("lead.city")}</label><span>{selLead.city}</span></div>
                      <div className="lv2-field"><label>{t("lead.source")}</label><span>{selLead.source}</span></div>
                      <div className="lv2-field"><label>{t("lead.score")}</label><span>{selLead.leadScore}</span></div>
                      <div className="lv2-field"><label>{t("lead.assignedTo")}</label><span>{selLead.assignedTo || "—"}</span></div>
                      <div className="lv2-field"><label>ID</label><span className="lv2-mono">{selLead.id}</span></div>
                    </div>
                  )}
                  {detailTab === "notes" && <div className="lv2-placeholder">{lang === "AR" ? "الملاحظات تظهر هنا" : "Notes will appear here"}</div>}
                  {detailTab === "tasks" && <div className="lv2-placeholder">{lang === "AR" ? "المهام تظهر هنا" : "Tasks will appear here"}</div>}
                  {detailTab === "activities" && <div className="lv2-placeholder">{lang === "AR" ? "النشاطات تظهر هنا" : "Activities will appear here"}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

const STYLES = () => (
  <style>{`
    .lv2-actionbar { display:flex; align-items:center; gap:8px; padding:8px 0; flex-shrink:0; }
    .lv2-action-item { display:flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; }
    .lv2-action-warn { background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.12); color:#F59E0B; }
    .lv2-action-hot { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.12); color:#EF4444; }
    .lv2-action-stale { background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.12); color:#3B82F6; }
    .lv2-action-info { background:rgba(148,163,184,0.06); border:1px solid rgba(148,163,184,0.12); color:#94A3B8; }
    .lv2-action-num { font-family:monospace; font-weight:800; font-size:15px; }
    .lv2-action-lbl { font-size:10px; opacity:0.8; white-space:nowrap; }
    .lv2-filter-spacer { flex:1; }
    .lv2-filter { padding:4px 8px; border-radius:6px; background:rgba(15,23,42,0.6); border:1px solid rgba(36,50,72,0.4); color:#CBD5E1; font-size:10px; outline:none; font-family:inherit; }

    .lv2-main { display:flex; flex:1; min-height:0; gap:0; border:1px solid rgba(36,50,72,0.3); border-radius:12px; overflow:hidden; }
    .lv2-pipeline { width:30%; min-width:240px; overflow-y:auto; background:rgba(15,23,42,0.4); border-right:1px solid rgba(36,50,72,0.3); }
    .lv2-detail { flex:1; overflow-y:auto; background:rgba(15,23,42,0.2); padding:16px; }
    @media(max-width:900px){ .lv2-pipeline{width:40%;min-width:180px;} }
    @media(max-width:640px){ .lv2-main{flex-direction:column;}
      .lv2-pipeline{width:100%;max-height:40vh;border-right:none;border-bottom:1px solid rgba(36,50,72,0.3);}
      .lv2-detail{flex:none;min-height:50vh;} }

    .lv2-stage { border-bottom:1px solid rgba(36,50,72,0.15); }
    .lv2-stage-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; cursor:pointer; font-size:12px; font-weight:700; color:#CBD5E1; }
    .lv2-stage-header:hover { background:rgba(201,169,110,0.03); }
    .lv2-stage-left { display:flex; align-items:center; gap:8px; }
    .lv2-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .lv2-stage-title { text-transform:uppercase; letter-spacing:0.5px; font-size:11px; }
    .lv2-stage-count { font-size:10px; color:#64748B; font-weight:600; }
    .lv2-chevron { color:#64748B; font-size:10px; transition:transform 0.2s; }
    .lv2-chevron-open { transform:rotate(180deg); }

    /* Cross-module action buttons */
    .lv2-actions { display:flex; flex-wrap:wrap; gap:6px; padding:8px 0; border-top:1px solid rgba(36,50,72,0.2); border-bottom:1px solid rgba(36,50,72,0.2); margin:8px 0; }
    .lv2-act-btn { display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 10px; border-radius:8px; background:rgba(15,23,42,0.5); border:1px solid rgba(36,50,72,0.3); color:#CBD5E1; font-size:10px; cursor:pointer; transition:all 0.15s; min-width:58px; }
    .lv2-act-btn:hover { border-color:rgba(201,169,110,0.3); background:rgba(201,169,110,0.05); }
    .lv2-act-disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
    .lv2-act-soon { opacity:0.6; }
    .lv2-act-icon { font-size:14px; }
    .lv2-act-label { font-weight:700; font-size:9px; }
    .lv2-act-badge { font-size:7px; font-weight:800; padding:1px 4px; border-radius:99px; background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.2); }

    .lv2-stage-body { padding:4px 8px; min-height:8px; }
    .lv2-stage-dragover { background:rgba(201,169,110,0.03); }
    .lv2-lead { padding:7px 10px; margin-bottom:4px; border-radius:6px; background:rgba(15,23,42,0.6); border:1px solid rgba(36,50,72,0.2); cursor:pointer; transition:all 0.15s; }
    .lv2-lead:hover { border-color:rgba(201,169,110,0.2); background:rgba(201,169,110,0.03); }
    .lv2-lead-drag { box-shadow:0 4px 16px rgba(0,0,0,0.3); border-color:rgba(201,169,110,0.3); z-index:50; }
    .lv2-lead-sel { border-color:rgba(201,169,110,0.3); background:rgba(201,169,110,0.04); }
    .lv2-lead-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; }
    .lv2-lead-name { font-size:12px; font-weight:700; color:#FFFFFF; }
    .lv2-lead-score { font-size:11px; font-weight:800; font-family:monospace; }
    .lv2-lead-sub { display:flex; align-items:center; gap:4px; font-size:10px; color:#64748B; }

    .lv2-empty { display:flex; align-items:center; justify-content:center; height:100%; color:#475569; font-size:13px; }
    .lv2-detail-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .lv2-detail-name { font-size:18px; font-weight:800; color:#FFFFFF; }
    .lv2-detail-score { padding:3px 12px; border-radius:99px; font-size:13px; font-weight:800; font-family:monospace; border:1px solid; }
    .lv2-detail-meta { display:flex; align-items:center; gap:6px; font-size:11px; color:#64748B; margin-bottom:16px; }
    .lv2-tabs { display:flex; gap:2px; margin-bottom:16px; border-bottom:1px solid rgba(36,50,72,0.3); }
    .lv2-tab { padding:6px 14px; font-size:11px; font-weight:600; color:#64748B; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; }
    .lv2-tab:hover { color:#CBD5E1; }
    .lv2-tab-active { color:#C9A96E; border-bottom-color:#C9A96E; }
    .lv2-detail-body { padding:4px 0; }
    .lv2-overview { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .lv2-field { display:flex; flex-direction:column; gap:2px; }
    .lv2-field label { font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; }
    .lv2-field span { font-size:13px; color:#CBD5E1; }
    .lv2-mono { font-family:monospace; font-size:11px; color:#475569; }
    .lv2-placeholder { display:flex; align-items:center; justify-content:center; padding:40px; color:#475569; font-size:12px; }
  `}</style>
);
