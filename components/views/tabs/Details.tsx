"use client";
import strings from "@/components/i18n/ar";

export default function Details() {
  return (
    <div className="tab-pane">
      <h3 className="tab-pane-title">{strings.tabDetails}</h3>
      <p className="text-muted">معلومات تفصيلية عن العميل وسجل التفاعلات.</p>
    </div>
  );
}
