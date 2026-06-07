// components/views/pipeline/Pipeline.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

type Lead = {
  id: string;
  firstName: string;
  lastName: string | null;
  city: string;
  source: string;
  leadScore: number;
  stage: string;
  projectId: string | null;
  assignedTo: string | null;
};

const stages = [
  { id: "New", title: "جديد New" },
  { id: "Contacted", title: "تم التواصل Contacted" },
  { id: "Qualified", title: "مؤهل Qualified" },
  { id: "Tour Scheduled", title: "مجدول للزيارة Tour Scheduled" },
  { id: "Offer Sent", title: "أرسل العرض Offer Sent" },
  { id: "Negotiation", title: "تفاوض Negotiation" },
  { id: "Closed", title: "مغلق Closed" },
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
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
    "bg-white/5 border border-[rgba(0,229,255,0.08)] rounded-[10px] px-2.5 py-2 text-[#E2EEF5] text-xs focus:border-[rgba(0,229,255,0.3)] focus:outline-none transition-all appearance-none";

  const scoreClass = (score: number) =>
    score >= 75 ? "nc-badge nc-badge-danger" :
    score >= 50 ? "nc-badge nc-badge-warning" :
    "nc-badge nc-badge-accent";

  return (
    <div className="nc-pipeline-wrapper" style={{ width: '100%', overflow: 'hidden' }}>
      <div className="nc-header nc-enter" style={{ padding: '0 0 var(--space-md)' }}>
        <div className="nc-header-row">
          <div>
            <h1 className="nc-title">لوحة متابعة الصفقات Kanban Pipeline</h1>
            <p className="nc-subtitle">سحب وإفلات لفرز العملاء عبر المراحل مع مزامنة فورية</p>
          </div>
          <div className="nc-row">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[#0C1D2B] text-[#E2EEF5]">كل المشاريع</option>
              {uniqueProjects.map((p, idx) => (
                <option key={idx} value={p as string} className="bg-[#0C1D2B] text-[#E2EEF5]">مشروع {p}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[#0C1D2B] text-[#E2EEF5]">كل القنوات</option>
              {uniqueSources.map((s, idx) => (
                <option key={idx} value={s as string} className="bg-[#0C1D2B] text-[#E2EEF5]">{s}</option>
              ))}
            </select>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className="bg-[#0C1D2B] text-[#E2EEF5]">كل الوكلاء</option>
              {uniqueAgents.map((a, idx) => (
                <option key={idx} value={a as string} className="bg-[#0C1D2B] text-[#E2EEF5]">وكيل {a}</option>
              ))}
            </select>
            <button
              onClick={loadLeads}
              className="nc-btn nc-btn-outline nc-btn-sm"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="nc-section">
          <div className="py-16 text-center text-xs text-[#7BA3C0] animate-pulse font-mono">
            جاري تحميل بيانات العملاء...
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="nc-pipeline">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`nc-stage${snapshot.isDraggingOver ? " drag-over" : ""}`}
                    >
                      <div className="nc-stage-header">
                        <span className="nc-stage-title" style={{ color: stageAccent[stage.id] || "#E2EEF5" }}>
                          {stage.title}
                        </span>
                        <span className="nc-stage-count">{stageLeads.length}</span>
                      </div>

                      <div className="flex-1 space-y-2 min-h-[180px] lg:min-h-[380px] max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {stageLeads.map((lead, index) => (
                          <Draggable draggableId={lead.id} index={index} key={lead.id}>
                            {(d: any, s: any) => (
                              <div
                                ref={d.innerRef}
                                {...d.draggableProps}
                                {...d.dragHandleProps}
                                className={`nc-lead${s.isDragging ? " dragging" : ""}`}
                                style={{
                                  ...d.draggableProps.style,
                                  "--stage-accent": stageAccent[lead.stage] || "#00E5FF",
                                } as React.CSSProperties}
                              >
                                <div className="nc-content-between mb-1">
                                  <span className="nc-lead-name">
                                    {lead.firstName} {lead.lastName || ""}
                                  </span>
                                  <span className={scoreClass(lead.leadScore)}>
                                    {lead.leadScore}%
                                  </span>
                                </div>
                                <div className="nc-lead-meta">
                                  المصدر: <span className="nc-text-primary font-semibold">{lead.source}</span>
                                  {lead.city && <> &middot; {lead.city}</>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-[rgba(0,229,255,0.06)] rounded-xl select-none">
                            <span className="text-xs text-[#7BA3C0] mb-2">لا يوجد عملاء</span>
                            <button
                              onClick={() => alert("إضافة عميل جديد إلى مرحلة " + stage.title)}
                              className="nc-btn nc-btn-ghost nc-btn-sm"
                            >
                              + إضافة عميل
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
