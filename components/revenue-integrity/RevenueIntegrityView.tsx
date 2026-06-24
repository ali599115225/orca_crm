"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import {
  acknowledgeRevenueRiskAction,
  analyzeConversationAction,
  approveRevenueSuggestionAction,
  executeRevenueSuggestionAction,
  processRevenueOutboxAction,
  rejectRevenueSuggestionAction,
  resolveRevenueRiskAction,
  runRevenueRadarAction,
  scoreRevenueOpportunitiesAction,
  testRevenueProviderAction,
  trainRevenuePredictiveModelAction,
} from "@/app/actions/revenue-integrity";
import { displayRevenueIntegrityValue } from "@/lib/display/revenueIntegrity";
import type { RevenueIntegrityDashboard } from "@/lib/revenue-integrity/queries";

type Tab = "radar" | "actions" | "trust" | "audit" | "predictive";

type Props = {
  initialData: RevenueIntegrityDashboard;
};

const TAB_LABELS: Record<Tab, { ar: string; en: string }> = {
  radar: { ar: "رادار تسرب الإيراد", en: "Revenue Leak Radar" },
  actions: { ar: "المحادثة إلى إجراء", en: "Conversation to Action" },
  trust: { ar: "بوابات الثقة السعودية", en: "Saudi Trust Gates" },
  audit: { ar: "الأحداث والتدقيق", en: "Events & Audit" },
  predictive: { ar: "الذكاء التنبؤي", en: "Predictive Intelligence" },
};

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["CONNECTED", "ACTIVE", "EXECUTED", "RESOLVED", "DELIVERED"].includes(status)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["CRITICAL", "ERROR", "FAILED", "DEAD_LETTER"].includes(status)) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (["HIGH", "PENDING_APPROVAL", "PENDING", "RETRY", "ACKNOWLEDGED"].includes(status)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)]";
}

