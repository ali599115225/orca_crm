"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

type Locale = "ar" | "en";

type SalesContract = {
  id: string;
  status: string;
  buyerName: string;
  totalVolumeSar: number;
  signedAt: string | null;
  reservationExpiresAt: string | null;
  legacyFinancial: boolean;
  unit: {
    id: string;
    unitNumber: string;
    project: { id: string; name: string };
  };
  installments: Array<{
    id: string;
    installmentNumber: number;
    remainingAmount: number;
    dueDate: string;
    paymentStatus: string;
  }>;
};

const PAGE_SIZE = 5;
const COLLECTIBLE = new Set(["Pending", "Partial", "Overdue"]);

function text(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function contractStatus(status: string, locale: Locale) {
  return status === "SIGNED"
    ? text(locale, "موقّع", "Signed")
    : text(locale, "بانتظار التوقيع", "Pending signature");
}

export default function SalesContractsPanel({ locale }: { locale: Locale }) {
  const router = useRouter();
  const L = useCallback(
    (ar: string, en: string) => text(locale, ar, en),
    [locale],
  );
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        throw new Error(
          payload.error ||
            L("تعذر جلب عقود البيع.", "Failed to load sales contracts."),
        );
      }
      setContracts(Array.isArray(payload.data) ? payload.data : []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : L("حدث خطأ غير متوقع.", "Unexpected error."),
      );
    } finally {
      setLoading(false);
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(contracts.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages - 1);
  const rows = contracts.slice(
    normalizedPage * PAGE_SIZE,
    normalizedPage * PAGE_SIZE + PAGE_SIZE,
  );

  const rowData = useMemo(
    () =>
      rows.map((contract) => {
        const next =
          [...contract.installments]
            .filter(
              (item) =>
                COLLECTIBLE.has(item.paymentStatus) &&
                item.remainingAmount > 0,
            )
            .sort(
              (left, right) =>
                left.dueDate.localeCompare(right.dueDate) ||
                left.installmentNumber - right.installmentNumber,
            )[0] || null;
        return { contract, next };
      }),
    [rows],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
            {L("عقود البيع", "Sales contracts")}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
            {L(
              "افتح العقد لإدارة خطته وأقساطه ومدفوعاته في صفحة مستقلة.",
              "Open a contract to manage its plan, installments, and payments in a dedicated workspace.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--nc-glass-border)] px-3 py-2 text-xs font-bold text-[var(--nc-text-primary)] disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {L("تحديث", "Refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)]">
        <div className="overflow-x-auto">
          <table className="nc-table nc-table-striped min-w-[760px]">
            <thead>
              <tr>
                <th>{L("الوحدة", "Unit")}</th>
                <th>{L("المشتري", "Buyer")}</th>
                <th>{L("القيمة", "Value")}</th>
                <th>{L("الحالة", "Status")}</th>
                <th>{L("القسط التالي", "Next installment")}</th>
                <th>{L("فتح", "Open")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-xs text-[var(--nc-text-dim)]"
                  >
                    {L("جارٍ التحميل…", "Loading…")}
                  </td>
                </tr>
              ) : rowData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-xs text-[var(--nc-text-dim)]"
                  >
                    {L("لا توجد عقود بيع.", "No sales contracts.")}
                  </td>
                </tr>
              ) : (
                rowData.map(({ contract, next }) => (
                  <tr
                    key={contract.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/operations/sales/contracts/${contract.id}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(
                          `/operations/sales/contracts/${contract.id}`,
                        );
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="text-xs font-black text-[var(--nc-text-primary)]">
                        {contract.unit.unitNumber}
                      </div>
                      <div className="text-[10px] text-[var(--nc-text-dim)]">
                        {contract.unit.project.name}
                      </div>
                    </td>
                    <td className="text-xs text-[var(--nc-text-primary)]">
                      {contract.buyerName}
                    </td>
                    <td className="whitespace-nowrap text-xs font-bold text-[var(--nc-text-primary)]">
                      {money(contract.totalVolumeSar, locale)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex min-w-[110px] justify-center rounded-full px-2.5 py-1 text-[10px] font-black ${
                          contract.status === "SIGNED"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {contractStatus(contract.status, locale)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--nc-text-dim)]">
                      {next
                        ? `${money(next.remainingAmount, locale)} · ${shortDate(next.dueDate)}`
                        : "—"}
                    </td>
                    <td>
                      <ExternalLink size={15} className="text-[var(--nc-accent)]" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)]">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={normalizedPage === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--nc-glass-border)] px-3 py-1.5 font-bold disabled:opacity-30"
          >
            <ChevronLeft size={14} />
            {L("السابق", "Previous")}
          </button>
          <span>
            {L("صفحة", "Page")} {normalizedPage + 1} {L("من", "of")}{" "}
            {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((value) => Math.min(totalPages - 1, value + 1))
            }
            disabled={normalizedPage >= totalPages - 1}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--nc-glass-border)] px-3 py-1.5 font-bold disabled:opacity-30"
          >
            {L("التالي", "Next")}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
