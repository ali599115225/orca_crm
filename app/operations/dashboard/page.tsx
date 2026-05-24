"use client";

import { useState } from "react";

const stages = [
  { step: "طلبات", owner: "قسم أ", load: 40, future: 52, status: "طبيعي", reason: "الطلبات ضمن القدرة الحالية، لكن التزايد المتوقع يحتاج متابعة خلال 30 دقيقة.", action: "استمرار المراقبة مع إبقاء مسار احتياطي جاهز." },
  { step: "تدفق موازي مؤقت", owner: "قسم ب", load: 95, future: 108, status: "اختناق متوقع", reason: "تحليل سرعة الطابور يشير إلى وصول مهام إضافية سترفع الحمل فوق 100% خلال أقل من 18 دقيقة.", action: "فتح مسار فرعي مؤقت وتحويل 25% من المهام إليه فوراً." },
  { step: "تنفيذ", owner: "العمليات", load: 61, future: 74, status: "مستقر", reason: "مرحلة التنفيذ مستقرة لكنها تعتمد على خروج المهام من مراجعة البيانات.", action: "تجهيز دفعات مسبقة لاستقبال التحويل القادم من المسار الموازي." },
  { step: "بوابات جودة مالية", owner: "الجودة", load: 72, future: 89, status: "تحذير", reason: "تكلفة إعادة العمل ترتفع بسبب أخطاء صغيرة قابلة للأتمتة في الفحص المالي.", action: "تفعيل قاعدة رفض تلقائي للأخطاء المتكررة قبل وصولها للتدقيق اليدوي." },
  { step: "حفظ النتائج", owner: "النظام", load: 34, future: 38, status: "طبيعي", reason: "لا يوجد ضغط فعلي والمرحلة قادرة على استيعاب زيادة مؤقتة.", action: "استخدام الطاقة المتاحة لاستقبال نتائج المسار الفرعي." },
];

const audit = [
  { id: "#4", title: "تم حشر الخطأ وجاري إصلاحه ذكياً", meta: "النظام نقل المهمة للمطور المناوب" },
  { id: "#5", title: "فتح مسار موازي مؤقت", meta: "تم توزيع 18 مهمة بعيداً عن قسم ب" },
  { id: "#6", title: "احتساب هدر مالي مباشر", meta: "تم تقدير تكلفة الانتظار الحالية" },
];

const resourceHeat = [
  { name: "قسم أ", now: 40, next: 52 },
  { name: "قسم ب", now: 95, next: 108 },
  { name: "الدعم", now: 48, next: 63 },
  { name: "الجودة", now: 72, next: 89 },
];

