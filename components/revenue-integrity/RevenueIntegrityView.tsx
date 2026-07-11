"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import {
  acknowledgeRevenueRiskAction,
  analyzeConversationAction,
  approveRevenueSuggestionAction,
  executeRevenueSuggestionAction,
  getIntelligenceScoresAction,
  linkRevenueSuggestionLeadAction,
  listRevenueLinkableLeadsAction,
  processRevenueOutboxAction,
  rejectRevenueSuggestionAction,
  resolveRevenueRiskAction,
  runRevenueRadarAction,
  scoreAllIntelligenceAction,
} from "@/app/actions/revenue-integrity";
import {
  displayPredictionReason,
  displayRevenueIntegrityError,
  displayRevenueIntegrityValue,
  displayRevenueModelVersion,
  expiryLabel,
  horizonLabel,
  intelligenceRiskClass,
  intelligenceRiskLevel,
  riskBandClass,
  riskBandLabel,
  safeDisplayId,
} from "@/lib/display/revenueIntegrity";
import type { RevenueCapabilities } from "@/lib/revenue-integrity/authorization";
import type { RevenueIntegrityDashboard } from "@/lib/revenue-integrity/queries";
import { dashboardVisual } from "@/features/dashboard/visual";
import { leadVisual } from "@/features/leads/visual";
import InteractiveSurface from "@/components/ui/InteractiveSurface";
import { revenueVisual, revenueStatusTone } from "./visual";

type Tab = "radar" | "actions" | "audit" | "predictive";

/** Unified list/table page size across every card on this page. */
const REVENUE_CARD_PAGE_SIZE = 4;

/** Suggestion types that cannot execute before a lead is linked. */
const LEAD_REQUIRED_SUGGESTION_TYPES = [
  "FOLLOW_UP",
  "COLLECTION_FOLLOW_UP",
  "CREATE_TASK",
  "SCHEDULE_TOUR",
];

function suggestionNeedsLeadLink(suggestion: {
  actionType: string;
  leadId?: string | null;
}): boolean {
  return (
    LEAD_REQUIRED_SUGGESTION_TYPES.includes(suggestion.actionType) &&
    !suggestion.leadId
  );
}

type Props = {
  initialData: RevenueIntegrityDashboard;
  capabilities: RevenueCapabilities;
};

const TAB_LABELS: Record<Tab, { ar: string; en: string }> = {
  radar: { ar: "رادار تسرب الإيراد", en: "Revenue Leak Radar" },
  actions: { ar: "المحادثة إلى إجراء", en: "Conversation to Action" },
  audit: { ar: "الأحداث والتدقيق", en: "Events & Audit" },
  predictive: { ar: "الذكاء التنبؤي", en: "Predictive Intelligence" },
};

const PANEL_CLASS = `${dashboardVisual.panel} p-5`;
const CONTENT_CARD_CLASS = dashboardVisual.contentCard;
const INTERACTIVE_ROW_CLASS = leadVisual.interactiveRow;
const TABLE_ROW_CLASS = "transition-colors hover:bg-[var(--nc-accent-soft)] focus-within:bg-[var(--nc-accent-soft)]";
const SECONDARY_BUTTON_CLASS = revenueVisual.secondaryButton;
const PRIMARY_BUTTON_CLASS = revenueVisual.primaryButton;

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** KPI cards only: keeps the number on one line at every card width. */
function formatMoneyCompact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusClass = revenueStatusTone;

