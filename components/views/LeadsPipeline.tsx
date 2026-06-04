"use client";

import { useState } from "react";

type Stage = {
  id: string;
  title: string;
  color: string;
  icon: string;
};

const initialStages: Stage[] = [
  { id: "new", title: "جديد", color: "#0EA5E9", icon: "🆕" },
  { id: "contact", title: "تواصل", color: "#22C55E", icon: "📞" },
  { id: "offer", title: "عرض مرسل", color: "#FACC15", icon: "📄" },
  { id: "tour", title: "جولة", color: "#A855F7", icon: "🚗" },
  { id: "negotiate", title: "تفاوض", color: "#FB923C", icon: "🤝" },
  { id: "closed", title: "إغلاق", color: "#22C55E", icon: "✅" },
];

export default function LeadsPipeline({ onLeadClick }: { onLeadClick?: (lead: any) => void }) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [newStageTitle, setNewStageTitle] = useState("");

  function addStage() {
    if (!newStageTitle.trim()) return;
    const id = newStageTitle.trim().toLowerCase().replace(/\s+/g, "-");
    if (stages.find((s) => s.id === id)) return;

    const newStage: Stage = {
      id,
      title: newStageTitle.trim(),
      color: "#64748B",
      icon: "📌",
    };

    setStages((prev) => [...prev, newStage]);
    setNewStageTitle("");
  }

  return (
    <div className="flex flex-col gap-4">

      {/* شريط التحكم */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="اسم مرحلة جديدة..."
          value={newStageTitle}
          onChange={(e) => setNewStageTitle(e.target.value)}
          className="bg-[#031C2E] border border-cyan-500/30 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
        />
        <button
          onClick={addStage}
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm"
        >
          + إضافة مرحلة
        </button>
      </div>

      {/* الأعمدة */}
      <div className="grid grid-cols-6 gap-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="stage-column bg-[#031C2E] p-4 rounded-xl border border-cyan-500/30 text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{stage.icon}</span>
                <h3 className="text-lg font-bold">{stage.title}</h3>
              </div>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: stage.color + "33", color: stage.color }}
              >
                0 عميل
              </span>
            </div>

            <div className="text-[11px] text-slate-300 mb-3 space-y-1">
              <p>متوسط الحرارة: 0%</p>
              <p>أعلى احتمال إغلاق: 0%</p>
            </div>

            <button
              className="add-lead-btn w-full mb-3 text-xs py-2 border border-dashed border-cyan-500/40 rounded-lg text-cyan-300 hover:bg-cyan-500/10"
            >
              + إضافة Lead في هذه المرحلة
            </button>

            <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-xs text-slate-500 mt-2">لا يوجد عملاء في هذه المرحلة.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
