// components/views/tabs/InsightsAutomation.tsx
"use client";
import { toast } from '@/app/context/ToastContext';
import React, { useState, useEffect } from 'react';

type Workflow = {
  id: string;
  name: string;
  triggerEvent: string;
  actionsJson: string;
  isActive: boolean;
};

export default function InsightsAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Form Workflow Builder States
  const [name, setName] = useState("ترحيب تلقائي بالعميل الجديد");
  const [triggerEvent, setTriggerEvent] = useState("lead.created");
  const [action1, setAction1] = useState("send_whatsapp_welcome");
  const [action2, setAction2] = useState("create_followup_task");

  const loadData = async () => {
    try {
      setLoading(true);
      const [wRes, rRes] = await Promise.all([
        fetch("/api/v1/automation/workflows"),
        fetch("/api/v1/reports/leads-performance"),
      ]);
      const wJson = await wRes.json();
      const rJson = await rRes.json();

      if (wJson.success) setWorkflows(wJson.data);
      if (rJson.success) setReportData(rJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !triggerEvent) return;

    const actions = [
      { type: action1, payload: { template: "welcome_template" } },
      { type: action2, payload: { priority: "MEDIUM", delayHours: 24 } },
    ];

    try {
      setBtnLoading(true);
      const res = await fetch("/api/v1/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerEvent,
          actionsJson: JSON.stringify(actions),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setName("");
        loadData();
        toast.success('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="tab-pane bg-[#021324] border border-[#0ea5e9]/10 p-6 rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Playbook / Workflow Visual Editor */}
        <div className="bg-[var(--nc-surface)] border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-4">محرر مسارات الأتمتة (Workflows Editor)</h3>
          <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">اسم خط سير العمل (Workflow Name)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">الحدث المشغّل (Trigger Event) *</label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              >
                <option value="lead.created">عند تسجيل عميل محتمل جديد (lead.created)</option>
                <option value="tour.completed">عند إتمام جولة عقارية (tour.completed)</option>
                <option value="offer.accepted">عند قبول عرض السعر (offer.accepted)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">الإجراء الأول (Action 1) *</label>
              <select
                value={action1}
                onChange={(e) => setAction1(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              >
                <option value="send_whatsapp_welcome">إرسال رسالة ترحيبية واتساب</option>
                <option value="assign_agent_round_robin">توجيه تلقائي لوكيل مبيعات</option>
                <option value="notify_manager">إرسال تنبيه للمدير</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">الإجراء الثاني (Action 2) *</label>
              <select
                value={action2}
                onChange={(e) => setAction2(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              >
                <option value="create_followup_task">جدولة مهمة متابعة تلقائية</option>
                <option value="log_telemetry">تدوين حدث Telemetry</option>
                <option value="wait_delay">انتظار مدة ٤٨ ساعة</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={btnLoading}
              className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center"
            >
              {btnLoading ? "جاري الحفظ..." : "تفعيل وحفظ خط سير العمل"}
            </button>
          </form>
        </div>

        {/* Visual Funnel Performance Reports */}
        <div className="bg-[var(--nc-surface)] border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-4">تقارير كفاءة المبيعات والقمع العقاري</h3>
          {loading ? (
            <div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">جاري تحميل التقارير...</div>
          ) : reportData ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl">
                  <p className="text-slate-450 text-xs mb-1">نسبة تحويل العملاء</p>
                  <p className="text-white font-bold font-en text-base">{reportData.conversionRatio}%</p>
                </div>
                <div className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl">
                  <p className="text-slate-450 text-xs mb-1">متوسط مدة الإغلاق</p>
                  <p className="text-[var(--nc-text-secondary)] font-bold font-en text-base">{reportData.avgTimeToCloseDays} يوم</p>
                </div>
              </div>

              {/* Conversion Funnel visual bars */}
              <div className="space-y-3 pt-2">
                <h4 className="text-white font-bold text-xs">أرقام قمع المبيعات (Sales Funnel Details)</h4>
                
                <div className="space-y-2 font-en text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--nc-text-dim)] font-medium">New Leads</span>
                      <span className="text-white font-bold">{reportData.funnel.new}</span>
                    </div>
                    <div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--nc-text-dim)] font-medium">Contacted</span>
                      <span className="text-white font-bold">{reportData.funnel.contacted}</span>
                    </div>
                    <div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: "70%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--nc-text-dim)] font-medium">Qualified Tours</span>
                      <span className="text-white font-bold">{reportData.funnel.tourScheduled}</span>
                    </div>
                    <div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: "30%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--nc-text-dim)] font-medium">Closed Sales</span>
                      <span className="text-white font-bold">{reportData.funnel.closed}</span>
                    </div>
                    <div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${reportData.conversionRatio}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">لا يوجد بيانات تقارير متاحة.</div>
          )}
        </div>

        {/* Workflows List */}
        <div className="bg-[var(--nc-surface)] border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-4">مسارات الأتمتة النشطة (Active Workflows)</h3>
          {loading ? (
            <div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">جاري تحميل مسارات الأتمتة...</div>
          ) : workflows.length === 0 ? (
            <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">لا يوجد مسارات أتمتة مسجلة حالياً.</div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {workflows.map((flow) => (
                <div key={flow.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{flow.name}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold">
                      نشط Active
                    </span>
                  </div>
                  <p className="text-[var(--nc-text-dim)] font-medium">الحدث: <span className="text-indigo-400 font-semibold font-en">{flow.triggerEvent}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}