function StatusBadge({
  value,
  lang,
}: {
  value: string;
  lang: "ar" | "en";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(value)}`}
    >
      {displayRevenueIntegrityValue(value, lang)}
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `${PANEL_CLASS} ${className}` : PANEL_CLASS}>
      <div className="mb-4">
        <h2 className={revenueVisual.sectionTitle}>{title}</h2>
        {description ? (
          <p className={revenueVisual.sectionDescription}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={revenueVisual.emptyState}>{children}</div>
  );
}

function Pager({
  page,
  totalPages,
  disabled,
  onPage,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPage: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--nc-border)] pt-4">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className={SECONDARY_BUTTON_CLASS}
      >
        {previousLabel}
      </button>
      <span className="text-xs font-bold text-[var(--nc-text-secondary)]">
        {pageLabel}
      </span>
      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={SECONDARY_BUTTON_CLASS}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function PredictiveTab({
  lang,
  isArabic,
  locale,
  globalPending,
  canManage,
}: {
  lang: "ar" | "en";
  isArabic: boolean;
  locale: string;
  globalPending: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [scoring, startScoring] = useTransition();
  const [loading, startLoading] = useTransition();
  const [pageData, setPageData] = useState<any>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const L = (ar: string, en: string) => (isArabic ? ar : en);

  function fetchPage(nextPage: number) {
    setMessage(null);
    startLoading(async () => {
      const result = await getIntelligenceScoresAction({
        page: nextPage,
        pageSize: REVENUE_CARD_PAGE_SIZE,
      });
      if (!result.success) {
        setMessage({
          type: "error",
          text: displayRevenueIntegrityError(result.error, lang),
        });
        return;
      }
      setPageData(result.data);
      setPage(nextPage);
    });
  }

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runScoring() {
    setMessage(null);
    startScoring(async () => {
      const result = await scoreAllIntelligenceAction();
      if (!result.success) {
        setMessage({
          type: "error",
          text: displayRevenueIntegrityError(result.error, lang),
        });
        return;
      }
      setMessage({
        type: "success",
        text: L(
          "اكتمل تقييم الفرص المفتوحة.",
          "Open opportunities were scored.",
        ),
      });
      fetchPage(1);
      router.refresh();
    });
  }

  const pending = globalPending || scoring || loading;
  const items = pageData?.items ?? [];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(18rem,0.8fr)]">
      <Panel
        title={L("لوحة الذكاء التنبؤي", "Predictive Intelligence")}
        description={L(
          "تحليل حتمي قائم على قواعد وإشارات الإيراد الحالية.",
          "Rule-based deterministic analysis using current revenue signals.",
        )}
        className="min-w-0 self-start h-fit"
      >
        <dl className={`${revenueVisual.softCard} space-y-3 text-xs`}>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--nc-text-secondary)]">
              {L("حجم الصفحة", "Page size")}
            </dt>
            <dd className="font-black text-[var(--nc-text-primary)]">
              {REVENUE_CARD_PAGE_SIZE}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--nc-text-secondary)]">
              {L("إجمالي النتائج", "Total results")}
            </dt>
            <dd className="font-black text-[var(--nc-text-primary)]">
              {pageData?.total ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--nc-text-secondary)]">
              {L("الخوارزمية", "Algorithm")}
            </dt>
            <dd className="text-end font-black text-[var(--nc-text-primary)]">
              {L("تحليل حتمي قائم على القواعد", "Rule-based deterministic")}
            </dd>
          </div>
        </dl>

        {message ? (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-4 ${
              message.type === "error"
                ? revenueVisual.errorNotice
                : revenueVisual.successNotice
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {canManage ? (
            <button
              type="button"
              disabled={pending}
              onClick={runScoring}
              className={PRIMARY_BUTTON_CLASS}
            >
              {scoring
                ? L("جارٍ التقييم...", "Scoring...")
                : L("تشغيل التقييم الآن", "Run scoring now")}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => fetchPage(page)}
            className={SECONDARY_BUTTON_CLASS}
          >
            {L("تحديث النتائج", "Refresh results")}
          </button>
        </div>
      </Panel>

      <Panel
        title={L("نتائج التنبؤ", "Prediction results")}
        description={L(
          "أربع نتائج لكل صفحة دون تمديد الكروت عند غياب البيانات.",
          "Four results per page without stretching empty cards.",
        )}
        className="min-w-0 self-start h-fit"
      >
        {loading && !pageData ? (
          <div className="flex flex-col items-center gap-3 py-6" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent)] border-t-transparent" />
            <span className="text-xs text-[var(--nc-text-secondary)]">
              {L("جارٍ التحميل...", "Loading...")}
            </span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState>
            {L(
              "لا توجد نتائج بعد. شغّل التقييم لإنشاء النتائج.",
              "No results yet. Run scoring to generate results.",
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {items.map((item: any) => {
              const expanded = expandedId === item.id;
              const insufficient = item.status === "INSUFFICIENT_DATA";
              const riskLabel = insufficient
                ? ""
                : item.riskBand
                  ? riskBandLabel(item.riskBand, lang)
                  : intelligenceRiskLevel(item.score ?? 0, lang);
              const riskClass = item.riskBand
                ? riskBandClass(item.riskBand)
                : intelligenceRiskClass(item.score ?? 0);

              return (
                <li key={item.id} className="rounded-xl p-4">
                  <button
                    type="button"
                    className={`w-full text-start focus:outline-none ${INTERACTIVE_ROW_CLASS}`}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    aria-expanded={expanded}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-xs text-[var(--nc-text-primary)]">
                            {safeDisplayId(item.entityId, lang) || L("كيان", "Entity")}
                          </strong>
                          <StatusBadge value={item.category} lang={lang} />
                          <StatusBadge value={item.status} lang={lang} />
                        </div>
                        {insufficient ? (
                          <p className="mt-2 text-xs text-[var(--nc-text-secondary)]">
                            {L(
                              "بيانات غير كافية. شغّل الرادار أولًا.",
                              "Insufficient data. Run radar first.",
                            )}
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            <strong className="text-[var(--nc-text-primary)]">
                              {item.score}/100
                            </strong>
                            <span className="text-[var(--nc-text-secondary)]">
                              {item.confidence}% {L("ثقة", "confidence")}
                            </span>
                            <span className={`font-bold ${riskClass}`}>{riskLabel}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--nc-text-secondary)]">
                        {expanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {expanded ? (
                    <div className="mt-4 space-y-3 border-t border-[var(--nc-border)] pt-4 text-xs">
                      {!insufficient && item.horizonDays ? (
                        <div className="flex flex-wrap gap-4 text-[var(--nc-text-secondary)]">
                          <span>
                            {L("الأفق:", "Horizon:")}{" "}
                            <strong className="text-[var(--nc-text-primary)]">
                              {horizonLabel(item.horizonDays, lang)}
                            </strong>
                          </span>
                          <span>
                            {L("الانتهاء:", "Expires:")}{" "}
                            <strong className="text-[var(--nc-text-primary)]">
                              {expiryLabel(item.expiresAt, lang)}
                            </strong>
                          </span>
                        </div>
                      ) : null}

                      {item.recommendedAction ? (
                        <div>
                          <span className="text-[var(--nc-text-secondary)]">
                            {L("الإجراء المقترح:", "Recommended action:")}
                          </span>{" "}
                          <strong className="text-[var(--nc-accent)]">
                            {displayRevenueIntegrityValue(item.recommendedAction, lang)}
                          </strong>
                          <p className="mt-1 text-[10px] text-[var(--nc-text-secondary)]">
                            {L(
                              "اقتراح فقط ولا يُنفذ تلقائيًا.",
                              "Suggestion only; it is never auto-executed.",
                            )}
                          </p>
                        </div>
                      ) : null}

                      {Array.isArray(item.reasons) && item.reasons.length > 0 ? (
                        <div>
                          <p className="mb-1 font-bold text-[var(--nc-text-secondary)]">
                            {L("أهم الأسباب", "Top reasons")}
                          </p>
                          <ul className="space-y-1 text-[var(--nc-text-primary)]">
                            {item.reasons.slice(0, 3).map((reason: any, index: number) => (
                              <li key={index}>
                                · {displayPredictionReason(reason, lang)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {Array.isArray(item.sourceSignals) && item.sourceSignals.length > 0 ? (
                        <div>
                          <p className="mb-1 font-bold text-[var(--nc-text-secondary)]">
                            {L("إشارات المصدر", "Source signals")}
                          </p>
                          <ul className="space-y-1 text-[var(--nc-text-secondary)]">
                            {item.sourceSignals.slice(0, 3).map((signal: any, index: number) => (
                              <li key={index}>
                                · {displayRevenueIntegrityValue(signal.type, lang)}
                                {signal.severity
                                  ? ` (${displayRevenueIntegrityValue(signal.severity, lang)})`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-4 border-t border-[var(--nc-border)] pt-3 text-[10px] text-[var(--nc-text-secondary)]">
                        <span>
                          {L("وقت التوليد:", "Generated:")}{" "}
                          {formatDate(item.generatedAt, locale)}
                        </span>
                        <span>
                          {L("إصدار النموذج:", "Model:")}{" "}
                          {displayRevenueModelVersion(item.modelVersion, lang)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <Pager
          page={page}
          totalPages={pageData?.totalPages ?? 1}
          disabled={pending}
          onPage={fetchPage}
          previousLabel={L("السابق", "Previous")}
          nextLabel={L("التالي", "Next")}
          pageLabel={
            isArabic
              ? `صفحة ${page} من ${pageData?.totalPages ?? 1}`
              : `Page ${page} of ${pageData?.totalPages ?? 1}`
          }
        />
      </Panel>
    </div>
  );
}

export default function RevenueIntegrityView({
  initialData,
  capabilities,
}: Props) {
  const { lang } = useApp();
  const isArabic = lang !== "EN";
  const locale = isArabic ? "ar-SA" : "en-US";
  const langEnum: "ar" | "en" = isArabic ? "ar" : "en";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("radar");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceType, setSourceType] = useState<"WHATSAPP" | "EMAIL" | "SUPPORT" | "MANUAL">("MANUAL");
  const [sourceId, setSourceId] = useState("");
  const [conversationText, setConversationText] = useState("");
  const [reasonDialog, setReasonDialog] = useState<{
    mode: "resolve-risk" | "reject-suggestion";
    id: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [riskPage, setRiskPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [linkDialog, setLinkDialog] = useState<{ suggestionId: string } | null>(
    null,
  );
  const [linkableLeads, setLinkableLeads] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [linkLeadId, setLinkLeadId] = useState("");
  const [leadsLoading, startLeadsLoading] = useTransition();
  const L = (ar: string, en: string) => (isArabic ? ar : en);

  function resetListPages() {
    setRiskPage(1);
    setEventPage(1);
    setAuditPage(1);
    setSuggestionPage(1);
  }

  // البيانات تتجدد عبر router.refresh؛ أعد كل القوائم إلى الصفحة الأولى.
  useEffect(() => {
    resetListPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  function openReasonDialog(
    mode: "resolve-risk" | "reject-suggestion",
    id: string,
  ) {
    dialogReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setReason("");
    setReasonDialog({ mode, id });
  }

  function closeReasonDialog() {
    setReasonDialog(null);
    setReason("");
    dialogReturnFocusRef.current?.focus();
    dialogReturnFocusRef.current = null;
  }

  function openLinkDialog(suggestionId: string) {
    dialogReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLinkLeadId("");
    setLinkDialog({ suggestionId });
    startLeadsLoading(async () => {
      const result = await listRevenueLinkableLeadsAction();
      setLinkableLeads(
        result.success ? (result.data as Array<{ id: string; name: string }>) : [],
      );
    });
  }

  function closeLinkDialog() {
    setLinkDialog(null);
    setLinkLeadId("");
    dialogReturnFocusRef.current?.focus();
    dialogReturnFocusRef.current = null;
  }

  function submitLinkLead() {
    if (!linkDialog || !linkLeadId) return;
    execute(
      () => linkRevenueSuggestionLeadAction(linkDialog.suggestionId, linkLeadId),
      L(
        "تم ربط الاقتراح بالعميل المحتمل. يمكنك تنفيذه الآن.",
        "The suggestion is linked to the lead. You can execute it now.",
      ),
      () => setSuggestionPage(1),
    );
    closeLinkDialog();
  }

  useEffect(() => {
    if (!reasonDialog && !linkDialog) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (reasonDialog) closeReasonDialog();
        else closeLinkDialog();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), textarea, select",
        ),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasonDialog, linkDialog]);

  const visibleTabs = useMemo(() => {
    const tabs: Tab[] = ["radar"];
    if (capabilities.canReadActions) tabs.push("actions");
    if (capabilities.canReadAudit) tabs.push("audit");
    if (capabilities.canReadPredictive) tabs.push("predictive");
    return tabs;
  }, [capabilities]);

  const openRisks = useMemo(
    () =>
      initialData.risks.filter((item: any) =>
        ["OPEN", "ACKNOWLEDGED"].includes(item.status),
      ),
    [initialData.risks],
  );

  function showNotice(type: "error" | "success", text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ type, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 4500);
  }

  function execute(
    task: () => Promise<{ success: boolean; error?: string; data?: unknown }>,
    successText: string,
    onSuccess?: () => void,
  ) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        showNotice(
          "error",
          displayRevenueIntegrityError(result.error, langEnum),
        );
        return;
      }
      showNotice("success", successText);
      onSuccess?.();
      router.refresh();
    });
  }

  const metrics = [
    capabilities.canReadRisks
      ? [L("مخاطر مفتوحة", "Open risks"), initialData.summary.openRisks]
      : null,
    capabilities.canReadRisks
      ? [L("حرجة", "Critical"), initialData.summary.criticalRisks]
      : null,
    capabilities.canReadRisks
      ? [
          L("إيراد معرض للخطر", "Revenue at risk"),
          formatMoneyCompact(initialData.summary.revenueAtRisk, locale),
        ]
      : null,
    capabilities.canReadActions
      ? [L("اقتراحات معلقة", "Pending actions"), initialData.summary.pendingSuggestions]
      : null,
    capabilities.canReadAudit
      ? [L("رسائل ميتة", "Dead letters"), initialData.summary.deadLetters]
      : null,
  ].filter(Boolean) as Array<[string, string | number]>;

  const riskPages = Math.max(
    1,
    Math.ceil(openRisks.length / REVENUE_CARD_PAGE_SIZE),
  );
  const riskItems = openRisks.slice(
    (riskPage - 1) * REVENUE_CARD_PAGE_SIZE,
    riskPage * REVENUE_CARD_PAGE_SIZE,
  );

  const suggestionPages = Math.max(
    1,
    Math.ceil(initialData.suggestions.length / REVENUE_CARD_PAGE_SIZE),
  );
  const suggestionItems = initialData.suggestions.slice(
    (suggestionPage - 1) * REVENUE_CARD_PAGE_SIZE,
    suggestionPage * REVENUE_CARD_PAGE_SIZE,
  );

  const eventPages = Math.max(
    1,
    Math.ceil(initialData.events.length / REVENUE_CARD_PAGE_SIZE),
  );
  const eventItems = initialData.events.slice(
    (eventPage - 1) * REVENUE_CARD_PAGE_SIZE,
    eventPage * REVENUE_CARD_PAGE_SIZE,
  );

  const auditPages = Math.max(
    1,
    Math.ceil(initialData.audits.length / REVENUE_CARD_PAGE_SIZE),
  );
  const auditItems = initialData.audits.slice(
    (auditPage - 1) * REVENUE_CARD_PAGE_SIZE,
    auditPage * REVENUE_CARD_PAGE_SIZE,
  );

  function submitReason() {
    if (!reasonDialog || reason.trim().length < 3) return;

    if (reasonDialog.mode === "resolve-risk") {
      execute(
        () => resolveRevenueRiskAction(reasonDialog.id, reason.trim()),
        L("تم إغلاق الخطر مع حفظ السبب.", "Risk resolved with an audit reason."),
      );
    } else {
      execute(
        () => rejectRevenueSuggestionAction(reasonDialog.id, reason.trim()),
        L("تم رفض الاقتراح مع حفظ السبب.", "Suggestion rejected with an audit reason."),
        () => setSuggestionPage(1),
      );
    }

    closeReasonDialog();
  }

  return (
    <main className={revenueVisual.page} dir={isArabic ? "rtl" : "ltr"}>
      <div className={revenueVisual.shell}>
      <div className="text-sm font-bold text-[var(--nc-text-secondary)]">
        <a
          href="/operations"
          className="transition hover:text-[var(--nc-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]"
        >
          {L("العمليات", "Operations")}
        </a>
        <span className="mx-2">/</span>
        <span className="text-[var(--nc-text-primary)]">
          {L("سلامة الإيراد", "Revenue Integrity")}
        </span>
      </div>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={revenueVisual.pageTitle}>
            {L("سلامة الإيراد العقاري", "Real Estate Revenue Integrity")}
          </h1>
          <p className={revenueVisual.pageDescription}>
            {L(
              "تشغيل المخاطر والإجراءات والتدقيق والتنبؤ من سجل واحد محكوم بالصلاحيات.",
              "Operate risks, actions, audit, and prediction from one permission-governed record.",
            )}
          </p>
        </div>
        {capabilities.canManageRisks ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              execute(
                runRevenueRadarAction,
                L(
                  "اكتمل تقييم قواعد تسرب الإيراد.",
                  "Revenue leakage rules were evaluated.",
                ),
                () => setRiskPage(1),
              )
            }
            className={`${PRIMARY_BUTTON_CLASS} shrink-0`}
          >
            {pending
              ? L("جارٍ التشغيل...", "Running...")
              : L("تشغيل الرادار الآن", "Run radar now")}
          </button>
        ) : null}
      </header>

      {notice ? (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "error"
              ? revenueVisual.errorNotice
              : revenueVisual.successNotice
          }
        >
          {notice.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 auto-rows-fr md:grid-cols-3 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className={`${revenueVisual.metricCard} h-full`}>
            <div className="text-xs font-bold text-[var(--nc-text-secondary)]">
              {label}
            </div>
            <div className="mt-3 break-words text-xl font-black leading-tight text-[var(--nc-text-primary)] sm:text-2xl">
              {value}
            </div>
          </div>
        ))}
      </div>

      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-2"
        aria-label={L("أقسام سلامة الإيراد", "Revenue integrity sections")}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setNotice(null);
              resetListPages();
            }}
            aria-current={activeTab === tab ? "page" : undefined}
            className={
              activeTab === tab ? revenueVisual.activeTab : revenueVisual.tab
            }
          >
            {isArabic ? TAB_LABELS[tab].ar : TAB_LABELS[tab].en}
          </button>
        ))}
      </nav>

      {activeTab === "radar" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(18rem,0.8fr)]">
          <Panel
            title={L("المخاطر النشطة", "Active risks")}
            description={L(
              "كل إشارة مرتبطة بكيان وقيمة ومسؤول وحالة إغلاق.",
              "Every signal is tied to an entity, value, owner, and closure state.",
            )}
            className="min-w-0 self-start h-fit"
          >
            {riskItems.length === 0 ? (
              <EmptyState>
                {L(
                  "لا توجد مخاطر مفتوحة بعد آخر تقييم.",
                  "No open risks after the latest evaluation.",
                )}
              </EmptyState>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-center text-xs">
                    <thead>
                      <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                        <th className="px-3 py-3 text-center">{L("القاعدة", "Rule")}</th>
                        <th className="px-3 py-3 text-center">{L("السبب", "Reason")}</th>
                        <th className="px-3 py-3 text-center">{L("القيمة", "Value")}</th>
                        <th className="px-3 py-3 text-center">{L("الشدة", "Severity")}</th>
                        <th className="px-3 py-3 text-center">{L("الحالة", "Status")}</th>
                        {capabilities.canManageRisks ? (
                          <th className="px-3 py-3 text-center">{L("الإجراء", "Action")}</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {riskItems.map((risk: any) => (
                        <tr
                          key={risk.id}
                          className={`${TABLE_ROW_CLASS} border-b border-[var(--nc-border)] last:border-0`}
                        >
                          <td className="px-3 py-3 font-bold text-[var(--nc-text-primary)]">
                            {displayRevenueIntegrityValue(risk.ruleCode, langEnum)}
                          </td>
                          <td className="max-w-xs px-3 py-3 text-center text-[var(--nc-text-secondary)]">
                            {isArabic ? risk.reasonAr : risk.reasonEn}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-[var(--nc-text-primary)]">
                            {formatMoney(risk.revenueAtRisk, locale)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge value={risk.severity} lang={langEnum} />
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge value={risk.status} lang={langEnum} />
                          </td>
                          {capabilities.canManageRisks ? (
                            <td className="px-3 py-3">
                              <div className="flex justify-center gap-2">
                                {risk.status === "OPEN" ? (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() =>
                                      execute(
                                        () => acknowledgeRevenueRiskAction(risk.id),
                                        L("تم استلام الخطر.", "Risk acknowledged."),
                                      )
                                    }
                                    className={SECONDARY_BUTTON_CLASS}
                                  >
                                    {L("استلام", "Acknowledge")}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    openReasonDialog("resolve-risk", risk.id)
                                  }
                                  className={revenueVisual.successGhostButton}
                                >
                                  {L("إغلاق", "Resolve")}
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={riskPage}
                  totalPages={riskPages}
                  disabled={pending}
                  onPage={setRiskPage}
                  previousLabel={L("السابق", "Previous")}
                  nextLabel={L("التالي", "Next")}
                  pageLabel={
                    isArabic
                      ? `صفحة ${riskPage} من ${riskPages}`
                      : `Page ${riskPage} of ${riskPages}`
                  }
                />
              </>
            )}
          </Panel>

          <Panel title={L("آخر تشغيل", "Latest run")} className="min-w-0 self-start h-fit">
            {initialData.latestRun ? (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-[var(--nc-text-secondary)]">
                    {L("بدأ", "Started")}
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                    {formatDate(initialData.latestRun.startedAt, locale)}
                  </dd>
                </div>
                <div className="grid grid-cols-2 items-start gap-3">
                  <div className={`${CONTENT_CARD_CLASS} text-center`}>
                    <dt className="text-[11px] text-[var(--nc-text-secondary)]">
                      {L("مكتشف", "Detected")}
                    </dt>
                    <dd className="mt-2 text-xl font-black text-[var(--nc-text-primary)]">
                      {initialData.latestRun.detectedCount}
                    </dd>
                  </div>
                  <div className={`${CONTENT_CARD_CLASS} text-center`}>
                    <dt className="text-[11px] text-[var(--nc-text-secondary)]">
                      {L("أُغلق آليًا", "Auto-resolved")}
                    </dt>
                    <dd className="mt-2 text-xl font-black text-[var(--nc-text-primary)]">
                      {initialData.latestRun.resolvedCount}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs text-[var(--nc-text-secondary)]">
                    {L("قواعد متجاوزة", "Skipped rules")}
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                    {Array.isArray(initialData.latestRun.skippedRules)
                      ? initialData.latestRun.skippedRules.length
                      : 0}
                  </dd>
                </div>
              </dl>
            ) : (
              <EmptyState>
                {L("لم يتم تشغيل الرادار بعد.", "The radar has not run yet.")}
              </EmptyState>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === "actions" && capabilities.canReadActions ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(18rem,0.8fr)]">
          <Panel title={L("طابور الاعتماد", "Approval queue")} className="min-w-0 self-start h-fit">
            {suggestionItems.length === 0 ? (
              <EmptyState>
                {L("لا توجد اقتراحات بعد.", "No suggestions yet.")}
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {suggestionItems.map((suggestion: any) => {
                  const executionError =
                    suggestion.executionResult &&
                    typeof suggestion.executionResult.error === "string"
                      ? suggestion.executionResult.error
                      : null;
                  const needsLead = suggestionNeedsLeadLink(suggestion);
                  const canLinkLead =
                    capabilities.canApproveActions &&
                    needsLead &&
                    (["PENDING_APPROVAL", "APPROVED"].includes(
                      suggestion.status,
                    ) ||
                      (suggestion.status === "FAILED" &&
                        String(executionError || "").includes(
                          "LEAD_ID_REQUIRED",
                        )));

                  return (
                    <article key={suggestion.id} className={`${INTERACTIVE_ROW_CLASS} rounded-xl p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-[var(--nc-text-primary)]">
                              {displayRevenueIntegrityValue(
                                suggestion.actionType,
                                langEnum,
                              )}
                            </h3>
                            <StatusBadge value={suggestion.status} lang={langEnum} />
                            <span className="text-[10px] text-[var(--nc-text-secondary)]">
                              {displayRevenueIntegrityValue(
                                suggestion.sourceType,
                                langEnum,
                              )}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--nc-text-secondary)]">
                            {isArabic
                              ? suggestion.rationaleAr
                              : suggestion.rationaleEn}
                          </p>
                          <time className="mt-1 block text-[10px] text-[var(--nc-text-secondary)]">
                            {formatDate(suggestion.createdAt, locale)}
                          </time>
                          {executionError ? (
                            <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
                              {displayRevenueIntegrityError(
                                executionError,
                                langEnum,
                              )}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-end">
                          <div className="text-[11px] text-[var(--nc-text-secondary)]">
                            {L("الثقة", "Confidence")}
                          </div>
                          <div className="mt-1 font-black text-[var(--nc-text-primary)]">
                            {Math.round(suggestion.confidence * 100)}%
                          </div>
                        </div>
                      </div>

                      {capabilities.canApproveActions &&
                      suggestion.status === "PENDING_APPROVAL" ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              execute(
                                () =>
                                  approveRevenueSuggestionAction(suggestion.id),
                                L("تم اعتماد الاقتراح.", "Suggestion approved."),
                                () => setSuggestionPage(1),
                              )
                            }
                            className={PRIMARY_BUTTON_CLASS}
                          >
                            {L("اعتماد", "Approve")}
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              openReasonDialog("reject-suggestion", suggestion.id)
                            }
                            className={revenueVisual.dangerGhostButton}
                          >
                            {L("رفض", "Reject")}
                          </button>
                        </div>
                      ) : null}

                      {needsLead ? (
                        <p
                          className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-300"
                          role="status"
                        >
                          {L(
                            "اربط المحادثة بعميل محتمل قبل تنفيذ المتابعة.",
                            "Link the conversation to a lead before executing the follow-up.",
                          )}
                        </p>
                      ) : null}

                      {canLinkLead ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openLinkDialog(suggestion.id)}
                          className={`mt-3 ${SECONDARY_BUTTON_CLASS}`}
                        >
                          {L("ربط بعميل محتمل", "Link to lead")}
                        </button>
                      ) : null}

                      {capabilities.canApproveActions &&
                      suggestion.status === "APPROVED" &&
                      !needsLead ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            execute(
                              () =>
                                executeRevenueSuggestionAction(suggestion.id),
                              L("تم تنفيذ الاقتراح.", "Suggestion executed."),
                              () => setSuggestionPage(1),
                            )
                          }
                          className={`mt-3 ${PRIMARY_BUTTON_CLASS}`}
                        >
                          {L("تنفيذ", "Execute")}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
                <Pager
                  page={suggestionPage}
                  totalPages={suggestionPages}
                  disabled={pending}
                  onPage={setSuggestionPage}
                  previousLabel={L("السابق", "Previous")}
                  nextLabel={L("التالي", "Next")}
                  pageLabel={
                    isArabic
                      ? `صفحة ${suggestionPage} من ${suggestionPages}`
                      : `Page ${suggestionPage} of ${suggestionPages}`
                  }
                />
              </div>
            )}
          </Panel>

          <Panel
            title={L("تحليل محادثة", "Analyze conversation")}
            description={L(
              "التحليل ينشئ اقتراحًا فقط. التنفيذ يتطلب اعتمادًا بشريًا.",
              "Analysis creates a suggestion only. Execution requires human approval.",
            )}
            className="min-w-0 self-start h-fit"
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const effectiveSourceId =
                  sourceType === "MANUAL"
                    ? `manual-${Date.now()}`
                    : sourceId.trim();

                execute(
                  () =>
                    analyzeConversationAction({
                      sourceType,
                      sourceId: effectiveSourceId,
                      text: conversationText,
                    }),
                  L("تم إنشاء اقتراح للمراجعة.", "Suggestion created for review."),
                  () => {
                    setConversationText("");
                    setSourceId("");
                    setSuggestionPage(1);
                  },
                );
              }}
            >
              <label className={revenueVisual.label}>
                {L("المصدر", "Source")}
                <select
                  value={sourceType}
                  onChange={(event) => {
                    setSourceType(event.target.value as typeof sourceType);
                    setSourceId("");
                  }}
                  className={revenueVisual.select}
                >
                  <option value="MANUAL">{L("يدوي", "Manual")}</option>
                  <option value="WHATSAPP">{L("واتساب", "WhatsApp")}</option>
                  <option value="EMAIL">{L("البريد الإلكتروني", "Email")}</option>
                  <option value="SUPPORT">{L("الدعم", "Support")}</option>
                </select>
              </label>

              {sourceType !== "MANUAL" ? (
                <label className={revenueVisual.label}>
                  {L("مرجع المصدر", "Source reference")}
                  <input
                    value={sourceId}
                    onChange={(event) => setSourceId(event.target.value)}
                    required
                    className={revenueVisual.input}
                  />
                </label>
              ) : null}

              <label className={revenueVisual.label}>
                {L("نص المحادثة", "Conversation text")}
                <textarea
                  value={conversationText}
                  onChange={(event) => setConversationText(event.target.value)}
                  rows={7}
                  required
                  className={`${revenueVisual.textarea} h-40`}
                  placeholder={L(
                    "مثال: أرغب بزيارة فيلا في الرياض غدًا الساعة 17:00 وميزانيتي مليونا ريال.",
                    "Example: I want to visit a villa in Riyadh tomorrow at 17:00; budget is SAR 2 million.",
                  )}
                />
              </label>

              <button
                type="submit"
                disabled={
                  pending ||
                  conversationText.trim().length < 3 ||
                  (sourceType !== "MANUAL" && !sourceId.trim())
                }
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {L("استخراج واقتراح", "Extract and suggest")}
              </button>
            </form>
          </Panel>
        </div>
      ) : null}

      {activeTab === "audit" && capabilities.canReadAudit ? (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel title={L("الأحداث", "Domain events")} className="min-w-0 self-start h-fit">
            {eventItems.length === 0 ? (
              <EmptyState>{L("لا توجد أحداث.", "No events.")}</EmptyState>
            ) : (
              <div className="space-y-2">
                {eventItems.map((event: any) => (
                  <InteractiveSurface
                    key={event.id}
                    variant="card"
                    className="p-4 text-start"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate text-xs text-[var(--nc-text-primary)]">
                        {displayRevenueIntegrityValue(
                          event.eventType,
                          langEnum,
                        )}
                      </strong>
                      <time className="whitespace-nowrap text-[10px] text-[var(--nc-text-dim)]">
                        {formatDate(event.occurredAt, locale)}
                      </time>
                    </div>
                    <div className="mt-2 text-[10px] text-[var(--nc-text-dim)]">
                      {displayRevenueIntegrityValue(
                        event.aggregateType,
                        langEnum,
                      )}{" "}
                      · {safeDisplayId(event.aggregateId, langEnum)}
                    </div>
                  </InteractiveSurface>
                ))}
                <Pager
                  page={eventPage}
                  totalPages={eventPages}
                  onPage={setEventPage}
                  previousLabel={L("السابق", "Previous")}
                  nextLabel={L("التالي", "Next")}
                  pageLabel={
                    isArabic
                      ? `صفحة ${eventPage} من ${eventPages}`
                      : `Page ${eventPage} of ${eventPages}`
                  }
                />
              </div>
            )}
          </Panel>

          <Panel title={L("التدقيق وصندوق الصادر", "Audit & Outbox")} className="min-w-0 self-start h-fit">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                {initialData.outbox.length > 0 ? (
                  initialData.outbox.map((item: any) => (
                    <span key={item.status} className="inline-flex items-center gap-1.5">
                      <StatusBadge value={item.status} lang={langEnum} />
                      <span className="text-xs font-black text-[var(--nc-text-primary)]">{item.count}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-[var(--nc-text-secondary)]">
                    {L("لا توجد رسائل.", "No messages.")}
                  </span>
                )}
              </div>
              {capabilities.canManageTrust ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    execute(
                      processRevenueOutboxAction,
                      L(
                        "تمت معالجة دفعة صندوق الصادر.",
                        "Outbox batch processed.",
                      ),
                    )
                  }
                  aria-busy={pending}
                  className={`${PRIMARY_BUTTON_CLASS} shrink-0`}
                >
                  {pending
                    ? L("جارٍ المعالجة...", "Processing...")
                    : L("معالجة صندوق الصادر", "Process Outbox")}
                </button>
              ) : null}
            </div>

            <div className="mt-4">
              {auditItems.length === 0 ? (
                <EmptyState>{L("لا توجد سجلات تدقيق.", "No audit entries.")}</EmptyState>
              ) : (
              <div className="space-y-2">
                {auditItems.map((entry: any) => (
                  <InteractiveSurface
                    key={entry.id}
                    variant="card"
                    className="p-4 text-start"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate text-xs text-[var(--nc-text-primary)]">
                        {displayRevenueIntegrityValue(
                          entry.action,
                          langEnum,
                        )}
                      </strong>
                      <time className="whitespace-nowrap text-[10px] text-[var(--nc-text-dim)]">
                        {formatDate(entry.createdAt, locale)}
                      </time>
                    </div>
                    <div className="mt-2 text-[10px] text-[var(--nc-text-dim)]">
                      {displayRevenueIntegrityValue(
                        entry.resourceType,
                        langEnum,
                      )}{" "}
                      · {safeDisplayId(entry.resourceId, langEnum)}
                    </div>
                  </InteractiveSurface>
                ))}
                <Pager
                  page={auditPage}
                  totalPages={auditPages}
                  onPage={setAuditPage}
                  previousLabel={L("السابق", "Previous")}
                  nextLabel={L("التالي", "Next")}
                  pageLabel={
                    isArabic
                      ? `صفحة ${auditPage} من ${auditPages}`
                      : `Page ${auditPage} of ${auditPages}`
                  }
                />
              </div>
            )}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "predictive" && capabilities.canReadPredictive ? (
        <PredictiveTab
          lang={langEnum}
          isArabic={isArabic}
          locale={locale}
          globalPending={pending}
          canManage={capabilities.canManagePredictive}
        />
      ) : null}

      {linkDialog ? (
        <div className={revenueVisual.modalOverlay} role="presentation">
          <div
            ref={dialogRef}
            className={revenueVisual.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-link-lead-title"
          >
            <h2
              id="revenue-link-lead-title"
              className="text-lg font-black text-[var(--nc-text-primary)]"
            >
              {L("ربط بعميل محتمل", "Link to lead")}
            </h2>
            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
              {L(
                "اختر عميلًا من منشأتك الحالية. الربط لا ينفذ الاقتراح تلقائيًا.",
                "Choose a lead from your current company. Linking never auto-executes the suggestion.",
              )}
            </p>
            <label className={`${revenueVisual.label} mt-3`}>
              {L("العميل المحتمل", "Lead")}
              <select
                autoFocus
                value={linkLeadId}
                onChange={(event) => setLinkLeadId(event.target.value)}
                disabled={leadsLoading}
                className={revenueVisual.select}
              >
                <option value="">
                  {leadsLoading
                    ? L("جارٍ التحميل...", "Loading...")
                    : L("اختر عميلًا", "Select a lead")}
                </option>
                {linkableLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name || safeDisplayId(lead.id, langEnum)}
                  </option>
                ))}
              </select>
            </label>
            {!leadsLoading && linkableLeads.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--nc-text-secondary)]">
                {L(
                  "لا يوجد عملاء محتملون متاحون للربط.",
                  "No leads are available to link.",
                )}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!linkLeadId || pending || leadsLoading}
                onClick={submitLinkLead}
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {L("ربط", "Link")}
              </button>
              <button
                type="button"
                onClick={closeLinkDialog}
                className={`${SECONDARY_BUTTON_CLASS} min-h-11 w-full`}
              >
                {L("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reasonDialog ? (
        <div className={revenueVisual.modalOverlay} role="presentation">
          <div
            ref={dialogRef}
            className={revenueVisual.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-reason-title"
          >
            <h2
              id="revenue-reason-title"
              className="text-lg font-black text-[var(--nc-text-primary)]"
            >
              {reasonDialog.mode === "resolve-risk"
                ? L("سبب إغلاق الخطر", "Risk resolution reason")
                : L("سبب رفض الاقتراح", "Suggestion rejection reason")}
            </h2>
            <label className={`${revenueVisual.label} mt-3`}>
              {L("السبب (إلزامي)", "Reason (required)")}
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                className={`${revenueVisual.textarea} h-28`}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={reason.trim().length < 3 || pending}
                onClick={submitReason}
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {L("تأكيد", "Confirm")}
              </button>
              <button
                type="button"
                onClick={closeReasonDialog}
                className={`${SECONDARY_BUTTON_CLASS} min-h-11 w-full`}
              >
                {L("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </main>
  );
}
