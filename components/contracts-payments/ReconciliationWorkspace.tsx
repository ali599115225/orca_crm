"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileCheck2,
  Landmark,
  Loader2,
  Scale,
  TriangleAlert,
} from "lucide-react";
import {
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsEmptyState,
  OperationsKpiGrid,
  OperationsPagination,
  OperationsMetricCard,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import {
  formatMoneyValue,
  formatNumberValue,
  safeDisplayValue,
  textFor,
  type ContractsPaymentsLocale,
} from "@/components/contracts-payments/workspace-display";

interface StatementLine {
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
}

interface GeneralLedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  entryNumber: number;
}

interface MatchRecord {
  statementLine: StatementLine;
  glEntry: GeneralLedgerEntry;
  difference: number;
  confidence: number;
}

interface ReconciliationResponse {
  success: boolean;
  message?: string;
  error?: string;
  matches?: MatchRecord[];
  unmatchedStatement?: StatementLine[];
  unmatchedGL?: GeneralLedgerEntry[];
  reconciled?: boolean;
  summary?: {
    totalStatementCredits: number;
    totalStatementDebits: number;
    totalGLCredits: number;
    totalGLDebits: number;
    netDifference: number;
  };
}

interface ReconciliationWorkspaceProps {
  locale: ContractsPaymentsLocale;
}

