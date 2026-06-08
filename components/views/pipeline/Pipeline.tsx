"use client";

import { useState, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import type { LeadItem } from "./KanbanCard";

const stages = [
  { id: "New", title: "جديد" },
  { id: "Contacted", title: "تم التواصل" },
  { id: "Qualified", title: "مؤهل" },
  { id: "Tour Scheduled", title: "مجدول للزيارة" },
  { id: "Offer Sent", title: "أرسل العرض" },
  { id: "Negotiation", title: "تفاوض" },
  { id: "Closed", title: "مغلق" },
];

const stageAccent: Record<string, string> = {
  "New": "#3B82F6",
  "Contacted": "#0EA5E9",
  "Qualified": "#8B5CF6",
  "Tour Scheduled": "#F59E0B",
  "Offer Sent": "#EC4899",
  "Negotiation": "#F97316",
  "Closed": "#22C55E",
};

// ─── بيانات افتراضية لضمان 6 عملاء في كل عمود ───
const mockNames = [
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
  { first: "تامر", last: "السلمي" }, { first: "ياسر", last: "القرني" },
  { first: "أيمن", last: "الغامدي" }, { first: "بسام", last: "الهذلي" },
  { first: "زياد", last: "الخالدي" }, { first: "هشام", last: "العنزي" },
  { first: "رامي", last: "الحارثي" }, { first: "علي", last: "الزهراني" },
  { first: "حسن", last: "الشهري" }, { first: "عدنان", last: "المالكي" },
];

const mockSources = ["إعلانات سناب شات", "حملة ميتا", "زيارة مباشرة", "إحالة عميل", "موقع إلكتروني", "واتساب", "إعلانات جوجل", "معرض عقاري"];
const mockCities = ["الرياض", "جدة", "الدمام", "مكة", "تبوك", "أبها", "الخبر", "القصيم"];

function generateMockLeads(): LeadItem[] {
  const result: LeadItem[] = [];
  let idx = 0;
  for (const stage of stages) {
    for (let i = 0; i < 6; i++) {
      const person = mockNames[idx % mockNames.length];
      result.push({
        id: `mock_${stage.id}_${i}`,
        firstName: person.first,
        lastName: person.last,
        city: mockCities[Math.floor(Math.random() * mockCities.length)],
        source: mockSources[Math.floor(Math.random() * mockSources.length)],
        leadScore: 40 + Math.floor(Math.random() * 55),
        stage: stage.id,
        projectId: null,
        assignedTo: ["المستشار رائد", "المستشار فواز", "المستشار عبدالرحمن", "المستشار سعود", "المستشار عمر", "المستشار بدر"][Math.floor(Math.random() * 6)],
      });
      idx++;
    }
  }
  return result;
}

const DEFAULT_MOCK_LEADS = generateMockLeads();

export default function Pipeline() {
  const [leads, setLeads] = useState<LeadItem[]>(DEFAULT_MOCK_LEADS);
  const [filteredLeads, setFilteredLeads] = useState<LeadItem[]>(DEFAULT_MOCK_LEADS);
  const [filterProject, setFilterProject] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const merged = [...json.data];
        for (const stage of stages) {
          const stageReal = json.data.filter((l: LeadItem) => (l.stage || "New") === stage.id);
          const needed = 6 - stageReal.length;
          for (let i = 0; i < needed; i++) {
            const mockLead = DEFAULT_MOCK_LEADS.find(l => l.stage === stage.id && !merged.some(m => m.id === l.id));
            if (mockLead) {
              merged.push({ ...mockLead, id: `${mockLead.id}_${Date.now()}_${i}` });
            }
          }
        }
        setLeads(merged);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    let result = leads;
    if (filterProject) {
      result = result.filter(l => l.projectId === filterProject);
    }
    if (filterSource) {
      result = result.filter(l => l.source.includes(filterSource));
    }
    if (filterAgent) {
      result = result.filter(l => l.assignedTo === filterAgent);
    }
    setFilteredLeads(result);
  }, [leads, filterProject, filterSource, filterAgent]);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const movedLead = leads.find(l => l.id === draggableId);
    if (!movedLead) return;

    const targetStage = destination.droppableId;
    setLeads(prev =>
      prev.map(l => (l.id === draggableId ? { ...l, stage: targetStage } : l))
    );

    try {
      await fetch(`/api/v1/leads/${draggableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage: targetStage }),
      });
    } catch (e) {
      console.error("Failed to persist stage move:", e);
      loadLeads();
    }
  };

  const getLeadsByStage = (stageId: string) => {
    return filteredLeads.filter(l => (l.stage || "New") === stageId);
  };

  const uniqueProjects = Array.from(new Set(leads.map(l => l.projectId).filter(Boolean)));
  const uniqueSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean)));
  const uniqueAgents = Array.from(new Set(leads.map(l => l.assignedTo).filter(Boolean)));

  const filterSelectClass =
    "bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] rounded-[10px] px-2.5 py-2 text-[var(--nc-text-primary)] text-xs focus:border-[var(--nc-accent-border)] focus:outline-none transition-all appearance-none";

  return (
    <div className="nc-pipeline-wrapper">
      <div className="nc-header nc-enter" style={{ padding: '0 0 var(--space-md)' }}>
        <div className="nc-header-row">
          <div>
            <h1 className="nc-title">لوحة متابعة الصفقات</h1>
            <p className="nc-subtitle">سحب وإفلات لفرز العملاء عبر المراحل</p>
          </div>
          <div className="nc-row">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">كل المشاريع</option>
              {uniqueProjects.map((p, idx) => (
                <option key={idx} value={p as string} className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">مشروع {p}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">كل القنوات</option>
              {uniqueSources.map((s, idx) => (
                <option key={idx} value={s as string} className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">{s}</option>
              ))}
            </select>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">كل الوكلاء</option>
              {uniqueAgents.map((a, idx) => (
                <option key={idx} value={a as string} className="bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]">وكيل {a}</option>
              ))}
            </select>
            <button onClick={loadLeads} className="nc-btn nc-btn-outline nc-btn-sm">
              تحديث
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="nc-section">
          <div className="py-16 text-center text-xs text-[var(--nc-text-dim)] animate-pulse font-mono">
            جاري تحميل بيانات العملاء...
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="nc-pipeline">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={stageLeads}
                  accentColor={stageAccent[stage.id] || "var(--nc-accent)"}
                />
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
