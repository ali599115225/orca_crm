"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSignature,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type Locale = "ar" | "en";
type PaymentTemplate =
  | "SINGLE_PAYMENT"
  | "DEPOSIT_AND_BALANCE"
  | "MONTHLY";

type Installment = {
  id: string;
  installmentNumber: number;
  amountSar: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paymentStatus: string;
};

type SalesContract = {
  id: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  totalVolumeSar: number;
  acceptedAt: string;
  reservationExpiresAt: string | null;
  signedAt: string | null;
  spineVersion: number;
  legacyFinancial: boolean;
  legacyReason: string | null;
  unit: {
    id: string;
    unitNumber: string;
    status: string;
    project: { id: string; name: string };
  };
  paymentPlan: null | {
    id: string;
    template: string;
    status: string;
    totalAmount: number;
    installmentCount: number;
    schedule: unknown;
  };
  invoice: null | {
    id: string;
    invoiceNumber: number;
    invoicePrefix: string;
    totalAmount: number;
    status: string;
    dueDate: string;
  };
  installments: Installment[];
};

const PAGE_SIZE = 5;
const COLLECTIBLE = new Set(["Pending", "Partial", "Overdue"]);

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function contractStatus(status: string, locale: Locale) {
  if (status === "SIGNED") return locale === "ar" ? "موقّع" : "Signed";
  return locale === "ar" ? "بانتظار التوقيع" : "Pending signature";
}

function installmentStatus(status: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    Pending: ["مستحق", "Pending"],
    Processing: ["قيد المعالجة", "Processing"],
    Partial: ["مدفوع جزئيًا", "Partially paid"],
    Paid: ["مدفوع", "Paid"],
    Overdue: ["متأخر", "Overdue"],
    Cancelled: ["ملغي", "Cancelled"],
  };
  const label = labels[status] || ["غير محدد", "Not specified"];
  return locale === "ar" ? label[0] : label[1];
}

