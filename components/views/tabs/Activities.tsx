"use client";
import strings from "@/components/i18n/ar";

export default function Activities() {
  return (
    <div className="tab-pane">
      <h3 className="tab-pane-title">{strings.tabActivities}</h3>
      <p className="text-muted">سجل الأنشطة: مكالمات، رسائل، مواعيد.</p>
    </div>
  );
}
