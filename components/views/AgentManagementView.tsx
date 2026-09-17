"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import {
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsScrollRegion,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

interface AgentManagementViewProps {
  totalLeads?: number;
  totalUsers?: number;
}

type RuntimeStatus =
  | "ACTIVE"
  | "STOPPED"
  | "RUNNING"
  | "ATTENTION"
  | "FAILED";

interface AgentDefinition {
  nameAr: string;
  nameEn: string;
  responsibilityAr: string;
  responsibilityEn: string;
  executionMode: string;
  manualRun: string;
}

interface UsageMeter {
  metricType: string;
  limitValue: number;
  usageValue: number;
  resetAt: string;
}

interface AgentSlot {
  id: string;
  agentType: string;
  slotNumber: number;
  isActive: boolean;
  createdAt: string;
  usageMeter: UsageMeter | null;
  definition: AgentDefinition | null;
  runtimeStatus: RuntimeStatus;
  lastActivityAt: string | null;
  lastSeverity: string | null;
  supportsManualRun: boolean;
}

interface AgentLog {
  eventKey: string;
  actionType: string;
  messageAr: string;
  severity: string;
  createdAt: string;
}

const ICONS: Record<string, string> = {
  SAHER: "ph-shield-check",
  SANAD: "ph-currency-circle-dollar",
  MANSOUR: "ph-chats-circle",
  BASEER: "ph-chart-line-up",
  KHABEER: "ph-file-magnifying-glass",
  SENTINEL: "ph-radar",
  CHAT_BOT: "ph-robot",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
}

