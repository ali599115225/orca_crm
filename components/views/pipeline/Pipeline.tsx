// components/views/pipeline/Pipeline.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "react-beautiful-dnd";

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

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [loading, setLoading] = useState(true);

  // Load leads from API
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

  // Apply filters client-side
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

  // Handle lead move
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // Update local state immediately for smooth UI transition
    const movedLead = leads.find(l => l.id === draggableId);
    if (!movedLead) return;

    const targetStage = destination.droppableId;
    setLeads(prev =>
      prev.map(l => (l.id === draggableId ? { ...l, stage: targetStage } : l))
    );

    // Persist movement to DB
    try {
      await fetch(`/api/v1/leads/${draggableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage: targetStage }),
      });
    } catch (e) {
      console.error("Failed to persist stage move:", e);
      // Rollback on failure
      loadLeads();
    }
  };

  // Group leads by stage for Kanban
  const getLeadsByStage = (stageId: string) => {
    return filteredLeads.filter(l => (l.stage || "New") === stageId);
  };

  // Unique projects, sources, agents for filters
  const uniqueProjects = Array.from(new Set(leads.map(l => l.projectId).filter(Boolean)));
  const uniqueSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean)));
  const uniqueAgents = Array.from(new Set(leads.map(l => l.assignedTo).filter(Boolean)));

  return (
    <div className="tab-pane bg-brand-panel/20 border border-brand-border p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-brand-text-primary font-bold text-lg mb-1">لوحة متابعة الصفقات Kanban Pipeline</h3>
          <p className="text-brand-text-secondary text-xs">سحب وإفلات لفرز العملاء عبر المراحل مع مزامنة فورية وسجلات تدقيق</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-brand-panel border border-brand-border rounded px-2.5 py-2 text-brand-text-primary focus:border-brand-interactive/50 focus:outline-none"
          >
            <option value="" className="bg-[#1C2B48] text-brand-text-primary">كل المشاريع</option>
            {uniqueProjects.map((p, idx) => (
              <option key={idx} value={p as string} className="bg-[#1C2B48] text-brand-text-primary">مشروع {p}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-brand-panel border border-brand-border rounded px-2.5 py-2 text-brand-text-primary focus:border-brand-interactive/50 focus:outline-none"
          >
            <option value="" className="bg-[#1C2B48] text-brand-text-primary">كل القنوات</option>
            {uniqueSources.map((s, idx) => (
              <option key={idx} value={s as string} className="bg-[#1C2B48] text-brand-text-primary">{s}</option>
            ))}
          </select>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-brand-panel border border-brand-border rounded px-2.5 py-2 text-brand-text-primary focus:border-brand-interactive/50 focus:outline-none"
          >
            <option value="" className="bg-[#1C2B48] text-brand-text-primary">كل الوكلاء</option>
            {uniqueAgents.map((a, idx) => (
              <option key={idx} value={a as string} className="bg-[#1C2B48] text-brand-text-primary">وكيل {a}</option>
            ))}
          </select>
          <button onClick={loadLeads} className="bg-brand-interactive/20 hover:bg-brand-interactive/30 text-brand-interactive px-3 py-1 rounded border border-brand-interactive/30 cursor-pointer transition-colors">
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-brand-text-secondary animate-pulse">جاري تحميل بيانات العملاء...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-4 items-stretch select-none">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col bg-brand-panel/40 border border-brand-border rounded-xl w-full lg:min-w-[260px] lg:max-w-[260px] p-4 transition-colors ${
                        snapshot.isDraggingOver ? "bg-brand-interactive/10 border-brand-interactive/35" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-brand-border text-xs font-bold text-brand-text-primary">
                        <span>{stage.title}</span>
                        <span className="bg-brand-interactive/20 text-brand-interactive px-2 py-1 rounded-full font-en">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3 min-h-[180px] lg:min-h-[380px] max-h-[500px] overflow-y-auto custom-scrollbar">
                        {stageLeads.map((lead, index) => (
                          <Draggable draggableId={lead.id} index={index} key={lead.id}>
                            {(providedDraggable: any, snapshotDraggable: any) => (
                              <div
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                                className={`bg-brand-panel border border-brand-border rounded-xl p-4 shadow-md hover:border-brand-interactive/40 transition-all cursor-grab active:cursor-grabbing ${
                                  snapshotDraggable.isDragging ? "shadow-2xl border-brand-interactive bg-brand-bg/90" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-brand-text-primary text-xs font-bold">
                                    {lead.firstName} {lead.lastName || ""}
                                  </h4>
                                  <span className={`text-xs px-2 py-1 rounded font-bold font-en ${
                                    lead.leadScore >= 75
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : lead.leadScore >= 50
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-slate-500/10 text-[#C4D8E5] font-medium"
                                  }`}>
                                    {lead.leadScore}%
                                  </span>
                                </div>
                                <div className="text-xs text-brand-text-secondary space-y-1">
                                  <div>المصدر: <span className="text-brand-text-primary font-semibold">{lead.source}</span></div>
                                  {lead.city && <div>المدينة: <span className="text-brand-text-primary font-semibold">{lead.city}</span></div>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-brand-border/40 rounded-xl bg-brand-panel/20 select-none">
                            <span className="text-xs text-brand-text-secondary mb-2">لا يوجد عملاء</span>
                            <button
                              onClick={() => {
                                alert("إضافة عميل جديد إلى مرحلة " + stage.title);
                              }}
                              className="text-brand-interactive hover:text-brand-interactive-hover text-xs font-bold flex items-center gap-1 transition-all cursor-pointer bg-brand-panel border border-brand-border hover:border-brand-interactive/40 px-2 py-1 rounded"
                            >
                              <span>+ إضافة عميل</span>
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