export default function ReconciliationWorkspace({
  locale,
}: ReconciliationWorkspaceProps) {
  const L = (ar: string, en: string) => textFor(locale, ar, en);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReconciliationResponse | null>(null);
  const [matchesPage, setMatchesPage] = useState(0);
  const [exceptionsPage, setExceptionsPage] = useState(0);

  async function runReconciliation() {
    if (!file) {
      setError(L("اختر ملف كشف حساب بصيغة CSV.", "Select a CSV bank statement."));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "bank");

      const response = await fetch("/api/v1/reconciliation/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = (await response.json()) as ReconciliationResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ||
            L("تعذر تنفيذ المصالحة البنكية.", "Bank reconciliation failed."),
        );
      }

      setResult(payload);
      setMatchesPage(0);
      setExceptionsPage(0);
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof Error
          ? cause.message
          : L("تعذر تنفيذ المصالحة البنكية.", "Bank reconciliation failed."),
      );
    } finally {
      setLoading(false);
    }
  }

  const matches = result?.matches || [];
  const unmatchedStatement = result?.unmatchedStatement || [];
  const unmatchedGL = result?.unmatchedGL || [];

  const matchTotalPages = Math.max(1, Math.ceil(matches.length / OPERATIONS_TABLE_PAGE_SIZE));
  const normalizedMatchesPage = Math.min(matchesPage, matchTotalPages - 1);
  const visibleMatches = matches.slice(
    normalizedMatchesPage * OPERATIONS_TABLE_PAGE_SIZE,
    normalizedMatchesPage * OPERATIONS_TABLE_PAGE_SIZE + OPERATIONS_TABLE_PAGE_SIZE,
  );

  const exceptionItems = [
    ...unmatchedStatement.map((line, index) => ({
      kind: "statement" as const,
      key: `statement:${line.reference}:${index}`,
      line,
    })),
    ...unmatchedGL.map((entry) => ({
      kind: "ledger" as const,
      key: `gl:${entry.id}`,
      entry,
    })),
  ];
  const exceptionTotalPages = Math.max(
    1,
    Math.ceil(exceptionItems.length / OPERATIONS_TABLE_PAGE_SIZE),
  );
  const normalizedExceptionsPage = Math.min(exceptionsPage, exceptionTotalPages - 1);
  const visibleExceptions = exceptionItems.slice(
    normalizedExceptionsPage * OPERATIONS_TABLE_PAGE_SIZE,
    normalizedExceptionsPage * OPERATIONS_TABLE_PAGE_SIZE + OPERATIONS_TABLE_PAGE_SIZE,
  );

  return (
    <div className="space-y-3" data-reconciliation-workspace>
      <OperationsPanel className="overflow-hidden">
        <OperationsPanelHeader
          title={L("المصالحة البنكية", "Bank reconciliation")}
          description={L(
            "مطابقة كشف الحساب الحقيقي مع القيود المحاسبية المرحلة دون تعديل السجلات.",
            "Match a real bank statement against posted ledger entries without changing records.",
          )}
        />

        <div className="p-3 sm:p-4">
          <div className={`${operationsVisual.contentCard} p-4`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={operationsVisual.iconTile} aria-hidden="true">
                  <CloudUpload />
                </span>
                <div className="min-w-0">
                  <strong className="block text-xs text-[var(--nc-text-primary)]">
                    {L("رفع كشف الحساب", "Upload bank statement")}
                  </strong>
                  <span className="mt-1 block text-[10px] leading-5 text-[var(--nc-text-dim)]">
                    {L(
                      "CSV فقط، بحد أقصى 5 ميجابايت. الأعمدة المطلوبة: التاريخ، الوصف، المرجع، المبلغ.",
                      "CSV only, up to 5 MB. Required columns: date, description, reference, amount.",
                    )}
                  </span>
                  {file ? (
                    <span className="mt-2 block truncate text-[10px] font-bold text-[var(--nc-accent-text)]">
                      {L("الملف المختار:", "Selected file:")} {file.name}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setError("");
                    setResult(null);
                  }}
                  className="max-w-full text-[11px] text-[var(--nc-text-dim)] file:me-3 file:min-h-11 file:rounded-xl file:border file:border-[var(--nc-border)] file:bg-[var(--nc-surface-solid)] file:px-3 file:text-[10px] file:font-bold file:text-[var(--nc-text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => void runReconciliation()}
                  disabled={!file || loading}
                  className={operationsVisual.primaryButton}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {L("تشغيل المطابقة", "Run matching")}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </OperationsPanel>

      {result ? (
        <>
          <OperationsKpiGrid>
            <OperationsMetricCard
              title={L("المطابقات", "Matches")}
              value={formatNumberValue(matches.length, locale)}
              description={L("مطابقات مؤكدة آليًا", "Automatically confirmed")}
              icon={FileCheck2}
            />
            <OperationsMetricCard
              title={L("حركات بنكية غير مطابقة", "Unmatched bank lines")}
              value={formatNumberValue(unmatchedStatement.length, locale)}
              description={L("تحتاج مراجعة", "Needs review")}
              icon={Landmark}
            />
            <OperationsMetricCard
              title={L("قيود غير مطابقة", "Unmatched ledger entries")}
              value={formatNumberValue(unmatchedGL.length, locale)}
              description={L("تحتاج مراجعة", "Needs review")}
              icon={TriangleAlert}
            />
            <OperationsMetricCard
              title={L("صافي الفرق", "Net difference")}
              value={formatMoneyValue(result.summary?.netDifference || 0, locale)}
              description={L("فرق الكشف مقابل القيود", "Statement vs ledger")}
              icon={Scale}
            />
          </OperationsKpiGrid>

          <OperationsPanel padded>
            <div className={`mb-3 ${operationsVisual.softPanel} px-3 py-2 text-[11px] ${result.reconciled ? 'text-emerald-300' : 'text-sky-200'}`}>
              {result.reconciled
                ? L("اكتملت المطابقة دون فروقات.", "Reconciliation completed without differences.")
                : L(
                    "تم تحليل الكشف. راجع الحركات والقيود غير المطابقة قبل أي قيد محاسبي.",
                    "The statement was analyzed. Review unmatched lines before posting any accounting entry.",
                  )}
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <section className={`${operationsVisual.contentCard} p-3`}>
                <h3 className="mb-3 text-xs font-black text-emerald-300">
                  {L("المطابقات المؤكدة آليًا", "Automatically matched")}
                </h3>
                {matches.length === 0 ? (
                  <OperationsEmptyState>
                    {L("لا توجد مطابقات.", "No matches found.")}
                  </OperationsEmptyState>
                ) : (
                  <div className="space-y-2">
                    {visibleMatches.map((match) => (
                      <article
                        key={`${match.statementLine.reference}:${match.glEntry.id}`}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong className="min-w-0 truncate text-white">
                            {safeDisplayValue(match.statementLine.description, locale)}
                          </strong>
                          <span className="shrink-0 font-black text-emerald-300">
                            {formatMoneyValue(match.statementLine.amount, locale)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--nc-text-dim)]">
                          <span>{L("القيد:", "Entry:")} {formatNumberValue(match.glEntry.entryNumber, locale)}</span>
                          <span>{L("الثقة:", "Confidence:")} {formatNumberValue(Math.round(match.confidence * 100), locale)}%</span>
                          <span>{L("الفرق:", "Difference:")} {formatMoneyValue(match.difference, locale)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <OperationsPagination
                  page={normalizedMatchesPage}
                  totalPages={matchTotalPages}
                  totalItems={matches.length}
                  pageSize={OPERATIONS_TABLE_PAGE_SIZE}
                  locale={locale}
                  onPageChange={setMatchesPage}
                  className="mt-3 rounded-xl border border-[var(--nc-border)]"
                />
              </section>

              <section className={`${operationsVisual.contentCard} p-3`}>
                <h3 className="mb-3 text-xs font-black text-rose-300">
                  {L("الاستثناءات", "Exceptions")}
                </h3>
                {unmatchedStatement.length === 0 && unmatchedGL.length === 0 ? (
                  <OperationsEmptyState>
                    {L("لا توجد استثناءات.", "No exceptions.")}
                  </OperationsEmptyState>
                ) : (
                  <div className="space-y-2">
                    {visibleExceptions.map((item) =>
                      item.kind === "statement" ? (
                        <article
                          key={item.key}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3 text-[11px]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-white">{safeDisplayValue(item.line.description, locale)}</span>
                            <strong className="orca-number-column shrink-0 text-rose-300">{formatMoneyValue(item.line.amount, locale)}</strong>
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
                            {L("حركة بنكية بلا قيد مطابق", "Bank line without a matching entry")}
                          </p>
                        </article>
                      ) : (
                        <article
                          key={item.key}
                          className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-white">{safeDisplayValue(item.entry.description, locale)}</span>
                            <strong className="orca-number-column shrink-0 text-amber-300">{formatMoneyValue(item.entry.amount, locale)}</strong>
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
                            {L("قيد محاسبي بلا حركة بنكية مطابقة", "Ledger entry without a matching bank line")}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                )}
                <OperationsPagination
                  page={normalizedExceptionsPage}
                  totalPages={exceptionTotalPages}
                  totalItems={exceptionItems.length}
                  pageSize={OPERATIONS_TABLE_PAGE_SIZE}
                  locale={locale}
                  onPageChange={setExceptionsPage}
                  className="mt-3 rounded-xl border border-[var(--nc-border)]"
                />
              </section>
            </div>
          </OperationsPanel>
        </>
      ) : null}
    </div>
  );
}
