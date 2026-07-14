"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";

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
    AGENT_DISABLED: ["الوكيل متوقف. فعّله أولًا.", "The agent is stopped. Activate it first."],
    AGENT_DUPLICATE_RUN: ["تم منع تشغيل مكرر. حاول بعد دقيقة.", "A duplicate run was blocked. Try again shortly."],
    AGENT_RUNTIME_BLOCKED: ["سياسة التشغيل الحالية تمنع التنفيذ المباشر.", "The current operating policy blocks direct execution."],
    AGENT_RUN_FAILED: ["تعذر إكمال تشغيل الوكيل. راجع السجل.", "The agent run could not be completed. Review the log."],
    AGENT_FORBIDDEN: ["لا تملك صلاحية إدارة الوكلاء.", "You do not have permission to manage agents."],
  };
  const value = messages[String(code || "")];
  return value ? value[isArabic ? 0 : 1] : isArabic ? "تعذر إكمال العملية." : "The operation could not be completed.";
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
    if (selected?.id) {
      void loadLogs(selected.id);
    }
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

  const cards = [
    {
      label: isArabic ? "الوكلاء المهيأون" : "Configured agents",
      value: agents.length,
    },
    {
      label: isArabic ? "الوكلاء النشطون" : "Active agents",
      value: activeCount,
    },
    {
      label: isArabic ? "تحتاج متابعة" : "Need attention",
      value: attentionCount,
    },
    {
      label: isArabic ? "العملاء / الفريق" : "Leads / team",
      value: `${totalLeads} / ${totalUsers}`,
    },
  ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="nc-page nc-stack orca-container pb-4"
      data-agents-workspace
    >
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {isArabic
              ? "المحادثة ← اقتراح ← اعتماد ← تنفيذ ← سجل"
              : "Conversation → suggestion → approval → execution → log"}
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {isArabic ? "الوكلاء التشغيليون" : "Operational agents"}
          </h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {isArabic
              ? "تشغيل الوكلاء ومراجعة حالتهم ونتائجهم وسجلهم التشغيلي من مساحة موحّدة."
              : "Run agents and review their status, results, and runtime history from one workspace."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void loadAgents()}
            disabled={loading}
            className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isArabic ? "تحديث البيانات" : "Refresh data"}
          </button>
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {cards.map((card, index) => {
          const Icon = [Bot, Zap, AlertTriangle, Users][index] || Bot;

          return (
            <div key={card.label} className="orca-workspace-metric min-h-[96px]">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--nc-text-secondary)]">
                <span>{card.label}</span>
                <Icon size={17} aria-hidden="true" />
              </div>
              <strong className="mt-3 block text-2xl" dir="ltr">
                {card.value}
              </strong>
            </div>
          );
        })}
      </div>

      {notice && (
        <div
          role="status"
          className={
            notice.type === "success"
              ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
              : "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
          }
        >
          {notice.text}
        </div>
      )}

      {!providerConfigured && (
        <div className="orca-workspace-note flex items-start gap-3 border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">
              {isArabic ? "مزود الذكاء الاصطناعي غير مهيأ" : "AI provider is not configured"}
            </p>
            <p className="mt-1 text-xs leading-6">
              {isArabic
                ? "ستبقى الوظائف المستقلة متاحة، ولن تُعرض نتيجة نجاح غير حقيقية."
                : "Provider-independent operations remain available, and no false success will be shown."}
            </p>
          </div>
        </div>
      )}

      <div
        dir="ltr"
        className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_390px]"
        data-four-page-two-card-workspace
      >
        <section
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-list-card
        >
          <header className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-[var(--nc-accent)]">
                {isArabic ? "قائمة التشغيل" : "Operating list"}
              </p>
              <h2 className="mt-1 text-base font-black">
                {isArabic ? "بطاقات الوكلاء" : "Agent cards"}
              </h2>
            </div>
            <span className="text-xs font-bold text-[var(--nc-text-secondary)]">
              {agents.length}
            </span>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading && agents.length === 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[132px] animate-pulse rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]"
                  />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center">
                <div className="max-w-md">
                  <Bot
                    className="mx-auto h-8 w-8 text-[var(--nc-accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-base font-black">
                    {isArabic ? "لا توجد وكالات مهيأة" : "No agents are configured"}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--nc-text-secondary)]">
                    {isArabic
                      ? "راجع إعدادات الوكلاء ثم حدّث البيانات لعرض الوكلاء هنا."
                      : "Review agent settings, then refresh the data to display agents here."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {agents.map((agent) => {
                  const meta = statusMeta(agent.runtimeStatus, isArabic);
                  const name = isArabic
                    ? agent.definition?.nameAr || "وكيل تشغيلي"
                    : agent.definition?.nameEn || "Operational agent";
                  const responsibility = isArabic
                    ? agent.definition?.responsibilityAr || "غير محدد"
                    : agent.definition?.responsibilityEn || "Not specified";
                  const selectedCard = selected?.id === agent.id;

                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedId(agent.id)}
                      aria-pressed={selectedCard}
                      className={`min-h-[132px] rounded-2xl border p-4 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                        selectedCard
                          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
                          : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg text-[var(--nc-foreground)]">
                          <i
                            className={`ph-bold ${ICONS[agent.agentType] || "ph-robot"}`}
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          className={`inline-flex min-w-[104px] justify-center rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-sm font-black text-[var(--nc-foreground)]">
                        {name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--nc-text-secondary)]">
                        {responsibility}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-detail-card
        >
          {selected ? (
            <>
              <div className="shrink-0 border-b border-[var(--nc-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--nc-accent)]">
                      {isArabic ? "تفاصيل الوكيل" : "Agent details"}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black text-[var(--nc-foreground)]">
                      {isArabic
                        ? selected.definition?.nameAr || "وكيل تشغيلي"
                        : selected.definition?.nameEn || "Operational agent"}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                      statusMeta(selected.runtimeStatus, isArabic).className
                    }`}
                  >
                    {statusMeta(selected.runtimeStatus, isArabic).label}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-6 text-[var(--nc-text-secondary)]">
                  {isArabic
                    ? selected.definition?.responsibilityAr || "غير محدد"
                    : selected.definition?.responsibilityEn || "Not specified"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3">
                    <p className="text-[var(--nc-text-secondary)]">
                      {isArabic ? "نمط التنفيذ" : "Execution mode"}
                    </p>
                    <p className="mt-1 font-bold text-[var(--nc-foreground)]">
                      {selected.supportsManualRun
                        ? isArabic
                          ? "يدوي وتلقائي"
                          : "Manual and automatic"
                        : isArabic
                          ? "تلقائي"
                          : "Automatic"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3">
                    <p className="text-[var(--nc-text-secondary)]">
                      {isArabic ? "آخر نشاط" : "Last activity"}
                    </p>
                    <p className="mt-1 font-bold text-[var(--nc-foreground)]" dir="ltr">
                      {formatDateTime(selected.lastActivityAt)}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === selected.id}
                      onClick={() => void updateAgent(selected)}
                      className={
                        selected.isActive
                          ? "nc-btn nc-btn-ghost min-h-[44px] flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-700 disabled:opacity-50 dark:text-rose-300"
                          : "nc-btn-primary inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-black disabled:opacity-50"
                      }
                    >
                      {busyId === selected.id
                        ? isArabic
                          ? "جارٍ التنفيذ..."
                          : "Working..."
                        : selected.isActive
                          ? isArabic
                            ? "إيقاف الوكيل"
                            : "Stop agent"
                          : isArabic
                            ? "تفعيل الوكيل"
                            : "Activate agent"}
                    </button>

                    {selected.isActive && selected.supportsManualRun && (
                      <button
                        type="button"
                        disabled={busyId === selected.id}
                        onClick={() => void runAgent(selected)}
                        className="min-h-[44px] flex-1 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-bold text-slate-950 disabled:opacity-50"
                      >
                        {isArabic ? "تشغيل الآن" : "Run now"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-[56px] shrink-0 items-center justify-between border-b border-[var(--nc-border)] px-4 py-2">
                  <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                    {isArabic ? "سجل التشغيل والنتائج" : "Runtime history"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => void loadLogs(selected.id)}
                    disabled={loadingLogs}
                    className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-3 text-xs font-bold disabled:opacity-50"
                  >
                    {isArabic ? "تحديث" : "Refresh"}
                  </button>
                </div>

                <div className="min-h-0 flex-1 divide-y divide-[var(--nc-border)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {loadingLogs && (
                    <p className="p-6 text-sm text-[var(--nc-text-secondary)]">
                      {isArabic ? "جارٍ تحميل السجل..." : "Loading history..."}
                    </p>
                  )}

                  {!loadingLogs &&
                    logs.map((log) => (
                      <article key={log.eventKey} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-[var(--nc-foreground)]">
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
                            className="text-[11px] text-[var(--nc-text-dim)]"
                            dir="ltr"
                          >
                            {formatDateTime(log.createdAt)}
                          </time>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-[var(--nc-text-secondary)]">
                          {isArabic
                            ? log.messageAr || "تم تسجيل حدث تشغيلي."
                            : log.actionType
                                .toLowerCase()
                                .replaceAll("_", " ")}
                        </p>
                      </article>
                    ))}

                  {!loadingLogs && logs.length === 0 && (
                    <div className="flex h-full min-h-[140px] items-center justify-center p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                      {isArabic
                        ? "لا توجد أحداث تشغيلية مسجلة."
                        : "No runtime events are recorded."}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <Bot
                  className="mx-auto h-8 w-8 text-[var(--nc-accent)]"
                  aria-hidden="true"
                />
                <h2 className="mt-3 text-base font-black">
                  {isArabic ? "تفاصيل الوكيل" : "Agent details"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--nc-text-secondary)]">
                  {isArabic
                    ? "اختر وكيلاً من القائمة لعرض تفاصيله وسجل تشغيله."
                    : "Select an agent from the list to view its details and runtime history."}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
