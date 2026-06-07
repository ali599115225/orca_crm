"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard, { type LeadItem } from "./KanbanCard";

interface StageDef {
  id: string;
  title: string;
}

interface Props {
  stage: StageDef;
  leads: LeadItem[];
  accentColor: string;
}

export default function KanbanColumn({ stage, leads, accentColor }: Props) {
  return (
    <Droppable droppableId={stage.id} key={stage.id}>
      {(provided: any, snapshot: any) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`nc-stage${snapshot.isDraggingOver ? " drag-over" : ""}`}
          style={{ "--stage-accent": accentColor } as React.CSSProperties}
        >
          <div className="nc-stage-header">
            <div className="nc-stage-title-row">
              <span className="nc-stage-dot" style={{ background: accentColor }} />
              <span className="nc-stage-title">{stage.title}</span>
            </div>
            <span className="nc-stage-count">{leads.length}</span>
          </div>

          <div className="nc-stage-body">
            {leads.map((lead, index) => (
              <KanbanCard key={lead.id} lead={lead} index={index} accentColor={accentColor} />
            ))}
            {provided.placeholder}

            {leads.length === 0 && (
              <div className="nc-stage-empty">
                <span className="nc-stage-empty-text">لا يوجد عملاء</span>
              </div>
            )}
          </div>

          <div className="nc-stage-footer">
            <button
              onClick={() => alert("إضافة عميل جديد إلى مرحلة " + stage.title)}
              className="nc-stage-add-btn"
            >
              + إضافة عميل
            </button>
          </div>
        </div>
      )}
    </Droppable>
  );
}
