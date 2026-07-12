"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, Loader2 } from "lucide-react";
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

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/5 bg-[var(--nc-surface-strong)] fade-in-up"
      data-reconciliation-workspace
    >
      <div className="border-b border-white/5 bg-[var(--nc-surface-solid)] p-4">
        <h3 className="text-sm font-bold text-white">
          {L("المصالحة البنكية", "Bank reconciliation")}
        </h3>
        <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
          {L(
            "مطابقة كشف الحساب الحقيقي مع القيود المحاسبية المرحلة دون تعديل السجلات.",
            "Match a real bank statement against posted ledger entries without changing records.",
          )}
        </p>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <CloudUpload className="mt-0.5 text-[var(--nc-op-blue)]" size={24} />
              <div>
                <strong className="block text-xs text-white">
                  {L("رفع كشف الحساب", "Upload bank statement")}
                </strong>
                <span className="mt-1 block text-[10px] text-[var(--nc-text-dim)]">
                  {L(
                    "CSV فقط، بحد أقصى 5 ميجابايت. الأعمدة: التاريخ، الوصف، المرجع، المبلغ.",
                    "CSV only, up to 5 MB. Columns: date, description, reference, amount.",
                  )}
                </span>
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
                className="max-w-full text-[11px] text-[var(--nc-text-dim)] file:me-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white"
              />
              <button
                type="button"
                onClick={() => void runReconciliation()}
                disabled={!file || loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--orca-action-gold)] px-4 text-[11px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {L("تشغيل المطابقة", "Run matching")}
              </button>
            </div>
          </div>

          {file && (
            <p className="mt-3 text-[10px] text-[var(--nc-text-dim)]">
              {L("الملف المختار:", "Selected file:")} {file.name}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [L("المطابقات", "Matches"), formatNumberValue(matches.length, locale)],
                [L("حركات بنكية غير مطابقة", "Unmatched bank lines"), formatNumberValue(unmatchedStatement.length, locale)],
                [L("قيود غير مطابقة", "Unmatched ledger entries"), formatNumberValue(unmatchedGL.length, locale)],
                [L("صافي الفرق", "Net difference"), formatMoneyValue(result.summary?.netDifference || 0, locale)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <span className="text-[10px] text-[var(--nc-text-dim)]">{label}</span>
                  <strong className="mt-2 block text-base text-white">{value}</strong>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-[11px] text-sky-200">
              {result.reconciled
                ? L("اكتملت المطابقة دون فروقات.", "Reconciliation completed without differences.")
                : L(
                    "تم تحليل الكشف. راجع الحركات والقيود غير المطابقة قبل أي قيد محاسبي.",
                    "The statement was analyzed. Review unmatched lines before posting any accounting entry.",
                  )}
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="space-y-2">
                <h4 className="text-xs font-black text-emerald-300">
                  {L("المطابقات المؤكدة آليًا", "Automatically matched")}
                </h4>
                {matches.length === 0 ? (
                  <p className="rounded-xl border border-white/5 p-4 text-[11px] text-[var(--nc-text-dim)]">
                    {L("لا توجد مطابقات.", "No matches found.")}
                  </p>
                ) : (
                  matches.map((match) => (
                    <article key={`${match.statementLine.reference}:${match.glEntry.id}`} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-[11px]">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-white">{safeDisplayValue(match.statementLine.description, locale)}</strong>
                        <span className="font-black text-emerald-300">{formatMoneyValue(match.statementLine.amount, locale)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--nc-text-dim)]">
                        <span>{L("القيد:", "Entry:")} {formatNumberValue(match.glEntry.entryNumber, locale)}</span>
                        <span>{L("الثقة:", "Confidence:")} {formatNumberValue(Math.round(match.confidence * 100), locale)}%</span>
                        <span>{L("الفرق:", "Difference:")} {formatMoneyValue(match.difference, locale)}</span>
                      </div>
                    </article>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-rose-300">
                  {L("الاستثناءات", "Exceptions")}
                </h4>
                {unmatchedStatement.length === 0 && unmatchedGL.length === 0 ? (
                  <p className="rounded-xl border border-white/5 p-4 text-[11px] text-[var(--nc-text-dim)]">
                    {L("لا توجد استثناءات.", "No exceptions.")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unmatchedStatement.map((line, index) => (
                      <article key={`statement:${line.reference}:${index}`} className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3 text-[11px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white">{safeDisplayValue(line.description, locale)}</span>
                          <strong className="text-rose-300">{formatMoneyValue(line.amount, locale)}</strong>
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">{L("حركة بنكية بلا قيد مطابق", "Bank line without a matching entry")}</p>
                      </article>
                    ))}
                    {unmatchedGL.map((entry) => (
                      <article key={`gl:${entry.id}`} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white">{safeDisplayValue(entry.description, locale)}</span>
                          <strong className="text-amber-300">{formatMoneyValue(entry.amount, locale)}</strong>
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--nc-text-dim)]">{L("قيد محاسبي بلا حركة بنكية مطابقة", "Ledger entry without a matching bank line")}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