export default function DashboardPage() {
  const [expanded, setExpanded] = useState(false);
  const [autonomy, setAutonomy] = useState<"advisory" | "autonomous">("autonomous");
  const [reason, setReason] = useState<(typeof stages)[number] | null>(null);
  const waste = stages.reduce((sum, stage) => sum + Math.max(0, stage.future - stage.load), 0);

  return (
    <>
      <style jsx global>{`
        .hyper-room { min-height: 100%; padding: 18px; display: grid; gap: 14px; background: #07111f; color: #e5eefc; }
        .hyper-room.expanded { position: fixed; inset: 68px 0 0 0; z-index: 120; overflow: auto; }
        .hyper-card { border: 1px solid rgba(96,165,250,.20); border-radius: 26px; background: linear-gradient(180deg, rgba(15,23,42,.96), rgba(15,23,42,.84)); box-shadow: 0 20px 50px rgba(0,0,0,.26); overflow: hidden; }
        .hyper-header { min-height: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 12px 16px; }
        .auto-state, .waste-counter { width: max-content; display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 999px; border: 1px solid rgba(96,165,250,.22); background: rgba(15,23,42,.74); color: #bfdbfe; font-size: 12px; font-weight: 950; }
        .auto-dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 6px rgba(34,197,94,.12); animation: pulse 1.4s infinite; }
        @keyframes pulse { 50% { opacity: .35; transform: scale(.82); } }
        .hyper-title { margin: 0; text-align: center; font-size: clamp(20px,3vw,32px); font-weight: 950; letter-spacing: -.03em; }
        .hyper-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .hyper-btn { min-height: 40px; border: 1px solid rgba(96,165,250,.22); border-radius: 14px; background: rgba(15,23,42,.78); color: #e5eefc; padding: 0 12px; font-size: 12px; font-weight: 900; cursor: pointer; }
        .hyper-btn.primary, .hyper-btn.active { border: 0; color: #fff; background: linear-gradient(135deg,#2563eb,#4f46e5); }
        .hyper-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(360px,.55fr); gap: 14px; min-height: calc(100vh - 172px); }
        .left-zone { display: grid; grid-template-rows: minmax(420px,1fr) minmax(240px,.45fr); gap: 14px; }
        .right-zone { display: grid; grid-template-rows: minmax(300px,.55fr) minmax(280px,.45fr); gap: 14px; }
        .panel-head { padding: 14px 16px; border-bottom: 1px solid rgba(96,165,250,.18); display: flex; justify-content: space-between; gap: 12px; align-items: center; }
        .panel-head h2 { margin: 0; font-size: 15px; font-weight: 950; } .panel-head p { margin: 4px 0 0; color: #94a3b8; font-size: 11px; }
        .fluid-grid { padding: 14px; overflow: auto; }
        .fluid-table { min-width: 880px; display: grid; gap: 10px; }
        .fluid-row { display: grid; grid-template-columns: 1.1fr .85fr .7fr .7fr .9fr .7fr; gap: 10px; align-items: center; padding: 12px; border: 1px solid rgba(96,165,250,.16); border-radius: 18px; background: rgba(30,41,59,.62); }
        .fluid-row.head { background: rgba(15,23,42,.88); color: #93c5fd; font-size: 11px; font-weight: 950; }
        .fluid-row.critical { border-color: rgba(239,68,68,.55); box-shadow: 0 0 0 2px rgba(239,68,68,.14); animation: criticalGlow 1.3s infinite; }
        @keyframes criticalGlow { 50% { filter: brightness(1.35); } }
        .stage-name { font-weight: 950; } .stage-meta { color: #94a3b8; font-size: 12px; }
        .status-pill { display: inline-flex; justify-content: center; border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 950; border: 1px solid rgba(96,165,250,.18); }
        .status-pill.critical { color: #fecaca; background: rgba(127,29,29,.46); border-color: rgba(239,68,68,.42); }
        .status-pill.warning { color: #fed7aa; background: rgba(120,53,15,.45); border-color: rgba(249,115,22,.35); }
        .status-pill.normal { color: #bbf7d0; background: rgba(6,78,59,.42); border-color: rgba(16,185,129,.32); }
        .reason-btn { min-height: 34px; border: 0; border-radius: 12px; background: rgba(37,99,235,.22); color: #bfdbfe; font-weight: 950; cursor: pointer; }
        .parallel-pipeline { margin-top: 14px; padding: 14px; border: 1px dashed rgba(96,165,250,.35); border-radius: 20px; background: rgba(37,99,235,.08); display: flex; gap: 12px; align-items: center; justify-content: space-between; }
        .heatmap { padding: 14px; display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        .heat-cell { min-height: 96px; padding: 13px; border-radius: 18px; border: 1px solid rgba(96,165,250,.16); background: rgba(30,41,59,.72); }
        .heat-cell.hot { background: rgba(127,29,29,.55); border-color: rgba(239,68,68,.42); } .heat-cell.warn { background: rgba(120,53,15,.50); border-color: rgba(249,115,22,.36); } .heat-cell.cool { background: rgba(6,78,59,.45); border-color: rgba(16,185,129,.34); }
        .bar { height: 8px; border-radius: 999px; background: rgba(148,163,184,.18); overflow: hidden; margin-top: 10px; } .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#2563eb,#60a5fa); }
        .audit-list, .engine-list { padding: 14px; display: grid; gap: 10px; }
        .audit-item, .engine-card { padding: 13px; border-radius: 18px; border: 1px solid rgba(96,165,250,.16); background: rgba(30,41,59,.70); }
        .audit-item p, .engine-card p { margin: 6px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.7; }
        .trigger { width: 100%; min-height: 48px; border: 0; border-radius: 16px; background: linear-gradient(135deg,#ef4444,#f97316); color: #fff; font-weight: 950; cursor: pointer; }
        .reason-sheet { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; background: rgba(2,6,23,.66); backdrop-filter: blur(8px); padding: 16px; }
        .reason-card { width: min(620px,100%); border: 1px solid rgba(96,165,250,.24); border-radius: 28px; background: #0f172a; color: #e5eefc; box-shadow: 0 30px 80px rgba(0,0,0,.42); padding: 22px; }
        .reason-card h3 { margin: 0; font-size: 24px; font-weight: 950; } .reason-card p { color: #94a3b8; line-height: 1.8; }
        @media (max-width: 1180px) { .hyper-grid { grid-template-columns: 1fr; } }
        @media (max-width: 760px) { .hyper-room { padding: 12px; } .hyper-header { grid-template-columns: 1fr; text-align: center; } .hyper-actions { justify-content: center; } .left-zone, .right-zone { grid-template-rows: auto; } .fluid-table { min-width: 760px; } .heatmap { grid-template-columns: 1fr; } }
      `}</style>
      <div className={`hyper-room ${expanded ? "expanded" : ""}`}><header className="hyper-card hyper-header"><span className="auto-state"><span className="auto-dot" /> نظام القيادة الذاتية: نشط</span><h1 className="hyper-title">النواة المركزية للعمليات المتطورة</h1><div className="hyper-actions"><span className="waste-counter">الهدر اللحظي: ${waste}.00</span><button className="hyper-btn" onClick={() => setAutonomy(autonomy === "autonomous" ? "advisory" : "autonomous")}>{autonomy === "autonomous" ? "قيادي ذاتي" : "استشاري"}</button><button className="hyper-btn primary" onClick={() => setExpanded((v) => !v)}>{expanded ? "تصغير" : "تكبير"}</button></div></header><main className="hyper-grid"><section className="left-zone"><div className="hyper-card"><div className="panel-head"><div><h2>المسار الديناميكي السائل</h2><p>إعادة هيكلة تلقائية وفتح مسار فرعي عند ارتفاع الضغط.</p></div></div><div className="fluid-grid"><div className="fluid-table"><div className="fluid-row head"><span>المرحلة</span><span>المسؤول</span><span>الحمل</span><span>توقع 30د</span><span>الحالة</span><span>إجراءات</span></div>{stages.map((stage) => <div className={`fluid-row ${stage.future >= 100 ? "critical" : stage.future >= 85 ? "warning" : ""}`} key={stage.step}><span className="stage-name">{stage.step}</span><span className="stage-meta">{stage.owner}</span><span>{stage.load}%</span><span>{stage.future}%</span><span><span className={`status-pill ${stage.future >= 100 ? "critical" : stage.future >= 85 ? "warning" : "normal"}`}>{stage.status}</span></span><button className="reason-btn" onClick={() => setReason(stage)}>سبب الاختناق</button></div>)}</div><div className="parallel-pipeline"><strong>⚡ تدفق موازي مؤقت</strong><span>تم فتح مسار فرعي لتوزيع حمل قسم ب تلقائياً.</span></div></div></div><div className="hyper-card"><div className="panel-head"><div><h2>سجل التدقيق المتقدم والبوابات الرقمية</h2><p>الأخطاء المحجوزة والمحاسبية المباشرة.</p></div></div><div className="audit-list">{audit.map((item) => <div className="audit-item" key={item.id}><strong>{item.id} · {item.title}</strong><p>{item.meta}</p></div>)}</div></div></section><aside className="right-zone"><div className="hyper-card"><div className="panel-head"><div><h2>خريطة الموارد التنبؤية</h2><p>طاقة الفريق بعد 30 دقيقة مستقبلاً.</p></div></div><div className="heatmap">{resourceHeat.map((item) => <div className={`heat-cell ${item.next >= 95 ? "hot" : item.next >= 75 ? "warn" : "cool"}`} key={item.name}><strong>{item.name}</strong><p className="stage-meta">الآن {item.now}% · بعد 30د {item.next}%</p><div className="bar"><span style={{ width: `${Math.min(item.next,100)}%` }} /></div></div>)}</div></div><div className="hyper-card"><div className="panel-head"><div><h2>مركز التحكم الذاتي</h2><p>تنفيذ ذاتي مشروط بدل الاكتفاء بالاقتراح.</p></div></div><div className="engine-list"><div className="engine-card"><strong>إجراء متخذ تلقائياً</strong><p>تم موازنة حمل القسم (ب) وفتح مسار فرعي مؤقت بنجاح.</p></div><div className="engine-card"><strong>بوابة جودة مالية</strong><p>تكلفة الإصلاح أقل من تمرير الخطأ، لذلك تم حجزه تلقائياً.</p></div><button className="trigger">⚡ تنفيذ معالجة الأزمة الآن</button></div></div></aside></main>{reason ? <div className="reason-sheet" onClick={() => setReason(null)}><div className="reason-card" onClick={(e) => e.stopPropagation()}><h3>{reason.step}</h3><p><strong>سبب الاختناق:</strong> {reason.reason}</p><p><strong>الإجراء المقترح:</strong> {reason.action}</p><button className="hyper-btn primary" onClick={() => setReason(null)}>إغلاق</button></div></div> : null}</div>
    </>
  );
}