export default function SalesContractsPanel({ locale }: { locale: Locale }) {
  const L = useCallback(
    (ar: string, en: string) => (locale === "ar" ? ar : en),
    [locale],
  );
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [template, setTemplate] = useState<PaymentTemplate>("SINGLE_PAYMENT");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [depositPercent, setDepositPercent] = useState(10);
  const [firstDueDate, setFirstDueDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/contracts?take=200", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || L("تعذر جلب عقود البيع.", "Failed to load sales contracts."));
      }
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setContracts(rows);
      setSelectedId((current) =>
        current && rows.some((item: SalesContract) => item.id === current)
          ? current
          : rows[0]?.id || null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("حدث خطأ غير متوقع.", "Unexpected error."));
    } finally {
      setLoading(false);
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => contracts.find((item) => item.id === selectedId) || null,
    [contracts, selectedId],
  );

  useEffect(() => {
    if (!selected?.paymentPlan) return;
    const current = selected.paymentPlan.template as PaymentTemplate;
    if (["SINGLE_PAYMENT", "DEPOSIT_AND_BALANCE", "MONTHLY"].includes(current)) {
      setTemplate(current);
    }
    setInstallmentCount(Math.max(2, selected.paymentPlan.installmentCount || 3));
  }, [selectedId, selected?.paymentPlan]);

  const totalPages = Math.max(1, Math.ceil(contracts.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages - 1);
  const rows = contracts.slice(
    normalizedPage * PAGE_SIZE,
    normalizedPage * PAGE_SIZE + PAGE_SIZE,
  );

  const nextInstallment = useMemo(() => {
    if (!selected || selected.legacyFinancial) return null;
    return [...selected.installments]
      .filter((item) => COLLECTIBLE.has(item.paymentStatus) && item.remainingAmount > 0)
      .sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        a.installmentNumber - b.installmentNumber,
      )[0] || null;
  }, [selected]);

  async function mutate(
    key: string,
    url: string,
    body?: Record<string, unknown>,
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || L("تعذر تنفيذ العملية.", "Operation failed."));
      }
      setNotice(L("تم تنفيذ العملية بنجاح.", "Operation completed successfully."));
      await load();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("حدث خطأ غير متوقع.", "Unexpected error."));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function savePlan() {
    if (!selected) return;
    setBusy("plan");
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/contracts/${selected.id}/payment-plan`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          installmentCount: template === "MONTHLY" ? installmentCount : undefined,
          depositPercent: template === "DEPOSIT_AND_BALANCE" ? depositPercent : undefined,
          firstDueDate: firstDueDate || undefined,
          intervalDays: 30,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || L("تعذر حفظ خطة الدفع.", "Failed to save payment plan."));
      }
      setNotice(L("تم حفظ خطة الدفع.", "Payment plan saved."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("تعذر حفظ خطة الدفع.", "Failed to save payment plan."));
    } finally {
      setBusy(null);
    }
  }

  async function cancelContract() {
    if (!selected) return;
    const reason = window.prompt(
      L("أدخل سبب إلغاء الحجز والعقد:", "Enter the cancellation reason:"),
    );
    if (!reason) return;
    await mutate("cancel", `/api/v1/contracts/${selected.id}/cancel`, { reason });
  }

  async function payInstallment(installment: Installment) {
    setBusy(`pay:${installment.id}`);
    setError("");
    try {
      const response = await fetch(`/api/v1/installments/${installment.id}/pay/ngenius`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.redirectUrl) {
        throw new Error(payload.error || L("تعذر إنشاء رابط الدفع.", "Failed to create payment link."));
      }
      window.location.assign(payload.redirectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("تعذر إنشاء رابط الدفع.", "Failed to create payment link."));
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
            {L("مسار عقود البيع", "Sales contract workflow")}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
            {L(
              "قبول العرض يحجز الوحدة، والتوقيع يفعّل الفاتورة وخطة الأقساط والتحصيل.",
              "Offer acceptance reserves the unit; signing activates invoicing, installments, and collection.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--nc-glass-border)] px-3 py-2 text-xs font-bold text-[var(--nc-text-primary)] disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {L("تحديث", "Refresh")}
        </button>
      </div>

      {(error || notice) && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div dir="ltr" className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="overflow-hidden rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)]">
          <div className="overflow-x-auto">
            <table className="nc-table nc-table-striped min-w-[720px]">
              <thead>
                <tr>
                  <th>{L("الوحدة", "Unit")}</th>
                  <th>{L("المشتري", "Buyer")}</th>
                  <th>{L("القيمة", "Value")}</th>
                  <th>{L("الحالة", "Status")}</th>
                  <th>{L("القسط التالي", "Next installment")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-xs text-[var(--nc-text-dim)]">{L("جارٍ التحميل…", "Loading…")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-xs text-[var(--nc-text-dim)]">{L("لا توجد عقود بيع.", "No sales contracts.")}</td></tr>
                ) : (
                  rows.map((contract) => {
                    const next = [...contract.installments]
                      .filter((item) => COLLECTIBLE.has(item.paymentStatus) && item.remainingAmount > 0)
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                    return (
                      <tr
                        key={contract.id}
                        onClick={() => setSelectedId(contract.id)}
                        className={`cursor-pointer transition-colors ${selectedId === contract.id ? "bg-blue-500/10" : ""}`}
                      >
                        <td>
                          <div className="text-xs font-black text-[var(--nc-text-primary)]">{contract.unit.unitNumber}</div>
                          <div className="text-[10px] text-[var(--nc-text-dim)]">{contract.unit.project.name}</div>
                        </td>
                        <td className="text-xs text-[var(--nc-text-primary)]">{contract.buyerName}</td>
                        <td className="whitespace-nowrap text-xs font-bold text-[var(--nc-text-primary)]">{money(contract.totalVolumeSar, locale)}</td>
                        <td>
                          <span className={`inline-flex min-w-[110px] justify-center rounded-full px-2.5 py-1 text-[10px] font-black ${contract.status === "SIGNED" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                            {contractStatus(contract.status, locale)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-xs text-[var(--nc-text-dim)]">
                          {next ? `${money(next.remainingAmount, locale)} · ${shortDate(next.dueDate)}` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)]">
            <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={normalizedPage === 0} className="inline-flex items-center gap-1 rounded-lg border border-[var(--nc-glass-border)] px-3 py-1.5 font-bold disabled:opacity-30">
              <ChevronLeft size={14} /> {L("السابق", "Previous")}
            </button>
            <span>{L("صفحة", "Page")} {normalizedPage + 1} {L("من", "of")} {totalPages}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={normalizedPage >= totalPages - 1} className="inline-flex items-center gap-1 rounded-lg border border-[var(--nc-glass-border)] px-3 py-1.5 font-bold disabled:opacity-30">
              {L("التالي", "Next")} <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <aside dir={locale === "ar" ? "rtl" : "ltr"} className="rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-4">
          {!selected ? (
            <div className="py-16 text-center text-xs text-[var(--nc-text-dim)]">{L("اختر عقدًا لعرض التفاصيل.", "Select a contract to view details.")}</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-[var(--nc-text-dim)]">{selected.unit.project.name}</p>
                  <h3 className="mt-1 text-base font-black text-[var(--nc-text-primary)]">{selected.unit.unitNumber} · {selected.buyerName}</h3>
                  <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">{contractStatus(selected.status, locale)} · {money(selected.totalVolumeSar, locale)}</p>
                </div>
                {selected.status === "SIGNED" ? <ShieldCheck className="text-emerald-400" size={24} /> : <FileSignature className="text-amber-400" size={24} />}
              </div>

              {selected.legacyFinancial && (
                <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 p-3 text-xs text-[var(--nc-text-secondary)]">
                  {L(
                    "عقد تاريخي محفوظ للعرض فقط. لا تُعدّل خطته ولا تُنشأ عليه دفعات جديدة.",
                    "Legacy contract preserved as read-only. Its plan cannot be changed and no new payments can be created.",
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-[var(--nc-glass-border)] p-3"><span className="block text-[var(--nc-text-dim)]">{L("تاريخ القبول", "Accepted")}</span><strong className="mt-1 block text-[var(--nc-text-primary)]" dir="ltr">{shortDate(selected.acceptedAt)}</strong></div>
                <div className="rounded-xl border border-[var(--nc-glass-border)] p-3"><span className="block text-[var(--nc-text-dim)]">{selected.status === "SIGNED" ? L("تاريخ التوقيع", "Signed") : L("انتهاء الحجز", "Reservation expiry")}</span><strong className="mt-1 block text-[var(--nc-text-primary)]" dir="ltr">{shortDate(selected.status === "SIGNED" ? selected.signedAt : selected.reservationExpiresAt)}</strong></div>
              </div>

              {selected.status === "PENDING_SIGNATURE" && !selected.legacyFinancial && (
                <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <h4 className="text-xs font-black text-[var(--nc-text-primary)]">{L("خطة الدفع قبل التوقيع", "Payment plan before signing")}</h4>
                  <select value={template} onChange={(event) => setTemplate(event.target.value as PaymentTemplate)} className="w-full rounded-lg border border-[var(--nc-glass-border)] bg-[var(--nc-background)] px-3 py-2 text-xs text-[var(--nc-text-primary)]">
                    <option value="SINGLE_PAYMENT">{L("دفعة واحدة", "Single payment")}</option>
                    <option value="DEPOSIT_AND_BALANCE">{L("عربون + رصيد", "Deposit + balance")}</option>
                    <option value="MONTHLY">{L("أقساط شهرية", "Monthly installments")}</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} className="rounded-lg border border-[var(--nc-glass-border)] bg-[var(--nc-background)] px-3 py-2 text-xs text-[var(--nc-text-primary)]" />
                    {template === "MONTHLY" && <input type="number" min={2} max={120} value={installmentCount} onChange={(event) => setInstallmentCount(Number(event.target.value))} className="rounded-lg border border-[var(--nc-glass-border)] bg-[var(--nc-background)] px-3 py-2 text-xs text-[var(--nc-text-primary)]" />}
                    {template === "DEPOSIT_AND_BALANCE" && <input type="number" min={1} max={99} value={depositPercent} onChange={(event) => setDepositPercent(Number(event.target.value))} className="rounded-lg border border-[var(--nc-glass-border)] bg-[var(--nc-background)] px-3 py-2 text-xs text-[var(--nc-text-primary)]" />}
                  </div>
                  <button type="button" onClick={() => void savePlan()} disabled={busy !== null} className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300 disabled:opacity-40">{busy === "plan" ? L("جارٍ الحفظ…", "Saving…") : L("حفظ خطة الدفع", "Save payment plan")}</button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void mutate("sign", `/api/v1/contracts/${selected.id}/sign`, { confirm: true })} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"><CheckCircle2 size={14} />{L("تأكيد التوقيع", "Confirm signing")}</button>
                    <button type="button" onClick={() => void cancelContract()} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-black text-rose-300 disabled:opacity-40"><XCircle size={14} />{L("إلغاء الحجز", "Cancel reservation")}</button>
                  </div>
                </div>
              )}

              {selected.status === "SIGNED" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[var(--nc-text-primary)]">{L("الأقساط والتحصيل", "Installments and collection")}</h4>
                    {selected.invoice && <span className="text-[10px] text-[var(--nc-text-dim)]">{selected.invoice.invoicePrefix}-{selected.invoice.invoiceNumber}</span>}
                  </div>
                  {selected.installments.length === 0 ? (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">{selected.legacyFinancial
                        ? L("لا توجد أقساط حديثة لهذا العقد التاريخي.", "No cutover installments exist for this legacy contract.")
                        : L("العقد الموقّع لا يملك أقساطًا. يلزم مراجعة المسار المالي.", "Signed contract has no installments. Financial review is required.")}</div>
                  ) : (
                    <div className="space-y-2">
                      {selected.installments.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[var(--nc-glass-border)] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <strong className="text-xs text-[var(--nc-text-primary)]">{L("القسط", "Installment")} {item.installmentNumber}</strong>
                              <div className="mt-1 text-[10px] text-[var(--nc-text-dim)]" dir="ltr">{shortDate(item.dueDate)}</div>
                            </div>
                            <div className="text-end">
                              <strong className="block text-xs text-[var(--nc-text-primary)]">{money(item.remainingAmount, locale)}</strong>
                              <span className="text-[10px] text-[var(--nc-text-dim)]">{installmentStatus(item.paymentStatus, locale)}</span>
                            </div>
                          </div>
                          {!selected.legacyFinancial && COLLECTIBLE.has(item.paymentStatus) && item.remainingAmount > 0 && (
                            <button type="button" onClick={() => void payInstallment(item)} disabled={busy !== null} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-300 disabled:opacity-40"><CreditCard size={13} />{busy === `pay:${item.id}` ? L("جارٍ التحويل…", "Redirecting…") : L("دفع هذا القسط", "Pay this installment")}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {nextInstallment && !selected.legacyFinancial && (
                    <button type="button" onClick={() => void payInstallment(nextInstallment)} disabled={busy !== null} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--nc-accent)] px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><CreditCard size={15} />{L("دفع القسط التالي", "Pay next installment")}</button>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
