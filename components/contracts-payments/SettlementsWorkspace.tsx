"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import {
  displayEntitySafe,
  displayPersonSafe,
  formatDateValue,
  formatMoneyValue,
  safeDisplayValue,
  textFor,
  type ContractsPaymentsLocale,
} from "@/components/contracts-payments/workspace-display";

export interface SettlementWorkspaceRecord {
  id: string;
  type: "SALE" | "RENTAL";
  contractId: string;
  leaseId: string | null;
  customerName: string | null;
  unitName: string | null;
  gross: number;
  deductions: number;
  net: number;
  currency: string;
  status: "pending" | "completed";
  reference: string | null;
  date: string;
}

interface SettlementsWorkspaceProps {
  locale: ContractsPaymentsLocale;
  settlements: SettlementWorkspaceRecord[];
  loading: boolean;
  fetchError: string | null;
  onRetry: () => Promise<void>;
  onOpenSaleContract: (contractId: string) => void;
  onOpenLease: (leaseId: string) => void;
}

const PAGE_SIZE = 8;

export default function SettlementsWorkspace({
  locale,
  settlements,
  loading,
  fetchError,
  onRetry,
  onOpenSaleContract,
  onOpenLease,
}: SettlementsWorkspaceProps) {
  const L = (ar: string, en: string) => textFor(locale, ar, en);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return settlements.filter((settlement) => {
      const searchable = [
        settlement.id,
        settlement.contractId,
        settlement.leaseId,
        settlement.customerName,
        settlement.unitName,
        settlement.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!query || searchable.includes(query)) &&
        (!typeFilter || settlement.type === typeFilter);
    });
  }, [search, settlements, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages - 1);
  const rows = filtered.slice(
    normalizedPage * PAGE_SIZE,
    normalizedPage * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => setPage(0), [search, typeFilter]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/5 bg-[var(--nc-surface-strong)] fade-in-up"
      data-settlements-workspace
    >
      <div className="flex flex-col gap-4 border-b border-white/5 bg-[var(--nc-surface-solid)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            {L("سجل التسويات المالية", "Financial settlements ledger")}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
            {L(
              "يعرض التسويات الحقيقية الناتجة عن السداد المبكر ومراجع إغلاق عقود الإيجار.",
              "Shows real settlements produced by early settlement and rental-close references.",
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-[var(--nc-text-dim)]" size={13} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={L("بحث بالعميل أو المرجع...", "Search customer or reference...")}
              className="w-full rounded-xl border border-white/10 bg-[var(--nc-surface-strong)] py-2 pl-3 pr-8 text-xs text-white outline-none sm:w-56"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-[var(--nc-surface-strong)] px-3 text-xs text-white outline-none"
          >
            <option value="">{L("كل الأنواع", "All types")}</option>
            <option value="SALE">{L("تسويات البيع", "Sales settlements")}</option>
            <option value="RENTAL">{L("تسويات الإيجار", "Rental settlements")}</option>
          </select>
          <button
            type="button"
            onClick={() => void onRetry()}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-[11px] font-bold text-white disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {L("تحديث", "Refresh")}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {fetchError}
        </div>
      )}

      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="nc-table nc-table-striped">
          <thead>
            <tr>
              <th>{L("التاريخ", "Date")}</th>
              <th>{L("النوع", "Type")}</th>
              <th>{L("العميل / الوحدة", "Customer / Unit")}</th>
              <th>{L("الإجمالي", "Gross")}</th>
              <th>{L("الخصومات", "Deductions")}</th>
              <th>{L("الصافي", "Net")}</th>
              <th>{L("المرجع", "Reference")}</th>
              <th>{L("الإجراء", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="!py-10 text-center text-xs text-[var(--nc-text-dim)]">
                  {loading
                    ? L("جارٍ تحميل التسويات...", "Loading settlements...")
                    : L("لا توجد تسويات حقيقية مطابقة.", "No matching real settlements.")}
                </td>
              </tr>
            ) : (
              rows.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="whitespace-nowrap !py-2">{formatDateValue(settlement.date, locale)}</td>
                  <td className="whitespace-nowrap !py-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-white">
                      {settlement.type === "SALE"
                        ? L("بيع", "Sale")
                        : L("إيجار", "Rental")}
                    </span>
                  </td>
                  <td className="min-w-[170px] !py-2">
                    <div className="max-w-[190px] truncate text-white">
                      {displayPersonSafe(settlement.customerName, locale)}
                    </div>
                    <div className="max-w-[190px] truncate text-[10px] text-[var(--nc-text-dim)]">
                      {displayEntitySafe(settlement.unitName, "unit", locale)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap !py-2">{formatMoneyValue(settlement.gross, locale)}</td>
                  <td className="whitespace-nowrap !py-2 text-rose-300">{formatMoneyValue(settlement.deductions, locale)}</td>
                  <td className="whitespace-nowrap !py-2 font-black text-emerald-300">{formatMoneyValue(settlement.net, locale)}</td>
                  <td className="max-w-[160px] truncate !py-2 text-[10px] text-[var(--nc-text-dim)]">
                    {safeDisplayValue(settlement.reference, locale)}
                  </td>
                  <td className="whitespace-nowrap !py-2">
                    {settlement.type === "SALE" ? (
                      <button
                        type="button"
                        onClick={() => onOpenSaleContract(settlement.contractId)}
                        className="rounded-lg border border-[var(--nc-op-blue)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--nc-op-blue)]"
                      >
                        {L("فتح عقد البيع", "Open sales contract")}
                      </button>
                    ) : settlement.leaseId ? (
                      <button
                        type="button"
                        onClick={() => onOpenLease(settlement.leaseId as string)}
                        className="rounded-lg border border-[var(--nc-op-blue)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--nc-op-blue)]"
                      >
                        {L("فتح عقد الإيجار", "Open rental lease")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-[11px] text-[var(--nc-text-dim)]">
          <span>{L(`صفحة ${normalizedPage + 1} من ${totalPages}`, `Page ${normalizedPage + 1} of ${totalPages}`)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={normalizedPage === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
            >
              {L("السابق", "Previous")}
            </button>
            <button
              type="button"
              disabled={normalizedPage >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
            >
              {L("التالي", "Next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
