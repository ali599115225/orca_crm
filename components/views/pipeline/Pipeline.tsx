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

export default function Pipeline() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadItem[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/leads");
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
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
