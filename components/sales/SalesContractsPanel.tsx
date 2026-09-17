"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  REALTIME_SYNC_EVENT,
  shouldInvalidateFromSync,
} from "@/lib/realtime/client-runtime";
import {
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsEmptyState,
  OperationsMasterList,
  OperationsPagination,
  OperationsMasterRow,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

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

const PAGE_SIZE = OPERATIONS_TABLE_PAGE_SIZE;
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
  const raw = String(value).trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
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

  useEffect(() => {
    const onRealtimeSync = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (shouldInvalidateFromSync(detail, "deals")) {
        void load();
      }
    };

    window.addEventListener(REALTIME_SYNC_EVENT, onRealtimeSync);
    return () =>
      window.removeEventListener(REALTIME_SYNC_EVENT, onRealtimeSync);
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
    <OperationsPanel
      className="overflow-hidden"
      data-sales-contracts-workspace
    >
      <OperationsPanelHeader
        title={L("عقود البيع", "Sales contracts")}
        description={L(
          "افتح العقد لإدارة خطته وأقساطه ومدفوعاته في صفحة مستقلة.",
          "Open a contract to manage its plan, installments, and payments in a dedicated workspace.",
        )}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={operationsVisual.iconButton}
            aria-label={L("تحديث عقود البيع", "Refresh sales contracts")}
            title={L("تحديث", "Refresh")}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="m-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-h-48 place-items-center text-xs text-[var(--nc-text-dim)]">
          {L("جارٍ التحميل…", "Loading…")}
        </div>
      ) : rowData.length === 0 ? (
        <div className="p-3">
          <OperationsEmptyState>
            {L("لا توجد عقود بيع.", "No sales contracts.")}
          </OperationsEmptyState>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(130px,.8fr)_minmax(160px,1fr)_minmax(24ch,.8fr)_130px_minmax(170px,1fr)_44px] gap-3 border-b border-[var(--nc-border)] px-4 py-2 font-black text-[var(--nc-text-dim)] lg:grid orca-contracts-grid-header">
            <span>{L("الوحدة", "Unit")}</span>
            <span>{L("المشتري", "Buyer")}</span>
            <span>{L("القيمة", "Value")}</span>
            <span>{L("الحالة", "Status")}</span>
            <span>{L("القسط التالي", "Next installment")}</span>
            <span aria-hidden="true" />
          </div>

          <OperationsMasterList>
            {rowData.map(({ contract, next }) => (
              <OperationsMasterRow
                key={contract.id}
                onClick={() =>
                  router.push(`/operations/rental/sales/contracts/${contract.id}`)
                }
                className="orca-contracts-grid-row grid min-h-[68px] items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(130px,.8fr)_minmax(160px,1fr)_minmax(24ch,.8fr)_130px_minmax(170px,1fr)_44px]"
                aria-label={L(
                  `فتح عقد ${contract.buyerName}`,
                  `Open ${contract.buyerName} contract`,
                )}
              >
                <span className="min-w-0">
                  <strong className="orca-table-primary block truncate text-[var(--nc-text-primary)]">
                    {contract.unit.unitNumber}
                  </strong>
                  <span className="orca-table-secondary block truncate text-[var(--nc-text-dim)]">
                    {contract.unit.project.name}
                  </span>
                </span>

                <span className="min-w-0">
                  <strong className="orca-table-primary block truncate text-[var(--nc-text-primary)]">
                    {contract.buyerName}
                  </strong>
                  <span className="orca-table-secondary block text-[var(--nc-text-dim)] lg:hidden">
                    {money(contract.totalVolumeSar, locale)}
                  </span>
                </span>

                <strong className="orca-table-primary orca-number-column hidden text-[var(--nc-text-primary)] lg:block">
                  {money(contract.totalVolumeSar, locale)}
                </strong>

                <span
                  className={`inline-flex w-fit min-w-[104px] justify-center rounded-full px-2.5 py-1 font-black orca-table-badge ${
                    contract.status === "SIGNED"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {contractStatus(contract.status, locale)}
                </span>

                <span className="orca-table-secondary min-w-0 text-[var(--nc-text-secondary)]">
                  {next
                    ? `${money(next.remainingAmount, locale)} · ${shortDate(next.dueDate)}`
                    : contract.legacyFinancial
                      ? L("للعرض فقط", "Read-only")
                      : L("لا يوجد قسط مستحق", "No installment due")}
                </span>

                <span className="hidden h-10 w-10 place-items-center rounded-xl border border-[var(--nc-border)] text-[var(--nc-text-secondary)] lg:grid">
                  <ExternalLink size={14} aria-hidden="true" />
                </span>
              </OperationsMasterRow>
            ))}
          </OperationsMasterList>
        </>
      )}

      <OperationsPagination
        page={normalizedPage}
        totalPages={totalPages}
        totalItems={contracts.length}
        pageSize={PAGE_SIZE}
        locale={locale}
        onPageChange={setPage}
      />
    </OperationsPanel>
  );
}
