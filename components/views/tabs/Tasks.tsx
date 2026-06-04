"use client";
import strings from "@/components/i18n/ar";

export default function Tasks() {
  return (
    <div className="tab-pane">
      <h3 className="tab-pane-title">{strings.tabTasks}</h3>
      <p className="text-muted">مهام مرتبطة بالعميل: متابعة، إرسال عرض، تذكير.</p>
    </div>
  );
}
