"use client";
import strings from "@/components/i18n/ar";

export default function AIAnalysis() {
  return (
    <div className="tab-pane">
      <h3 className="tab-pane-title">{strings.tabAI}</h3>
      <p className="text-muted">هنا تعرض نتائج تحليل الذكاء الاصطناعي لكل عميل.</p>
    </div>
  );
}
