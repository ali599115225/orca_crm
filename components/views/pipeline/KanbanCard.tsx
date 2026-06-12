"use client";

import { Draggable } from "@hello-pangea/dnd";

export type LeadItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  city: string;
  source: string;
  leadScore: number;
  stage: string;
  projectId: string | null;
  assignedTo: string | null;
  phone?: string | null;
  email?: string | null;
};

interface Props {
  lead: LeadItem;
  index: number;
  accentColor: string;
}

export default function KanbanCard({ lead, index, accentColor }: Props) {
  const scoreClass =
    lead.leadScore >= 75 ? "nc-badge nc-badge-danger" :
    lead.leadScore >= 50 ? "nc-badge nc-badge-warning" :
    "nc-badge nc-badge-accent";

  return (
    <Draggable draggableId={lead.id} index={index} key={lead.id}>
      {(d: any, s: any) => (
        <div
          ref={d.innerRef}
          {...d.draggableProps}
          {...d.dragHandleProps}
          className={`nc-lead${s.isDragging ? " dragging" : ""}`}
          style={{
            ...d.draggableProps.style,
            "--stage-accent": accentColor,
          } as React.CSSProperties}
        >
          <div className="nc-lead-header">
            <span className="nc-lead-name">
              {lead.firstName} {lead.lastName || ""}
            </span>
            <span className={scoreClass}>{lead.leadScore}%</span>
          </div>
          <div className="nc-lead-meta">
            <span className="nc-lead-source">{lead.source}</span>
            {lead.city && <><span className="nc-lead-sep">·</span><span>{lead.city}</span></>}
          </div>
          {lead.assignedTo && (
            <div className="nc-lead-footer">
              <span className="nc-lead-agent">{lead.assignedTo}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