function statusMeta(status: RuntimeStatus, isArabic: boolean) {
  const map: Record<
    RuntimeStatus,
    { ar: string; en: string; className: string }
  > = {
    ACTIVE: {
      ar: "نشط",
      en: "Active",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    STOPPED: {
      ar: "متوقف",
      en: "Stopped",
      className:
        "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-300",
    },
    RUNNING: {
      ar: "يعمل الآن",
      en: "Running now",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    ATTENTION: {
      ar: "يحتاج انتباه",
      en: "Needs attention",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    },
    FAILED: {
      ar: "فشل آخر تشغيل",
      en: "Last run failed",
      className:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
  };

  const item = map[status];
  return {
    label: isArabic ? item.ar : item.en,
    className: item.className,
  };
}

function errorText(code: string | undefined, isArabic: boolean): string {
  const messages: Record<string, [string, string]> = {
    AGENT_DISABLED: [
      "الوكيل متوقف. فعّله أولًا.",
      "The agent is stopped. Activate it first.",
    ],
    AGENT_DUPLICATE_RUN: [
      "تم منع تشغيل مكرر. حاول بعد دقيقة.",
      "A duplicate run was blocked. Try again shortly.",
    ],
    AGENT_RUNTIME_BLOCKED: [
      "سياسة التشغيل الحالية تمنع التنفيذ المباشر.",
      "The current operating policy blocks direct execution.",
    ],
    AGENT_RUN_FAILED: [
      "تعذر إكمال تشغيل الوكيل. راجع السجل.",
      "The agent run could not be completed. Review the log.",
    ],
    AGENT_FORBIDDEN: [
      "لا تملك صلاحية إدارة الوكلاء.",
      "You do not have permission to manage agents.",
    ],
  };
  const value = messages[String(code || "")];
  return value
    ? value[isArabic ? 0 : 1]
    : isArabic
      ? "تعذر إكمال العملية."
      : "The operation could not be completed.";
}

function agentName(agent: AgentSlot, isArabic: boolean) {
  return isArabic
    ? agent.definition?.nameAr || "وكيل تشغيلي"
    : agent.definition?.nameEn || "Operational agent";
}

function agentResponsibility(agent: AgentSlot, isArabic: boolean) {
  return isArabic
    ? agent.definition?.responsibilityAr || "غير محدد"
    : agent.definition?.responsibilityEn || "Not specified";
}

export default function AgentManagementView({
  totalLeads = 0,
  totalUsers = 0,
}: AgentManagementViewProps) {
  const { lang } = useApp();
  const isArabic = lang === "AR";

  const [agents, setAgents] = useState<AgentSlot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selected = useMemo(
    () => agents.find((agent) => agent.id === selectedId) || agents[0] || null,
    [agents, selectedId],
  );

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/agents", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.code || "LOAD_FAILED");
      }

      const nextAgents = Array.isArray(payload.data) ? payload.data : [];
      setAgents(nextAgents);
      setProviderConfigured(Boolean(payload.provider?.configured));
      setCanManage(Boolean(payload.permissions?.canManage));
      setSelectedId((current) =>
        current && nextAgents.some((agent: AgentSlot) => agent.id === current)
          ? current
          : nextAgents[0]?.id || "",
      );
    } catch {
      setNotice({
        type: "error",
        text: isArabic
          ? "تعذر تحميل الوكلاء التشغيليين."
          : "Unable to load operational agents.",
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  const loadLogs = useCallback(
    async (agentId: string) => {
      if (!agentId) {
        setLogs([]);
        return;
      }
      setLoadingLogs(true);
      try {
        const response = await fetch(`/api/v1/agents/${agentId}/logs`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.code || "LOGS_FAILED");
        }
        setLogs(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        setLogs([]);
        setNotice({
          type: "error",
          text: isArabic
            ? "تعذر تحميل سجل الوكيل."
            : "Unable to load the agent log.",
        });
      } finally {
        setLoadingLogs(false);
      }
    },
    [isArabic],
  );

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (selected?.id) void loadLogs(selected.id);
  }, [selected?.id, loadLogs]);

  const updateAgent = async (agent: AgentSlot) => {
    setBusyId(agent.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/agents/${agent.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.code || "UPDATE_FAILED");
      }
      setNotice({
        type: "success",
        text: isArabic
          ? agent.isActive
            ? "تم إيقاف الوكيل."
            : "تم تفعيل الوكيل."
          : agent.isActive
            ? "Agent stopped."
            : "Agent activated.",
      });
      await loadAgents();
    } catch (error) {
      setNotice({
        type: "error",
        text: errorText(
          error instanceof Error ? error.message : undefined,
          isArabic,
        ),
      });
    } finally {
      setBusyId(null);
    }
  };

  const runAgent = async (agent: AgentSlot) => {
    setBusyId(agent.id);
    setNotice(null);
    try {
      const idempotencyKey = `${agent.id}:${Math.floor(Date.now() / 60_000)}`;
      const response = await fetch(`/api/v1/agents/${agent.id}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.code || "AGENT_RUN_FAILED");
      }
      setNotice({
        type: "success",
        text: payload.executed
          ? isArabic
            ? "اكتمل تشغيل الوكيل."
            : "Agent run completed."
          : isArabic
            ? "هذا الوكيل يعمل تلقائيًا ولا يدعم التشغيل اليدوي."
            : "This agent runs automatically and has no manual action.",
      });
      await Promise.all([loadAgents(), loadLogs(agent.id)]);
    } catch (error) {
      setNotice({
        type: "error",
        text: errorText(
          error instanceof Error ? error.message : undefined,
          isArabic,
        ),
      });
      await Promise.all([loadAgents(), loadLogs(agent.id)]);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = agents.filter((agent) => agent.isActive).length;
  const attentionCount = agents.filter((agent) =>
    ["ATTENTION", "FAILED"].includes(agent.runtimeStatus),
  ).length;
  const manualCount = agents.filter(
    (agent) => agent.isActive && agent.supportsManualRun,
  ).length;

  const cards = [
    {
      label: isArabic ? "الوكلاء المهيأون" : "Configured agents",
      value: agents.length,
      subtitle: isArabic ? "الوكلاء المسجلون" : "Registered agents",
      icon: Bot,
    },
    {
      label: isArabic ? "الوكلاء النشطون" : "Active agents",
      value: activeCount,
      subtitle: isArabic ? "حالة التشغيل الحالية" : "Current operating state",
      icon: Zap,
    },
    {
      label: isArabic ? "تحتاج متابعة" : "Need attention",
      value: attentionCount,
      subtitle: isArabic ? "تحذير أو فشل مسجل" : "Warning or recorded failure",
      icon: ShieldAlert,
    },
    {
      label: isArabic ? "تشغيل يدوي متاح" : "Manual run available",
      value: manualCount,
      subtitle: isArabic
        ? `${totalLeads} عميل · ${totalUsers} مستخدم`
        : `${totalLeads} leads · ${totalUsers} users`,
      icon: Users,
    },
  ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className={operationsVisual.page}
      data-agents-rebuild-v1
    >
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={
            isArabic
              ? "الحالة → النشاط → الإجراء → السجل"
              : "Status → activity → action → history"
          }
          title={isArabic ? "الوكلاء التشغيليون" : "Operational agents"}
          description={
            isArabic
              ? "حالة الوكلاء الفعلية ومسارات تشغيلهم وسجل النتائج من مركز واحد."
              : "Real agent state, execution paths, and runtime history from one command surface."
          }
          icon={Bot}
          actions={
            <button
              type="button"
              onClick={() => void loadAgents()}
              disabled={loading}
              className={operationsVisual.iconButton}
              aria-label={isArabic ? "تحديث الوكلاء" : "Refresh agents"}
              title={isArabic ? "تحديث" : "Refresh"}
            >
              <RefreshCw
                className={loading ? "animate-spin" : ""}
                aria-hidden="true"
              />
            </button>
          }
        />

        <OperationsKpiGrid>
          {cards.map(({ label, value, subtitle, icon }) => (
            <OperationsMetricCard
              key={label}
              title={label}
              value={value}
              description={subtitle}
              icon={icon}
            />
          ))}
        </OperationsKpiGrid>

        {notice ? (
          <div
            role="status"
            aria-live="polite"
            className={
              notice.type === "success"
                ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                : "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-300"
            }
          >
            {notice.text}
          </div>
        ) : null}

        <OperationsExecutiveGrid data-four-page-two-card-workspace>
          <OperationsPanel
            className="min-w-0 overflow-hidden"
            dir={isArabic ? "rtl" : "ltr"}
            data-operational-list-card
          >
            <OperationsPanelHeader
              title={isArabic ? "الوكلاء" : "Agents"}
              description={isArabic ? "قائمة التشغيل الفعلية" : "Live operating list"}
              icon={Bot}
              meta={<span className={operationsVisual.counterBadge}>{agents.length}</span>}
            />

            <div className="orca-operations-flow-region">
              {loading && agents.length === 0 ? (
                <div className="grid gap-2 p-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[76px] animate-pulse rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)]"
                    />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <div className="p-3">
                  <OperationsEmptyState>
                    {isArabic
                      ? "لا توجد وكالات مهيأة. حدّث البيانات بعد مراجعة إعدادات الوكلاء."
                      : "No agents are configured. Refresh after reviewing agent settings."}
                  </OperationsEmptyState>
                </div>
              ) : (
                <OperationsMasterList>
                  {agents.map((agent) => {
                    const selectedRow = selected?.id === agent.id;
                    const meta = statusMeta(agent.runtimeStatus, isArabic);
                    return (
                      <OperationsMasterRow
                        key={agent.id}
                        selected={selectedRow}
                        onClick={() => setSelectedId(agent.id)}
                        aria-pressed={selectedRow}
                        className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                      >
                        <span className={operationsVisual.iconTile} aria-hidden="true">
                          <i
                            className={`ph-bold ${ICONS[agent.agentType] || "ph-robot"}`}
                          />
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-xs font-black text-[var(--nc-text-primary)]">
                            {agentName(agent, isArabic)}
                          </strong>
                          <span className="mt-1 block truncate text-[10px] text-[var(--nc-text-secondary)]">
                            {agentResponsibility(agent, isArabic)}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </OperationsMasterRow>
                    );
                  })}
                </OperationsMasterList>
              )}
            </div>
          </OperationsPanel>

          <OperationsPanel
            className="min-w-0 overflow-hidden"
            dir={isArabic ? "rtl" : "ltr"}
            data-operational-detail-card
          >
            {!providerConfigured ? (
              <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[10px] font-bold text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{isArabic ? "مزود الذكاء الاصطناعي غير مهيأ؛ الوظائف المستقلة فقط متاحة." : "AI provider is not configured; provider-independent operations only."}</span>
              </div>
            ) : null}
            {selected ? (
              <>
                <div className="shrink-0 border-b border-[var(--nc-border)] p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={operationsVisual.meta}>
                        {isArabic ? "تفاصيل الوكيل" : "Agent details"}
                      </p>
                      <h2 className={`${operationsVisual.sectionTitle} mt-1 truncate`}>
                        {agentName(selected, isArabic)}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusMeta(selected.runtimeStatus, isArabic).className}`}
                    >
                      {statusMeta(selected.runtimeStatus, isArabic).label}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-6 text-[var(--nc-text-secondary)]">
                    {agentResponsibility(selected, isArabic)}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Info
                      label={isArabic ? "نمط التنفيذ" : "Execution mode"}
                      value={
                        selected.supportsManualRun
                          ? isArabic
                            ? "يدوي + تلقائي"
                            : "Manual + automatic"
                          : isArabic
                            ? "تلقائي فقط"
                            : "Automatic only"
                      }
                    />
                    <Info
                      label={isArabic ? "آخر نشاط" : "Last activity"}
                      value={formatDateTime(selected.lastActivityAt)}
                      dir="ltr"
                    />
                  </div>

                  {canManage ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--nc-border)] pt-3">
                      <button
                        type="button"
                        disabled={busyId === selected.id}
                        onClick={() => void updateAgent(selected)}
                        className={
                          selected.isActive
                            ? operationsVisual.secondaryButton
                            : operationsVisual.primaryButton
                        }
                      >
                        {busyId === selected.id ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : selected.isActive ? (
                          <ShieldAlert aria-hidden="true" />
                        ) : (
                          <CheckCircle2 aria-hidden="true" />
                        )}
                        {selected.isActive
                          ? isArabic
                            ? "إيقاف الوكيل"
                            : "Stop agent"
                          : isArabic
                            ? "تفعيل الوكيل"
                            : "Activate agent"}
                      </button>

                      {selected.isActive && selected.supportsManualRun ? (
                        <button
                          type="button"
                          disabled={busyId === selected.id}
                          onClick={() => void runAgent(selected)}
                          className={operationsVisual.primaryButton}
                        >
                          {busyId === selected.id ? (
                            <Loader2 className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Play aria-hidden="true" />
                          )}
                          {isArabic ? "تشغيل الآن" : "Run now"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-2">
                    <div>
                      <p className={operationsVisual.meta}>
                        {isArabic ? "النشاط المثبت" : "Recorded activity"}
                      </p>
                      <h3 className="mt-0.5 text-xs font-black">
                        {isArabic ? "سجل التشغيل والنتائج" : "Runtime history"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadLogs(selected.id)}
                      disabled={loadingLogs}
                      className={operationsVisual.iconButton}
                      aria-label={isArabic ? "تحديث سجل الوكيل" : "Refresh agent history"}
                      title={isArabic ? "تحديث السجل" : "Refresh history"}
                    >
                      <RefreshCw
                        className={loadingLogs ? "animate-spin" : ""}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <OperationsScrollRegion scrollRole="log">
                    {loadingLogs ? (
                      <div className="grid min-h-[150px] place-items-center">
                        <Loader2
                          className="animate-spin text-[var(--nc-text-secondary)]"
                          aria-label={isArabic ? "جارٍ تحميل السجل" : "Loading history"}
                        />
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="p-3">
                        <OperationsEmptyState>
                          {isArabic
                            ? "لا توجد أحداث تشغيلية مسجلة لهذا الوكيل."
                            : "No runtime events are recorded for this agent."}
                        </OperationsEmptyState>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--nc-border)]">
                        {logs.map((log) => (
                          <article key={log.eventKey} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black text-[var(--nc-text-primary)]">
                                {log.severity === "Critical"
                                  ? isArabic
                                    ? "خطأ تشغيلي"
                                    : "Operational error"
                                  : log.severity === "Warning"
                                    ? isArabic
                                      ? "تنبيه تشغيلي"
                                      : "Operational warning"
                                    : isArabic
                                      ? "نتيجة تشغيلية"
                                      : "Operational result"}
                              </span>
                              <time
                                className="text-[10px] text-[var(--nc-text-dim)]"
                                dir="ltr"
                              >
                                {formatDateTime(log.createdAt)}
                              </time>
                            </div>
                            <p className="mt-1.5 text-[11px] leading-5 text-[var(--nc-text-secondary)]">
                              {isArabic
                                ? log.messageAr || "تم تسجيل حدث تشغيلي."
                                : log.actionType.toLowerCase().replaceAll("_", " ")}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </OperationsScrollRegion>
                </div>
              </>
            ) : (
              <div className="p-3">
                <OperationsEmptyState>
                  {isArabic
                    ? "اختر وكيلاً من القائمة لعرض حالته وسجل تشغيله."
                    : "Select an agent to view its state and runtime history."}
                </OperationsEmptyState>
              </div>
            )}
          </OperationsPanel>
        </OperationsExecutiveGrid>
      </div>
    </section>
  );
}

function Info({
  label,
  value,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-2.5">
      <p className="text-[9px] font-bold text-[var(--nc-text-dim)]">{label}</p>
      <div
        className="mt-1 min-w-0 break-words text-[11px] font-black text-[var(--nc-text-primary)]"
        dir={dir}
      >
        {value}
      </div>
    </div>
  );
}