function StatusBadge({ value, lang }: { value: string; lang: "ar" | "en" }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(value)}`}>
      {displayRevenueIntegrityValue(value, lang)}
    </span>
  );
}

function shortRef(uuid: string | null | undefined, lang: "ar" | "en") {
  if (!uuid) return "";
  if (uuid.startsWith("manual-")) return "";
  if (uuid.length >= 32) return (lang === "ar" ? "مرجع #" : "Ref #") + uuid.replace(/-/g, "").slice(0, 8);
  return uuid;
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-black text-[var(--nc-foreground)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function RevenueIntegrityView({ initialData }: Props) {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("radar");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "error"; text: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceType, setSourceType] = useState<"WHATSAPP" | "EMAIL" | "SUPPORT" | "MANUAL">("MANUAL");
  const [sourceId, setSourceId] = useState(`manual-${Date.now()}`);
  const [conversationText, setConversationText] = useState("");
  const [minimumRows, setMinimumRows] = useState(30);
  const [reasonDialog, setReasonDialog] = useState<{
    mode: "resolve-risk" | "reject-suggestion";
    id: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  const [riskPage, setRiskPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [isRadarRunning, setIsRadarRunning] = useState(false);
  const [mutatingSuggestionId, setMutatingSuggestionId] = useState<string | null>(null);

  const L = (ar: string, en: string) => (isArabic ? ar : en);
  const langEnum = isArabic ? "ar" : "en";

  function showSuccessToast(text: string) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessToast(text);
    successTimerRef.current = setTimeout(() => {
      setSuccessToast(null);
      successTimerRef.current = null;
    }, 4000);
  }

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const openRisks = useMemo(
    () => initialData.risks.filter((item) => ["OPEN", "ACKNOWLEDGED"].includes(item.status)),
    [initialData.risks],
  );

  function execute(task: () => Promise<{ success: boolean; error?: string; data?: unknown }>, successText: string, onSuccess?: () => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setNotice({
          type: "error",
          text: result.error || L("تعذر تنفيذ العملية.", "The operation failed."),
        });
        return;
      }
      showSuccessToast(successText);
      if (onSuccess) onSuccess();
      router.refresh();
    });
  }

  function runRadar() {
    setNotice(null);
    setIsRadarRunning(true);
    startTransition(async () => {
      const result = await runRevenueRadarAction();
      if (!result.success) {
        setNotice({
          type: "error",
          text: result.error || L("تعذر تشغيل الرادار.", "Failed to run radar."),
        });
        setIsRadarRunning(false);
        return;
      }
      showSuccessToast(L("اكتمل تقييم قواعد تسرب الإيراد.", "Revenue leakage rules evaluated."));
      setRiskPage(1);
      setEventPage(1);
      setAuditPage(1);
      router.refresh();
      setIsRadarRunning(false);
    });
  }

  function submitReason() {
    if (!reasonDialog || reason.trim().length < 3) return;
    if (reasonDialog.mode === "resolve-risk") {
      execute(
        () => resolveRevenueRiskAction(reasonDialog.id, reason.trim()),
        L("تم إغلاق الخطر مع حفظ السبب.", "Risk resolved with an audit reason."),
      );
    } else {
      setNotice(null);
      startTransition(async () => {
        const result = await rejectRevenueSuggestionAction(reasonDialog.id, reason.trim());
        if (!result.success) {
          setNotice({ type: "error", text: result.error || L("تعذر الرفض.", "Rejection failed.") });
        } else {
          showSuccessToast(L("تم رفض الاقتراح مع حفظ السبب.", "Suggestion rejected with an audit reason."));
          setSuggestionPage(1);
          router.refresh();
        }
      });
    }
    setReasonDialog(null);
    setReason("");
  }

  return (
    <div className="min-w-0 space-y-5 px-4 py-4 md:px-6">
      <div className="text-sm font-bold text-[var(--nc-foreground-muted)]">
        <a href="/operations" className="hover:text-[var(--nc-foreground)]">{L("العمليات", "Operations")}</a>
        <span className="mx-2">/</span>
        <span className="text-[var(--nc-foreground)]">{L("سلامة الإيراد", "Revenue Integrity")}</span>
      </div>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--nc-foreground)]">
            {L("سلامة الإيراد العقاري", "Real Estate Revenue Integrity")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--nc-foreground-muted)]">
            {L(
              "تشغيل المخاطر والإجراءات والامتثال والتدقيق والتنبؤ من سجل واحد محكوم بالصلاحيات.",
              "Operate risks, actions, trust gates, audit, and prediction from one permission-governed record.",
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={pending || isRadarRunning}
          onClick={runRadar}
          className="h-11 shrink-0 rounded-xl bg-[var(--nc-accent)] px-5 text-sm font-black text-slate-950 disabled:opacity-50"
        >
          {isRadarRunning ? L("جاري تشغيل الرادار...", "Running radar...") : L("تشغيل الرادار الآن", "Run radar now")}
        </button>
      </header>

      {successToast ? (
        <div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          {successToast}
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {notice.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          [L("مخاطر مفتوحة", "Open risks"), initialData.summary.openRisks],
          [L("حرجة", "Critical"), initialData.summary.criticalRisks],
          [L("إيراد معرض للخطر", "Revenue at risk"), formatMoney(initialData.summary.revenueAtRisk, locale)],
          [L("اقتراحات معلقة", "Pending actions"), initialData.summary.pendingSuggestions],
          [L("مزودون متصلون", "Connected providers"), initialData.summary.connectedProviders],
          [L("رسائل ميتة", "Dead letters"), initialData.summary.deadLetters],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="flex min-h-24 flex-col items-center justify-center rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 text-center"
          >
            <div className="text-[11px] font-bold text-[var(--nc-foreground-muted)]">{label}</div>
            <div className="mt-2 text-xl font-black text-[var(--nc-foreground)]">{value}</div>
          </div>
        ))}
      </div>

      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-2"
        aria-label={L("أقسام سلامة الإيراد", "Revenue integrity sections")}
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setRiskPage(1);
              setEventPage(1);
              setAuditPage(1);
              setSuccessToast(null);
              if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
                successTimerRef.current = null;
              }
            }}
            className={`min-w-max rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === tab
                ? "bg-[var(--nc-accent)] text-slate-950"
                : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]"
            }`}
          >
            {isArabic ? TAB_LABELS[tab].ar : TAB_LABELS[tab].en}
          </button>
        ))}
      </nav>

      {activeTab === "radar" ? (
        <div className="flex flex-col gap-5 xl:flex-row">
          <Panel
            title={L("المخاطر النشطة", "Active risks")}
            description={L(
              "كل إشارة مرتبطة بكيان وقيمة ومسؤول وحالة إغلاق.",
              "Every signal is tied to an entity, value, owner, and closure state.",
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-start text-xs" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "25%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-foreground-muted)]">
                    <th className="px-3 py-3 text-start">{L("القاعدة", "Rule")}</th>
                    <th className="px-3 py-3 text-start">{L("السبب", "Reason")}</th>
                    <th className="px-3 py-3 text-start">{L("القيمة", "Value")}</th>
                    <th className="px-3 py-3 text-start">{L("الشدة", "Severity")}</th>
                    <th className="px-3 py-3 text-start">{L("الحالة", "Status")}</th>
                    <th className="px-3 py-3 text-start">{L("الإجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {openRisks.slice((riskPage - 1) * 10, riskPage * 10).map((risk) => (
                    <tr key={risk.id} className="h-16 border-b border-[var(--nc-border)] last:border-0">
                      <td className="truncate px-3 py-3 font-bold text-[var(--nc-foreground)]" title={risk.ruleCode}>
                        {displayRevenueIntegrityValue(risk.ruleCode, langEnum)}
                      </td>
                      <td className="px-3 py-3 text-[var(--nc-foreground-muted)]">
                        <span className="line-clamp-2">{isArabic ? risk.reasonAr : risk.reasonEn}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-[var(--nc-foreground)]">
                        {formatMoney(risk.revenueAtRisk, locale)}
                      </td>
                      <td className="px-3 py-3"><StatusBadge value={risk.severity} lang={langEnum} /></td>
                      <td className="px-3 py-3"><StatusBadge value={risk.status} lang={langEnum} /></td>
                      <td className="whitespace-nowrap px-3 py-3 pe-5 overflow-visible">
                        <div className="flex shrink-0 gap-2">
                          {risk.status === "OPEN" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                execute(
                                  () => acknowledgeRevenueRiskAction(risk.id),
                                  L("تم استلام الخطر", "Risk acknowledged"),
                                )
                              }
                              className="shrink-0 rounded-lg border border-[var(--nc-border)] px-2.5 py-2 font-bold text-[var(--nc-foreground)] hover:bg-[var(--nc-surface-strong)]"
                            >
                              {L("استلام", "Acknowledge")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setReason("");
                              setReasonDialog({ mode: "resolve-risk", id: risk.id });
                            }}
                            className="shrink-0 rounded-lg border border-emerald-500/30 px-2.5 py-2 font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            {L("إغلاق", "Resolve")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {openRisks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-40 text-center text-sm text-[var(--nc-foreground-muted)]">
                        {L("لا توجد مخاطر مفتوحة بعد آخر تقييم.", "No open risks after the latest evaluation.")}
                      </td>
                    </tr>
                  ) : null}
                  {Array.from({ length: Math.max(0, 10 - openRisks.slice((riskPage - 1) * 10, riskPage * 10).length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-16">
                      <td colSpan={6}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {openRisks.length > 10 ? (
              <div className="mt-4 flex items-center justify-between border-t border-[var(--nc-border)] pt-4">
                <button
                  type="button"
                  disabled={riskPage === 1}
                  onClick={() => setRiskPage(p => p - 1)}
                  className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                >
                  {L("السابق", "Previous")}
                </button>
                <span className="text-xs text-[var(--nc-foreground-muted)]">
                  {isArabic ? `صفحة ${riskPage} من ${Math.ceil(openRisks.length / 10)}` : `Page ${riskPage} of ${Math.ceil(openRisks.length / 10)}`}
                </span>
                <button
                  type="button"
                  disabled={riskPage >= Math.ceil(openRisks.length / 10)}
                  onClick={() => setRiskPage(p => p + 1)}
                  className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                >
                  {L("التالي", "Next")}
                </button>
              </div>
            ) : null}
          </Panel>

          <div className="w-full xl:w-[232px] shrink-0">

          <Panel title={L("آخر تشغيل", "Latest run")}>
            {initialData.latestRun ? (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-[var(--nc-foreground-muted)]">{L("بدأ", "Started")}</dt>
                  <dd className="mt-1 font-bold text-[var(--nc-foreground)]">
                    {formatDate(initialData.latestRun.startedAt, locale)}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--nc-surface-strong)] p-3 text-center">
                    <dt className="text-[11px] text-[var(--nc-foreground-muted)]">{L("مكتشف", "Detected")}</dt>
                    <dd className="mt-2 text-xl font-black text-[var(--nc-foreground)]">
                      {initialData.latestRun.detectedCount}
                    </dd>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--nc-surface-strong)] p-3 text-center">
                    <dt className="text-[11px] text-[var(--nc-foreground-muted)]">{L("أُغلق آليًا", "Auto-resolved")}</dt>
                    <dd className="mt-2 text-xl font-black text-[var(--nc-foreground)]">
                      {initialData.latestRun.resolvedCount}
                    </dd>
                  </div>
                </div>
                <div className="text-center">
                  <dt className="text-xs text-[var(--nc-foreground-muted)]">{L("قواعد متجاوزة", "Skipped rules")}</dt>
                  <dd className="mt-1 font-bold text-[var(--nc-foreground)]">
                    {Array.isArray(initialData.latestRun.skippedRules)
                      ? initialData.latestRun.skippedRules.length
                      : 0}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-[var(--nc-foreground-muted)]">
                {L("لم يتم تشغيل الرادار بعد.", "The radar has not run yet.")}
              </p>
            )}
          </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
          <Panel
            title={L("تحليل محادثة", "Analyze conversation")}
            description={L(
              "التحليل ينشئ اقتراحًا فقط. التنفيذ يتطلب اعتمادًا بشريًا.",
              "Analysis creates a suggestion only. Execution requires human approval.",
            )}
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                execute(
                  () =>
                    analyzeConversationAction({
                      sourceType,
                      sourceId,
                      text: conversationText,
                    }),
                  L("تم إنشاء اقتراح للمراجعة.", "Suggestion created for review."),
                );
                setConversationText("");
                setSourceId(`manual-${Date.now()}`);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("المصدر", "Source")}
                  <select
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value as typeof sourceType)}
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
                  >
                    <option value="MANUAL">{L("يدوي", "Manual")}</option>
                    <option value="WHATSAPP">{L("واتساب", "WhatsApp")}</option>
                    <option value="EMAIL">{L("البريد الإلكتروني", "Email")}</option>
                    <option value="SUPPORT">{L("الدعم", "Support")}</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[var(--nc-foreground-muted)]">
                  {L("معرف المصدر", "Source ID")}
                  <input
                    value={sourceId}
                    onChange={(event) => setSourceId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
                {L("نص المحادثة", "Conversation text")}
                <textarea
                  value={conversationText}
                  onChange={(event) => setConversationText(event.target.value)}
                  rows={8}
                  required
                  className="mt-2 w-full resize-y rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-sm text-[var(--nc-foreground)]"
                  placeholder={L(
                    "مثال: أرغب بزيارة فيلا في الرياض غدًا الساعة 17:00 وميزانيتي 2 مليون",
                    "Example: I want to visit a villa in Riyadh tomorrow at 17:00; budget is 2 million.",
                  )}
                />
              </label>
              <button
                type="submit"
                disabled={pending || conversationText.trim().length < 3}
                className="h-11 w-full rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {L("استخراج واقتراح", "Extract and suggest")}
              </button>
            </form>
          </Panel>

          <Panel title={L("طابور الاعتماد", "Approval queue")}>
            <div className="space-y-3">
              {(() => {
                const pageSize = 10;
                const total = initialData.suggestions.length;
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                const safePage = Math.min(suggestionPage, totalPages);
                const pageItems = initialData.suggestions.slice((safePage - 1) * pageSize, safePage * pageSize);
                return (
                  <>
                    {pageItems.map((suggestion) => {
                      const isMutating = mutatingSuggestionId === suggestion.id;
                      const execResult = suggestion.executionResult as Record<string, unknown> | null;
                      const failureReason = execResult && typeof execResult.error === "string" ? execResult.error : null;
                      return (
                        <article
                          key={suggestion.id}
                          className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-black text-[var(--nc-foreground)]">
                                  {displayRevenueIntegrityValue(suggestion.actionType, langEnum)}
                                </h3>
                                <StatusBadge value={suggestion.status} lang={langEnum} />
                                <span className="text-[10px] text-[var(--nc-foreground-muted)]">
                                  {displayRevenueIntegrityValue(suggestion.sourceType, langEnum)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-[var(--nc-foreground-muted)]">
                                {isArabic ? suggestion.rationaleAr : suggestion.rationaleEn}
                              </p>
                              <time className="mt-1 block text-[10px] text-[var(--nc-foreground-muted)]">
                                {formatDate(suggestion.createdAt, locale)}
                              </time>
                              {failureReason ? (
                                <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
                                  {failureReason}
                                </p>
                              ) : null}
                              {suggestion.status === "EXECUTED" && execResult && !failureReason ? (
                                <p className="mt-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                                  {L("تم التنفيذ بنجاح", "Executed successfully")}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-end">
                              <div className="text-[11px] text-[var(--nc-foreground-muted)]">
                                {L("الثقة", "Confidence")}
                              </div>
                              <div className="mt-1 font-black text-[var(--nc-foreground)]">
                                {Math.round(suggestion.confidence * 100)}%
                              </div>
                            </div>
                          </div>
                          {suggestion.status === "PENDING_APPROVAL" ? (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={pending || isMutating}
                                onClick={() => {
                                  setMutatingSuggestionId(suggestion.id);
                                  setNotice(null);
                                  startTransition(async () => {
                                    const result = await approveRevenueSuggestionAction(suggestion.id);
                                    if (!result.success) {
                                      setNotice({ type: "error", text: result.error || L("تعذر الاعتماد.", "Approval failed.") });
                                    } else {
                                      showSuccessToast(L("تم اعتماد الاقتراح.", "Suggestion approved."));
                                      setSuggestionPage(1);
                                      router.refresh();
                                    }
                                    setMutatingSuggestionId(null);
                                  });
                                }}
                                className="rounded-lg bg-[var(--nc-accent)] px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
                              >
                                {L("اعتماد", "Approve")}
                              </button>
                              <button
                                type="button"
                                disabled={pending || isMutating}
                                onClick={() => {
                                  setReason("");
                                  setReasonDialog({ mode: "reject-suggestion", id: suggestion.id });
                                }}
                                className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-black text-rose-700 dark:text-rose-300"
                              >
                                {L("رفض", "Reject")}
                              </button>
                            </div>
                          ) : null}
                          {suggestion.status === "APPROVED" ? (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={pending || isMutating}
                                onClick={() => {
                                  setMutatingSuggestionId(suggestion.id);
                                  setNotice(null);
                                  startTransition(async () => {
                                    const result = await executeRevenueSuggestionAction(suggestion.id);
                                    if (!result.success) {
                                      setNotice({ type: "error", text: result.error || L("تعذر التنفيذ.", "Execution failed.") });
                                    } else {
                                      showSuccessToast(L("تم تنفيذ الاقتراح.", "Suggestion executed."));
                                      setSuggestionPage(1);
                                      router.refresh();
                                    }
                                    setMutatingSuggestionId(null);
                                  });
                                }}
                                className="rounded-lg bg-[var(--nc-accent)] px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
                              >
                                {L("تنفيذ", "Execute")}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                    {total === 0 ? (
                      <div className="py-16 text-center text-sm text-[var(--nc-foreground-muted)]">
                        {L("لا توجد اقتراحات بعد.", "No suggestions yet.")}
                      </div>
                    ) : null}
                    {total > pageSize ? (
                      <div className="flex items-center justify-between border-t border-[var(--nc-border)] pt-4">
                        <button
                          type="button"
                          disabled={safePage === 1}
                          onClick={() => setSuggestionPage(p => p - 1)}
                          className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                        >
                          {L("السابق", "Previous")}
                        </button>
                        <span className="text-xs text-[var(--nc-foreground-muted)]">
                          {isArabic ? `صفحة ${safePage} من ${totalPages}` : `Page ${safePage} of ${totalPages}`}
                        </span>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setSuggestionPage(p => p + 1)}
                          className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                        >
                          {L("التالي", "Next")}
                        </button>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "trust" ? (
        <Panel
          title={L("حالة مزودي الثقة", "Trust provider status")}
          description={L(
            "إدارة بيانات الاعتماد تتم في الإعدادات. لا يعرض هذا السجل أي سر.",
            "Credentials are managed in Settings. This record never exposes secrets.",
          )}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {initialData.providers.map((provider) => (
              <article
                key={provider.provider}
                className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[var(--nc-foreground)]">{displayRevenueIntegrityValue(provider.provider, langEnum)}</h3>
                  <StatusBadge value={provider.status} lang={langEnum} />
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--nc-foreground-muted)]">{L("آخر نجاح", "Last success")}</dt>
                    <dd className="text-[var(--nc-foreground)]">{formatDate(provider.lastSuccessAt, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--nc-foreground-muted)]">{L("إصدار الاعتماد", "Credential version")}</dt>
                    <dd className="font-bold text-[var(--nc-foreground)]">{provider.credentialsVersion}</dd>
                  </div>
                </dl>
                {provider.lastError ? (
                  <p className="mt-3 line-clamp-3 rounded-xl bg-rose-500/10 p-2 text-[11px] text-rose-700 dark:text-rose-300">
                    {provider.lastError}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={pending || provider.status === "NOT_CONFIGURED"}
                    onClick={() =>
                      execute(
                        () => testRevenueProviderAction(provider.provider),
                        L("نجح اختبار الاتصال.", "Connection test passed."),
                      )
                    }
                    className="rounded-lg border border-[var(--nc-border)] px-3 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                  >
                    {L("اختبار", "Test")}
                  </button>
                  <a
                    href="/operations/settings?tab=integrations"
                    className="rounded-lg bg-[var(--nc-accent)] px-3 py-2 text-xs font-black text-slate-950"
                  >
                    {L("الإعدادات", "Settings")}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "audit" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title={L("الأحداث", "Domain events")}>
            <div className="flex flex-col h-[580px]">
              <div className="space-y-2 overflow-y-auto pe-1 flex-1">
                {initialData.events.slice((eventPage - 1) * 10, eventPage * 10).map((event) => (
                  <article
                    key={event.id}
                    className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate text-xs text-[var(--nc-foreground)]">{displayRevenueIntegrityValue(event.eventType, langEnum)}</strong>
                      <time className="whitespace-nowrap text-[10px] text-[var(--nc-foreground-muted)]">
                        {formatDate(event.occurredAt, locale)}
                      </time>
                    </div>
                    <div className="mt-2 truncate text-[10px] text-[var(--nc-foreground-muted)]">
                      {displayRevenueIntegrityValue(event.aggregateType, langEnum)} · {shortRef(event.aggregateId, langEnum)}
                    </div>
                    <code className="mt-1 block truncate text-[10px] text-[var(--nc-foreground-muted)]">
                      {shortRef(event.correlationId, langEnum)}
                    </code>
                  </article>
                ))}
              </div>
              {initialData.events.length > 10 ? (
                <div className="mt-4 flex items-center justify-between border-t border-[var(--nc-border)] pt-4 shrink-0">
                  <button
                    type="button"
                    disabled={eventPage === 1}
                    onClick={() => setEventPage(p => p - 1)}
                    className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                  >
                    {L("السابق", "Previous")}
                  </button>
                  <span className="text-xs text-[var(--nc-foreground-muted)]">
                    {isArabic ? `صفحة ${eventPage} من ${Math.ceil(initialData.events.length / 10)}` : `Page ${eventPage} of ${Math.ceil(initialData.events.length / 10)}`}
                  </span>
                  <button
                    type="button"
                    disabled={eventPage >= Math.ceil(initialData.events.length / 10)}
                    onClick={() => setEventPage(p => p + 1)}
                    className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                  >
                    {L("التالي", "Next")}
                  </button>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title={L("التدقيق وOutbox", "Audit & outbox")}>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {initialData.outbox.map((item) => (
                <div key={item.status} className="rounded-xl bg-[var(--nc-surface-strong)] p-3">
                  <StatusBadge value={item.status} lang={langEnum} />
                  <div className="mt-3 text-xl font-black text-[var(--nc-foreground)]">{item.count}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                execute(
                  processRevenueOutboxAction,
                  L("تمت معالجة دفعة Outbox.", "Outbox batch processed."),
                )
              }
              className="mb-4 h-10 rounded-xl border border-[var(--nc-border)] px-4 text-xs font-black text-[var(--nc-foreground)]"
            >
              {L("معالجة Outbox", "Process outbox")}
            </button>
            <div className="flex flex-col h-[400px]">
              <div className="space-y-2 overflow-y-auto pe-1 flex-1">
                {initialData.audits.slice((auditPage - 1) * 10, auditPage * 10).map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate text-xs text-[var(--nc-foreground)]">{displayRevenueIntegrityValue(entry.action, langEnum)}</strong>
                      <time className="whitespace-nowrap text-[10px] text-[var(--nc-foreground-muted)]">
                        {formatDate(entry.createdAt, locale)}
                      </time>
                    </div>
                    <div className="mt-2 truncate text-[10px] text-[var(--nc-foreground-muted)]">
                      {displayRevenueIntegrityValue(entry.resourceType, langEnum)} · {shortRef(entry.resourceId, langEnum)}
                    </div>
                  </article>
                ))}
              </div>
              {initialData.audits.length > 10 ? (
                <div className="mt-4 flex items-center justify-between border-t border-[var(--nc-border)] pt-4 shrink-0">
                  <button
                    type="button"
                    disabled={auditPage === 1}
                    onClick={() => setAuditPage(p => p - 1)}
                    className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                  >
                    {L("السابق", "Previous")}
                  </button>
                  <span className="text-xs text-[var(--nc-foreground-muted)]">
                    {isArabic ? `صفحة ${auditPage} من ${Math.ceil(initialData.audits.length / 10)}` : `Page ${auditPage} of ${Math.ceil(initialData.audits.length / 10)}`}
                  </span>
                  <button
                    type="button"
                    disabled={auditPage >= Math.ceil(initialData.audits.length / 10)}
                    onClick={() => setAuditPage(p => p + 1)}
                    className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-40"
                  >
                    {L("التالي", "Next")}
                  </button>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "predictive" ? (
        <div className="grid gap-5 xl:grid-cols-[.55fr_1.45fr]">
          <Panel title={L("دورة النموذج", "Model lifecycle")}>
            <label className="block text-xs font-bold text-[var(--nc-foreground-muted)]">
              {L("الحد الأدنى للعينات المصنفة", "Minimum labeled rows")}
              <input
                type="number"
                min={20}
                max={10000}
                value={minimumRows}
                onChange={(event) => setMinimumRows(Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-[var(--nc-foreground)]"
              />
            </label>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  execute(
                    () => trainRevenuePredictiveModelAction(minimumRows),
                    L("اكتملت دورة التدريب أو تم تسجيل عدم الجاهزية.", "Training cycle completed or readiness was recorded."),
                  )
                }
                className="h-11 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {L("بناء إصدار نموذج", "Build model version")}
              </button>
              <button
                type="button"
                disabled={pending || initialData.model?.status !== "ACTIVE"}
                onClick={() =>
                  execute(
                    scoreRevenueOpportunitiesAction,
                    L("تم تحديث توقعات الفرص المفتوحة.", "Open-opportunity predictions updated."),
                  )
                }
                className="h-11 rounded-xl border border-[var(--nc-border)] px-4 text-sm font-black text-[var(--nc-foreground)] disabled:opacity-40"
              >
                {L("تقييم الفرص المفتوحة", "Score open opportunities")}
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-[var(--nc-surface-strong)] p-4">
              {initialData.model ? (
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--nc-foreground-muted)]">{L("الإصدار", "Version")}</dt>
                    <dd className="font-black text-[var(--nc-foreground)]">{initialData.model.version}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--nc-foreground-muted)]">{L("الحالة", "Status")}</dt>
                    <dd><StatusBadge value={initialData.model.status} lang={langEnum} /></dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--nc-foreground-muted)]">{L("الانحراف", "Drift")}</dt>
                    <dd className="font-bold text-[var(--nc-foreground)]">
                      {initialData.model.driftScore == null ? "—" : initialData.model.driftScore.toFixed(4)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[var(--nc-foreground-muted)]">
                  {L("لا يوجد إصدار نموذج بعد.", "No model version exists yet.")}
                </p>
              )}
            </div>
          </Panel>

          <Panel title={L("توقعات الفرص", "Opportunity predictions")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-xs">
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-foreground-muted)]">
                    <th className="w-[35%] px-3 py-3 text-start">{L("الفرصة", "Opportunity")}</th>
                    <th className="w-[18%] px-3 py-3 text-start">{L("احتمال الإغلاق", "Close probability")}</th>
                    <th className="w-[18%] px-3 py-3 text-start">{L("الثقة", "Confidence")}</th>
                    <th className="w-[29%] px-3 py-3 text-start">{L("وقت التقييم", "Scored at")}</th>
                  </tr>
                </thead>
                <tbody>
                  {initialData.predictions.map((prediction) => (
                    <tr key={prediction.id} className="h-14 border-b border-[var(--nc-border)] last:border-0">
                      <td className="truncate px-3 py-3 font-mono text-[var(--nc-foreground)]">
                        {shortRef(prediction.opportunityId, langEnum)}
                      </td>
                      <td className="px-3 py-3 font-black text-[var(--nc-foreground)]">
                        {Math.round(prediction.probability * 100)}%
                      </td>
                      <td className="px-3 py-3 font-black text-[var(--nc-foreground)]">
                        {Math.round(prediction.confidence * 100)}%
                      </td>
                      <td className="px-3 py-3 text-[var(--nc-foreground-muted)]">
                        {formatDate(prediction.scoredAt, locale)}
                      </td>
                    </tr>
                  ))}
                  {initialData.predictions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="h-40 text-center text-sm text-[var(--nc-foreground-muted)]">
                        {L("لا توجد توقعات. لا يُنشأ نموذج نشط قبل كفاية البيانات.", "No predictions. An active model is never created before data is sufficient.")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      {reasonDialog ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="presentation">
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-reason-title"
          >
            <h2 id="revenue-reason-title" className="text-lg font-black text-[var(--nc-foreground)]">
              {reasonDialog.mode === "resolve-risk"
                ? L("سبب إغلاق الخطر", "Risk resolution reason")
                : L("سبب رفض الاقتراح", "Suggestion rejection reason")}
            </h2>
            <textarea
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 text-sm text-[var(--nc-foreground)]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={reason.trim().length < 3 || pending}
                onClick={submitReason}
                className="h-10 flex-1 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-black text-slate-950 disabled:opacity-40"
              >
                {L("تأكيد", "Confirm")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReasonDialog(null);
                  setReason("");
                }}
                className="h-10 flex-1 rounded-xl border border-[var(--nc-border)] px-4 text-sm font-bold text-[var(--nc-foreground)]"
              >
                {L("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
