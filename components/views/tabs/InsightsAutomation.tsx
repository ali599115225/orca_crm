// components/views/tabs/InsightsAutomation.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from '@/app/context/AppContext';

type Workflow = { id: string; name: string; triggerEvent: string; actionsJson: string; isActive: boolean; };

export default function InsightsAutomation() {
  const { t } = useApp();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [name, setName] = useState(""); const [triggerEvent, setTriggerEvent] = useState("lead.created"); const [action1, setAction1] = useState("send_whatsapp_welcome"); const [action2, setAction2] = useState("create_followup_task");

  const loadData = async () => { try { setLoading(true); const [wRes, rRes] = await Promise.all([fetch("/api/v1/automation/workflows"), fetch("/api/v1/reports/leads-performance")]); const wJson = await wRes.json(); const rJson = await rRes.json(); if (wJson.success) setWorkflows(wJson.data); if (rJson.success) setReportData(rJson.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => { e.preventDefault(); if (!name || !triggerEvent) return; const actions = [{ type: action1, payload: { template: "welcome_template" } }, { type: action2, payload: { priority: "MEDIUM", delayHours: 24 } }]; try { setBtnLoading(true); await fetch("/api/v1/automation/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, triggerEvent, actionsJson: JSON.stringify(actions) }) }); setName(""); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };

  return (
    <div className="tab-pane space-y-6">
      {/* Limited Preview badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
        <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0"><i className="ph-fill ph-eye text-xs"></i></div>
        <div><p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{t("dash.previewLabel")}</p><p className="text-[9px] text-[var(--nc-text-dim)]">{t("dash.previewDesc")}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("insights.workflowEditor")}</h3>
          <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("insights.workflowName")}</label><input value={name} onChange={(e) => setName(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("insights.triggerEvent")}</label><select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="lead.created">{t("insights.triggerOnLead")}</option><option value="tour.completed">{t("insights.triggerOnTour")}</option><option value="offer.accepted">{t("insights.triggerOnOffer")}</option></select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("insights.action1")}</label><select value={action1} onChange={(e) => setAction1(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="send_whatsapp_welcome">{t("insights.actionWhatsapp")}</option><option value="assign_agent_round_robin">{t("insights.actionAssignAgent")}</option><option value="notify_manager">{t("insights.actionNotifyManager")}</option></select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("insights.action2")}</label><select value={action2} onChange={(e) => setAction2(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="create_followup_task">{t("insights.actionFollowup")}</option><option value="log_telemetry">{t("insights.actionTelemetry")}</option><option value="wait_delay">{t("insights.actionWait")}</option></select></div>
            <button type="submit" disabled={btnLoading} className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{btnLoading ? t("insights.saving") : t("insights.activate")}</button>
          </form>
        </SmartCard>

        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("insights.funnelReports")}</h3>
          {loading ? (<div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">{t("insights.loading")}</div>) : reportData ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4"><div className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl"><p className="text-slate-450 text-xs mb-1">{t("insights.conversionRate")}</p><p className="text-[var(--nc-foreground)] font-bold font-en text-base">{reportData.conversionRatio}%</p></div><div className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl"><p className="text-slate-450 text-xs mb-1">{t("insights.avgCloseTime")}</p><p className="text-[var(--nc-text-secondary)] font-bold font-en text-base">{reportData.avgTimeToCloseDays} {t("insights.days")}</p></div></div>
              <div className="space-y-3 pt-2"><h4 className="text-[var(--nc-foreground)] font-bold text-xs">{t("insights.funnelDetails")}</h4>
                <div className="space-y-2 font-en text-xs">
                  <div><div className="flex justify-between mb-1"><span className="text-[var(--nc-text-dim)] font-medium">{t("insights.newLeads")}</span><span className="text-[var(--nc-foreground)] font-bold">{reportData.funnel.new}</span></div><div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full" style={{ width: "100%" }}></div></div></div>
                  <div><div className="flex justify-between mb-1"><span className="text-[var(--nc-text-dim)] font-medium">{t("insights.contacted")}</span><span className="text-[var(--nc-foreground)] font-bold">{reportData.funnel.contacted}</span></div><div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden"><div className="bg-sky-500 h-full rounded-full" style={{ width: "70%" }}></div></div></div>
                  <div><div className="flex justify-between mb-1"><span className="text-[var(--nc-text-dim)] font-medium">{t("insights.qualifiedTours")}</span><span className="text-[var(--nc-foreground)] font-bold">{reportData.funnel.tourScheduled}</span></div><div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden"><div className="bg-amber-500 h-full rounded-full" style={{ width: "30%" }}></div></div></div>
                  <div><div className="flex justify-between mb-1"><span className="text-[var(--nc-text-dim)] font-medium">{t("insights.closedSales")}</span><span className="text-[var(--nc-foreground)] font-bold">{reportData.funnel.closed}</span></div><div className="w-full bg-[var(--nc-surface-solid)] rounded-full h-1.5 overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${reportData.conversionRatio}%` }}></div></div></div>
                </div>
              </div>
            </div>
          ) : (<div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">{t("insights.noData")}</div>)}
        </SmartCard>

        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("insights.activeWorkflows")}</h3>
          {loading ? (<div className="text-center py-12 text-[var(--nc-text-dim)] font-medium text-xs">{t("insights.loadingWorkflows")}</div>) : workflows.length === 0 ? (<div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("insights.noWorkflows")}</div>) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">{workflows.map((flow) => (<div key={flow.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl flex flex-col gap-2 text-xs"><div className="flex justify-between items-center"><span className="text-[var(--nc-foreground)] font-bold">{flow.name}</span><span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold">{t("insights.workflowActive")}</span></div><p className="text-[var(--nc-text-dim)] font-medium">{t("insights.eventLabel")} <span className="text-indigo-400 font-semibold font-en">{flow.triggerEvent}</span></p></div>))}</div>
          )}
        </SmartCard>
      </div>
    </div>
  );
}
