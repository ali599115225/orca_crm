"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  MessageCircleMore,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { DisplayLocale } from "@/lib/display";
import type { DashboardReadModel } from "../model";
import type { DashboardCopy } from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";
import DealSpineSnapshot from "./DealSpineSnapshot";
import DailyOperationsCenter from "./DailyOperationsCenter";

type AgentRuntimeStatus =
  | "ACTIVE"
  | "STOPPED"
  | "RUNNING"
  | "ATTENTION"
  | "FAILED";

interface AgentSlot {
  id: string;
  agentType: string;
  isActive: boolean;
  runtimeStatus: AgentRuntimeStatus;
}

interface AgentStatusPayload {
  success?: boolean;
  data?: AgentSlot[];
  provider?: { configured?: boolean };
}

interface OperationalSignal {
  key: string;
  label: string;
  value: number;
  href: string;
  agent: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface AgentDecisionCenterProps {
  model: DashboardReadModel;
  copy: DashboardCopy;
  locale: DisplayLocale;
  isArabic: boolean;
  searchQuery: string;
  isAssistantOpen: boolean;
  onCloseAssistant: () => void;
  onRetry: () => void;
}

const roleOrder = [
  { type: "MANSOUR", copyKey: "mansour" },
  { type: "SAHER", copyKey: "saher" },
  { type: "SANAD", copyKey: "sanad" },
  { type: "BASEER", copyKey: "baseer" },
  { type: "KHABEER", copyKey: "khabeer" },
] as const;

const SENTINEL_TYPE = "SENTINEL";

function statusTone(status: AgentRuntimeStatus | "NOT_CONFIGURED") {
  if (status === "ACTIVE" || status === "RUNNING") {
    return {
      dotClassName: "bg-emerald-500",
      textClassName: "text-emerald-700 dark:text-emerald-300",
    };
  }

  if (status === "ATTENTION" || status === "FAILED") {
    return {
      dotClassName: "bg-amber-500",
      textClassName: "text-amber-800 dark:text-amber-300",
    };
  }

  return {
    dotClassName: "bg-slate-400",
    textClassName: "text-slate-700 dark:text-slate-300",
  };
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AgentDecisionCenter({
  model,
  copy,
  locale,
  isArabic,
  searchQuery,
  isAssistantOpen,
  onCloseAssistant,
  onRetry,
}: AgentDecisionCenterProps) {
  const [agents, setAgents] = useState<AgentSlot[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(
    null,
  );
  const [agentsError, setAgentsError] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: copy.assistantWelcome,
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      try {
        const response = await fetch("/api/v1/agents", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as AgentStatusPayload;

        if (!response.ok || !payload.success) {
          throw new Error("AGENTS_UNAVAILABLE");
        }

        if (!cancelled) {
          setAgents(Array.isArray(payload.data) ? payload.data : []);
          setProviderConfigured(Boolean(payload.provider?.configured));
          setAgentsError(false);
        }
      } catch {
        if (!cancelled) {
          setAgents([]);
          setProviderConfigured(null);
          setAgentsError(true);
        }
      }
    };

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== "assistant-welcome") {
        return current;
      }
      return [
        {
          id: "assistant-welcome",
          role: "assistant",
          text: copy.assistantWelcome,
        },
      ];
    });
  }, [copy.assistantWelcome]);

  useEffect(() => {
    if (!isAssistantOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAssistant();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAssistantOpen, onCloseAssistant]);

  const agentByType = useMemo(
    () =>
      new Map(
        agents.map((agent) => [agent.agentType.toUpperCase(), agent] as const),
      ),
    [agents],
  );

  const attentionAgents = agents.filter((agent) =>
    ["ATTENTION", "FAILED"].includes(agent.runtimeStatus),
  ).length;

  const overdueTasks =
    model.operations.tasks.status === "ready"
      ? model.operations.tasks.data.items.filter((task) => task.isOverdue).length
      : null;
  const unreadWhatsapp =
    model.operations.whatsapp.status === "ready"
      ? model.operations.whatsapp.data.unreadMessagesCount
      : null;
  const newLeads =
    model.operations.recentLeads.status === "ready"
      ? model.operations.recentLeads.data.newThisWeek
      : null;
  const activeOffers =
    model.kpis.activeOffers.status === "ready"
      ? model.kpis.activeOffers.data
      : null;

  const signals = useMemo<OperationalSignal[]>(() => {
    const items: OperationalSignal[] = [];

    if (overdueTasks !== null && overdueTasks > 0) {
      items.push({
        key: "tasks",
        label: copy.overdueTasksSignal,
        value: overdueTasks,
        href: "/operations/tasks",
        agent: copy.mansour,
      });
    }
    if (unreadWhatsapp !== null && unreadWhatsapp > 0) {
      items.push({
        key: "whatsapp",
        label: copy.unreadWhatsappSignal,
        value: unreadWhatsapp,
        href: "/operations/whatsapp",
        agent: copy.mansour,
      });
    }
    if (activeOffers !== null && activeOffers > 0) {
      items.push({
        key: "offers",
        label: copy.activeOffersSignal,
        value: activeOffers,
        href: "/operations/offers",
        agent: copy.mansour,
      });
    }
    if (newLeads !== null && newLeads > 0) {
      items.push({
        key: "leads",
        label: copy.newLeadsSignal,
        value: newLeads,
        href: "/operations/leads",
        agent: copy.baseer,
      });
    }
    if (attentionAgents > 0) {
      items.push({
        key: "agents",
        label: copy.agentAttentionSignal,
        value: attentionAgents,
        href: "/operations/agents",
        agent: copy.saher,
      });
    }

    return items;
  }, [
    activeOffers,
    attentionAgents,
    copy.activeOffersSignal,
    copy.agentAttentionSignal,
    copy.baseer,
    copy.mansour,
    copy.newLeadsSignal,
    copy.overdueTasksSignal,
    copy.saher,
    copy.unreadWhatsappSignal,
    newLeads,
    overdueTasks,
    unreadWhatsapp,
  ]);

  const statusLabel = (agent: AgentSlot | undefined) => {
    if (!agent) return copy.notConfigured;
    if (["ATTENTION", "FAILED"].includes(agent.runtimeStatus)) {
      return copy.needsAttention;
    }
    return agent.isActive ? copy.active : copy.stopped;
  };

  const buildAssistantAnswer = (input: string): string => {
    const query = input.trim().toLocaleLowerCase();
    const contains = (...terms: string[]) => terms.some((term) => query.includes(term));

    const prioritySummary = [
      overdueTasks !== null ? `${copy.overdueTasksSignal}: ${overdueTasks}` : null,
      unreadWhatsapp !== null
        ? `${copy.unreadWhatsappSignal}: ${unreadWhatsapp}`
        : null,
      activeOffers !== null ? `${copy.activeOffersSignal}: ${activeOffers}` : null,
      newLeads !== null ? `${copy.newLeadsSignal}: ${newLeads}` : null,
    ].filter((value): value is string => Boolean(value));

    if (contains("مسار", "صفقة", "صفقات", "pipeline", "deal")) {
      if (model.pipeline.status !== "ready") return copy.dataUnavailable;
      const labels = {
        opportunity: copy.opportunity,
        tour: copy.tour,
        offer: copy.offer,
        contract: copy.contract,
        closed: copy.closed,
      };
      return model.pipeline.data.stages
        .map((stage) => `${labels[stage.key]}: ${stage.count}`)
        .join(" · ");
    }

    if (contains("واتساب", "whatsapp", "رسائل", "محادث")) {
      if (model.operations.whatsapp.status !== "ready") {
        return copy.dataUnavailable;
      }
      const data = model.operations.whatsapp.data;
      return `${copy.conversations}: ${data.conversationsCount} · ${copy.newWhatsappLeads}: ${data.newLeadsCount} · ${copy.unreadMessages}: ${data.unreadMessagesCount}`;
    }

    if (contains("وكيل", "وكلاء", "agent", "sentinel")) {
      if (agentsError) return copy.agentsUnavailable;
      const configuredCount = roleOrder.filter((role) =>
        agentByType.has(role.type),
      ).length;
      const activeCount = roleOrder.filter((role) =>
        Boolean(agentByType.get(role.type)?.isActive),
      ).length;
      return `${copy.configured}: ${configuredCount}/5 · ${copy.active}: ${activeCount}/5 · ${copy.needsAttention}: ${attentionAgents}`;
    }

    if (contains("عميل", "عملاء", "lead", "leads")) {
      const activeLeads =
        model.kpis.activeLeads.status === "ready"
          ? model.kpis.activeLeads.data
          : null;
      return activeLeads === null
        ? copy.dataUnavailable
        : `${copy.activeLeads}: ${activeLeads} · ${copy.newLeadsSignal}: ${newLeads ?? copy.dataUnavailable}`;
    }

    if (contains("جولة", "جولات", "tour", "tours")) {
      return model.kpis.todayTours.status === "ready"
        ? `${copy.todayTours}: ${model.kpis.todayTours.data}`
        : copy.dataUnavailable;
    }

    if (contains("عرض", "عروض", "offer", "offers")) {
      return activeOffers === null
        ? copy.dataUnavailable
        : `${copy.activeOffers}: ${activeOffers}`;
    }

    if (contains("عقد", "عقود", "contract", "contracts")) {
      return model.kpis.signedContractsThisMonth.status === "ready"
        ? `${copy.signedContracts}: ${model.kpis.signedContractsThisMonth.data}`
        : copy.dataUnavailable;
    }

    if (contains("أولو", "اولو", "اليوم", "priority", "priorities", "status")) {
      return prioritySummary.length > 0
        ? prioritySummary.join(" · ")
        : copy.noOperationalSignals;
    }

    return prioritySummary.length > 0
      ? `${copy.assistantGeneralAnswer} ${prioritySummary.join(" · ")}`
      : copy.noOperationalSignals;
  };

  const sendMessage = (rawValue?: string) => {
    const value = (rawValue ?? draft).trim();
    if (!value) return;

    const response = buildAssistantAnswer(value);
    setMessages((current) => [
      ...current,
      { id: messageId("user"), role: "user", text: value },
      { id: messageId("assistant"), role: "assistant", text: response },
    ]);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const ArrowIcon = isArabic ? ChevronLeft : ChevronRight;
  const sentinelAgent = agentByType.get(SENTINEL_TYPE);

  const renderAgentRow = (
    name: string,
    agent: AgentSlot | undefined,
    isSentinel = false,
  ) => {
    const status = agent?.runtimeStatus || "NOT_CONFIGURED";
    const tone = statusTone(status);

    return (
      <div
        className={`flex h-11 min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
          isSentinel
            ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
            : "border-[var(--nc-border)] bg-[var(--nc-surface-solid)]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isSentinel ? (
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-[var(--nc-accent)]"
              aria-hidden="true"
            />
          ) : (
            <Bot
              className="h-4 w-4 shrink-0 text-[var(--nc-text-dim)]"
              aria-hidden="true"
            />
          )}
          <span className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
            {name}
          </span>
        </div>

        <span
          className={`inline-flex min-w-[96px] shrink-0 items-center justify-center gap-1.5 text-[11px] font-bold ${tone.textClassName}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${tone.dotClassName}`}
            aria-hidden="true"
          />
          {isSentinel && !agent ? copy.coordinator : statusLabel(agent)}
        </span>
      </div>
    );
  };

  const suggestions = [
    copy.questionPriorities,
    copy.questionPipeline,
    copy.questionWhatsapp,
    copy.questionAgents,
  ];

  return (
    <>
      <section
        className="grid gap-4 xl:grid-cols-12"
        dir="ltr"
        data-dashboard-executive-grid
      >
        <div className="min-w-0 xl:col-span-8" dir={isArabic ? "rtl" : "ltr"}>
          <DealSpineSnapshot
            pipeline={model.pipeline}
            copy={copy}
            onRetry={onRetry}
          />
        </div>

        <aside
          className={`${dashboardVisual.sectionPanel} flex min-h-[310px] flex-col overflow-hidden p-5 xl:col-span-4 xl:h-[310px] xl:max-h-[310px]`}
          dir={isArabic ? "rtl" : "ltr"}
          data-dashboard-card="decision"
          data-dashboard-decision-center
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className={dashboardVisual.iconTile}>
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className={dashboardVisual.sectionTitle}>
                  {copy.decisionCenterTitle}
                </h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {copy.decisionCenterDescription}
                </p>
              </div>
            </div>
            <span className={dashboardVisual.statusBadge}>{copy.live}</span>
          </div>

          <div className="dashboard-scroll-area mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {signals.length === 0 ? (
              <div className="grid h-full min-h-[170px] place-items-center rounded-xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4 text-center text-xs text-[var(--nc-text-secondary)]">
                {copy.noOperationalSignals}
              </div>
            ) : (
              <div className="space-y-2">
                {signals.slice(0, 3).map((signal) => (
                  <Link
                    key={signal.key}
                    href={signal.href}
                    className={`${dashboardVisual.interactiveContentCard} flex h-[58px] min-h-[58px] items-center justify-between gap-3 px-3 py-2.5`}
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-[var(--nc-text-primary)]">
                        {signal.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">
                        {signal.agent}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <strong className="text-lg font-black text-[var(--nc-text-primary)]">
                        {signal.value}
                      </strong>
                      <ArrowIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-12" dir="ltr">
        <div className="min-w-0 xl:col-span-8" dir={isArabic ? "rtl" : "ltr"}>
          <DailyOperationsCenter
            operations={model.operations}
            copy={copy}
            locale={locale}
            isArabic={isArabic}
            searchQuery={searchQuery}
            onRetry={onRetry}
          />
        </div>

        <aside
          className={`${dashboardVisual.sectionPanel} flex min-h-[390px] flex-col overflow-hidden p-5 xl:col-span-4 xl:h-[430px] xl:min-h-[430px] xl:max-h-[430px]`}
          dir={isArabic ? "rtl" : "ltr"}
          data-dashboard-card="agents"
          data-dashboard-agent-status
        >
          <div className="flex items-start gap-3">
            <span className={dashboardVisual.iconTile}>
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className={dashboardVisual.sectionTitle}>
                {copy.agentStatusTitle}
              </h2>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                {copy.agentStatusDescription}
              </p>
            </div>
          </div>

          {providerConfigured === false && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copy.providerNotConfigured}
            </div>
          )}

          <div className="dashboard-scroll-area mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {agentsError ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-700 dark:text-red-300">
                {copy.agentsUnavailable}
              </div>
            ) : (
              <div className="space-y-2">
                {roleOrder.map((role) => (
                  <div key={role.type}>
                    {renderAgentRow(
                      copy[role.copyKey],
                      agentByType.get(role.type),
                    )}
                  </div>
                ))}
                {renderAgentRow(copy.sentinel, sentinelAgent, true)}
              </div>
            )}
          </div>

          <Link
            href="/operations/agents"
            className={`${dashboardVisual.secondaryLink} mt-2 shrink-0`}
          >
            {copy.openAgents}
            <ArrowIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      {isAssistantOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] bg-slate-950/80"
              role="presentation"
              data-orca-assistant-drawer
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label={copy.close}
                onClick={onCloseAssistant}
              />

              <aside
                className={`absolute inset-y-0 flex w-full max-w-[460px] flex-col border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-2xl ${
                  isArabic ? "left-0 border-r" : "right-0 border-l"
                }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="orca-assistant-title"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={dashboardVisual.iconTile}>
                      <MessageCircleMore
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="orca-assistant-title"
                        className="text-lg font-black text-[var(--nc-text-primary)]"
                      >
                        {copy.assistantTitle}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {copy.assistantDescription}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onCloseAssistant}
                    className="nc-btn-secondary inline-flex min-h-11 shrink-0 items-center gap-2 px-3"
                    aria-label={copy.close}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span>{copy.close}</span>
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pt-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent_0,black_2rem,black_100%)]">
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => sendMessage(suggestion)}
                        className="min-h-9 rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 text-xs font-bold text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-accent-border)] hover:text-[var(--nc-accent)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3" aria-live="polite">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                            message.role === "user"
                              ? "bg-[var(--nc-accent)] text-slate-950"
                              : "border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-primary)]"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[var(--nc-text-dim)]">
                    {copy.assistantDataNotice}
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="shrink-0 border-t border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4"
                >
                  <label className="sr-only" htmlFor="orca-assistant-input">
                    {copy.assistantInputLabel}
                  </label>
                  <div className="flex items-end gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-2 focus-within:border-[var(--nc-accent-border)] focus-within:ring-2 focus-within:ring-[var(--nc-accent)]/20">
                    <textarea
                      id="orca-assistant-input"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      rows={2}
                      placeholder={copy.assistantInputPlaceholder}
                      className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)]"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="nc-btn-primary grid h-11 min-h-11 w-11 min-w-11 place-items-center rounded-xl p-0 shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={copy.sendMessage}
                    >
                      <SendHorizontal
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </form>
              </aside>
            </div>,
            document.body,
          )
        : null}

    </>
  );
}
