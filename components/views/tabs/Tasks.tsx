// components/views/tabs/Tasks.tsx
"use client";
import { useState, useEffect } from "react";
import { SmartCard } from "@/components/ui/SmartCard";
import { BoundedCardList } from "@/components/ui/BoundedCardList";
import { StatusCell } from "@/components/ui/orca-table/cells/StatusCell";
import { DateCell } from "@/components/ui/orca-table/cells/DateCell";
import { useApp } from "@/app/context/AppContext";
import { formatTaskStatus } from "@/lib/ui-status";
import { DateField } from '@/components/ui/date-time/DateField';

type Task = { id: string; leadId: string; assignedTo: string; title: string; description: string | null; dueDate: string; priority: string; status: string; lead?: { firstName: string; lastName: string | null } | null; };
type Lead = { id: string; firstName: string; lastName: string | null; };

export default function Tasks() {
  const { t } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [leadId, setLeadId] = useState(""); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [dueDate, setDueDate] = useState(""); const [priority, setPriority] = useState("MEDIUM");

  const loadData = async () => { try { setLoading(true); const [tasksRes, leadsRes] = await Promise.all([fetch(`/api/v1/tasks${filterAssignee ? `?assignee=${filterAssignee}` : ""}`), fetch("/api/v1/leads")]); const tasksJson = await tasksRes.json(); const leadsJson = await leadsRes.json(); if (tasksJson.success) setTasks(tasksJson.data); if (leadsJson.success) setLeads(leadsJson.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, [filterAssignee]);

  const handleCreateTask = async (e: React.FormEvent) => { e.preventDefault(); if (!leadId || !title) return; try { setBtnLoading(true); await fetch("/api/v1/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, title, description, dueDate, priority }) }); setLeadId(""); setTitle(""); setDescription(""); setDueDate(""); setPriority("MEDIUM"); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const handleCompleteTask = async (taskId: string) => { try { setBtnLoading(true); await fetch(`/api/v1/tasks/${taskId}/complete`, { method: "PATCH", headers: { "Content-Type": "application/json" } }); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };

  const pendingTasks = tasks.filter(t => t.status === "PENDING");
  const completedTasks = tasks.filter(t => t.status === "COMPLETED");

  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("tasksTab.create")}</h3>
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tasksTab.selectLead")}</label><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="">{t("tasksTab.selectLeadPlaceholder")}</option>{leads.map((l) => (<option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>))}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tasksTab.taskTitle")}</label><input placeholder={t("tasksTab.taskTitlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tasksTab.description")}</label><textarea placeholder={t("tasksTab.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded p-2 text-[var(--nc-foreground)] h-16 resize-none" /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tasksTab.dueDate")}</label><DateField value={dueDate} onChange={setDueDate} /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tasksTab.priority")}</label><select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]"><option value="LOW">{t("tasksTab.priorityLow")}</option><option value="MEDIUM">{t("tasksTab.priorityMedium")}</option><option value="HIGH">{t("tasksTab.priorityHigh")}</option></select></div>
            <button type="submit" disabled={btnLoading} className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{t("tasksTab.save")}</button>
          </form>
        </SmartCard>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <SmartCard className="p-4">
            <div className="flex justify-between items-center pb-2 mb-4 border-b border-[var(--nc-glass-border)] text-xs font-bold text-[var(--nc-foreground)]"><span>{t("tasksTab.pending")}</span><span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-en">{pendingTasks.length}</span></div>
            <BoundedCardList pageSize={15} emptyMessage={t("tasksTab.noPending")}>
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl flex flex-col justify-between gap-2 shadow-sm">
                  <div className="text-xs space-y-1">
                    <h4 className="text-[var(--nc-foreground)] font-bold leading-snug">{task.title}</h4>
                    {task.description && <p className="text-[var(--nc-text-dim)] font-medium">{task.description}</p>}
                    {task.lead && (<p className="text-[var(--nc-text-dim)] font-medium text-xs">{t("tasksTab.linkedLead")} <span className="text-[var(--nc-text-dim)] font-medium">{task.lead.firstName} {task.lead.lastName || ""}</span></p>)}
                    <StatusCell status={task.status} format={formatTaskStatus} />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={`px-2 py-1 rounded font-bold ${task.priority === "HIGH" ? "bg-rose-500/10 text-rose-400" : "bg-[var(--nc-surface)] text-[var(--nc-text-dim)] font-medium"}`}>{task.priority === "HIGH" ? t("tasksTab.priorityHigh") : task.priority === "MEDIUM" ? t("tasksTab.priorityMedium") : t("tasksTab.priorityLow")}</span>
                    <button onClick={() => handleCompleteTask(task.id)} disabled={btnLoading} className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-bold">{t("tasksTab.complete")}</button>
                  </div>
                </div>
              ))}
            </BoundedCardList>
          </SmartCard>
          <SmartCard className="p-4">
            <div className="flex justify-between items-center pb-2 mb-4 border-b border-[var(--nc-glass-border)] text-xs font-bold text-[var(--nc-foreground)]"><span>{t("tasksTab.completed")}</span><span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-en">{completedTasks.length}</span></div>
            <BoundedCardList pageSize={15} emptyMessage={t("tasksTab.noCompleted")}>
              {completedTasks.map(task => (
                <div key={task.id} className="p-4 bg-[var(--nc-surface)] border border-slate-900 rounded-xl opacity-75">
                  <div className="text-xs space-y-1">
                    <h4 className="text-[var(--nc-text-dim)] font-medium font-bold line-through leading-snug">{task.title}</h4>
                    {task.lead && (<p className="text-[var(--nc-text-dim)] font-medium text-xs">{t("tasksTab.linkedLead")} {task.lead.firstName} {task.lead.lastName || ""}</p>)}
                  </div>
                </div>
              ))}
            </BoundedCardList>
          </SmartCard>
        </div>
      </div>
    </div>
  );
}
