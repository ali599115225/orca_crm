"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

/**
 * PipelineDnd.tsx
 * ملاحظة: ثبت الحزمة react-beautiful-dnd أولاً:
 * npm install react-beautiful-dnd
 */

type Lead = { id: string; name: string; city?: string; score?: string };

export default function PipelineDnd() {
  const initialStages = [
    { id: "new", title: "جديد" },
    { id: "contacted", title: "تم التواصل" },
    { id: "qualified", title: "مؤهل" },
    { id: "proposal", title: "عرض سعر" },
    { id: "negotiation", title: "تفاوض" },
    { id: "closed", title: "مغلق" },
  ];

  const [stages] = useState(initialStages);

  const [data, setData] = useState<Record<string, Lead[]>>({
    new: [
      { id: "lead-1", name: "أحمد السبيعي", city: "الرياض", score: "85%" },
      { id: "lead-2", name: "سارة العتيبي", city: "جدة", score: "60%" },
    ],
    contacted: [{ id: "lead-3", name: "محمد الفتحلي", city: "الدمام", score: "72%" }],
    qualified: [],
    proposal: [],
    negotiation: [],
    closed: [],
  });

  function onDragEnd(result: any) {
    const { source, destination } = result;
    if (!destination) return;

    // نفس العمود
    if (source.droppableId === destination.droppableId) {
      const items = Array.from(data[source.droppableId]);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);

      setData((prev) => ({ ...prev, [source.droppableId]: items }));
      return;
    }

    // بين أعمدة
    const sourceItems = Array.from(data[source.droppableId]);
    const destItems = Array.from(data[destination.droppableId]);
    const [moved] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, moved);

    setData((prev) => ({
      ...prev,
      [source.droppableId]: sourceItems,
      [destination.droppableId]: destItems,
    }));
  }

  return (
    <div className="pipeline-page">
      <h2 className="pipeline-title">Pipeline (سحب وإفلات)</h2>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-6 gap-3 items-stretch">
          {stages.map((stage) => (
            <Droppable droppableId={stage.id} key={stage.id}>
              {(provided: any, snapshot: any) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`stage-column ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                >
                  <div className="stage-header">
                    <span>{stage.title}</span>
                    <span className="count">{data[stage.id]?.length || 0}</span>
                  </div>

                  <div className="custom-scrollbar space-y-3 pr-1">
                    {(data[stage.id] || []).map((lead, index) => (
                      <Draggable draggableId={lead.id} index={index} key={lead.id}>
                        {(providedDraggable: any, snapshotDraggable: any) => (
                          <div
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            className={`lead-card ${snapshotDraggable.isDragging ? "dragging" : ""}`}
                          >
                            <h3 className="lead-name">{lead.name}</h3>
                            {lead.city && <p className="lead-city">{lead.city}</p>}
                            {lead.score && <p className="lead-score">{lead.score}</p>}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
