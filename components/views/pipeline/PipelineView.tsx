"use client";

import { useState } from "react";

export default function PipelineView() {
  const stages = [
    { id: "new", title: "جديد" },
    { id: "contacted", title: "تم التواصل" },
    { id: "qualified", title: "مؤهل" },
    { id: "proposal", title: "عرض سعر" },
    { id: "negotiation", title: "تفاوض" },
    { id: "closed", title: "مغلق" },
  ];

  const [leads] = useState<Record<string, any>>({
    new: [
      { id: 1, name: "أحمد السبيعي", city: "الرياض", score: "🔥" },
      { id: 2, name: "سارة العتيبي", city: "جدة", score: "✨" },
    ],
    contacted: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    closed: [],
  });

  return (
    <div className="pipeline-page">
      <h2 className="pipeline-title">Pipeline</h2>

      <div className="grid grid-cols-6 gap-3 items-stretch">
        {stages.map((stage) => (
          <div key={stage.id} className="stage-column">
            <div className="stage-header">
              <span>{stage.title}</span>
              <span className="count">{leads[stage.id].length}</span>
            </div>

            <div className="custom-scrollbar space-y-3 pr-1">
              {leads[stage.id].map((lead: any) => (
                <div key={lead.id} className="lead-card">
                  <h3 className="lead-name">{lead.name}</h3>
                  <p className="lead-city">{lead.city}</p>
                  <p className="lead-score">{lead.score}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
