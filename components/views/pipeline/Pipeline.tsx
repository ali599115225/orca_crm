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
    <div className="tab-pane bg-[#021324] border border-[#0ea5e9]/10 p-5 rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-white font-bold text-lg mb-1">لوحة متابعة الصفقات Kanban Pipeline</h3>
          <p className="text-slate-400 text-xs">سحب وإفلات لفرز العملاء عبر المراحل مع مزامنة فورية وسجلات تدقيق</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#042A44] border border-slate-700/80 rounded px-2.5 py-1.5 text-white"
          >
            <option value="">كل المشاريع</option>
            {uniqueProjects.map((p, idx) => (
              <option key={idx} value={p as string}>مشروع {p}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-[#042A44] border border-slate-700/80 rounded px-2.5 py-1.5 text-white"
          >
            <option value="">كل القنوات</option>
            {uniqueSources.map((s, idx) => (
              <option key={idx} value={s as string}>{s}</option>
            ))}
          </select>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-[#042A44] border border-slate-700/80 rounded px-2.5 py-1.5 text-white"
          >
            <option value="">كل الوكلاء</option>
            {uniqueAgents.map((a, idx) => (
              <option key={idx} value={a as string}>وكيل {a}</option>
            ))}
          </select>
          <button onClick={loadLeads} className="bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] px-3 py-1 rounded border border-[#0ea5e9]/30">
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">جاري تحميل بيانات العملاء...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 items-stretch select-none">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col bg-[#042A44]/40 border border-[#0ea5e9]/5 rounded-xl min-w-[260px] max-w-[260px] p-3 transition-colors ${
                        snapshot.isDraggingOver ? "bg-[#0ea5e9]/5 border-[#0ea5e9]/20" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700/40 text-xs font-bold text-white">
                        <span>{stage.title}</span>
                        <span className="bg-[#0ea5e9]/20 text-[#0ea5e9] px-2 py-0.5 rounded-full font-en">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3 min-h-[380px] max-h-[500px] overflow-y-auto custom-scrollbar">
                        {stageLeads.map((lead, index) => (
                          <Draggable draggableId={lead.id} index={index} key={lead.id}>
                            {(providedDraggable: any, snapshotDraggable: any) => (
                              <div
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                                className={`bg-[#042A44] border border-slate-800 rounded-xl p-3 shadow-md hover:border-[#df7b62]/40 transition-all cursor-grab active:cursor-grabbing ${
                                  snapshotDraggable.isDragging ? "shadow-2xl border-[#df7b62]" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-white text-xs font-bold">
                                    {lead.firstName} {lead.lastName || ""}
                                  </h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-en ${
                                    lead.leadScore >= 75
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : lead.leadScore >= 50
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-slate-500/10 text-slate-400"
                                  }`}>
                                    {lead.leadScore}%
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 space-y-1">
                                  <div>المصدر: <span className="text-slate-300 font-semibold">{lead.source}</span></div>
                                  {lead.city && <div>المدينة: <span className="text-slate-300 font-semibold">{lead.city}</span></div>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <div className="py-12 text-center text-[10px] text-slate-500">لا يوجد عملاء</div>
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
