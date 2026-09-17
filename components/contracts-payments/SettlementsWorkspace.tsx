"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import {
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsPagination,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsRowAction,
  OperationsRowActions,
  OperationsTableToolbar,
  OperationsTextField,
} from "@/components/operations";
import SettingsSelect from "@/components/settings/SettingsSelect";
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

const PAGE_SIZE = OPERATIONS_TABLE_PAGE_SIZE;

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
    <OperationsPanel className="overflow-hidden" data-settlements-workspace>
      <OperationsPanelHeader
        title={L("سجل التسويات المالية", "Financial settlements ledger")}
        description={L(
          "التسويات الناتجة عن السداد المبكر وإغلاق عقود الإيجار مع ارتباط مباشر بالعقد عند توفره.",
          "Settlements from early payoff and rental closure with direct contract access when available.",
        )}
      />

      <OperationsTableToolbar data-settlements-toolbar>
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:flex-1">
            <Search className="absolute right-3 top-3.5 text-[var(--nc-text-dim)]" size={13} />
            <OperationsTextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={L("بحث بالعميل أو المرجع...", "Search customer or reference...")}
              className="w-full pl-3 pr-8"
            />
          </div>
          <SettingsSelect
            className="w-full lg:w-44"
            placement="bottom"
            value={typeFilter}
            onChange={setTypeFilter}
            aria-label={L("تصفية نوع التسوية", "Filter settlement type")}
            options={[
              { value: "", label: L("كل الأنواع", "All types") },
              { value: "SALE", label: L("تسويات البيع", "Sales settlements") },
              { value: "RENTAL", label: L("تسويات الإيجار", "Rental settlements") },
            ]}
          />
          <button
            type="button"
            onClick={() => void onRetry()}
            disabled={loading}
            className="orca-operations-secondary-button"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {L("تحديث", "Refresh")}
          </button>
        </div>
      </OperationsTableToolbar>

      {fetchError ? (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {fetchError}
        </div>
      ) : null}

      <div className="orca-contracts-table-scroll">
        <table className="nc-table nc-table-striped orca-contracts-data-table">
          <thead>
            <tr>
              <th className="orca-date-column">{L("التاريخ", "Date")}</th>
              <th className="orca-status-column">{L("النوع", "Type")}</th>
              <th className="orca-text-column">{L("العميل / الوحدة", "Customer / Unit")}</th>
              <th className="orca-number-column">{L("الإجمالي", "Gross")}</th>
              <th className="orca-number-column">{L("الخصومات", "Deductions")}</th>
              <th className="orca-number-column">{L("الصافي", "Net")}</th>
              <th className="orca-reference-column">{L("المرجع", "Reference")}</th>
              <th className="orca-single-action-column">{L("الإجراء", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="!py-8 text-center text-xs text-[var(--nc-text-dim)]">
                  {loading
                    ? L("جارٍ تحميل التسويات...", "Loading settlements...")
                    : L("لا توجد تسويات حقيقية مطابقة.", "No matching real settlements.")}
                </td>
              </tr>
            ) : (
              rows.map((settlement) => {
                const canOpenSaleContract = settlement.type === "SALE" && Boolean(settlement.contractId);
                const canOpenLease = settlement.type === "RENTAL" && Boolean(settlement.leaseId);
                const canOpenContract = canOpenSaleContract || canOpenLease;
                const actionLabel = canOpenSaleContract
                  ? L("فتح عقد البيع", "Open sales contract")
                  : canOpenLease
                    ? L("فتح عقد الإيجار", "Open rental lease")
                    : L("فتح العقد", "Open contract");

                return (
                  <tr key={settlement.id} className="orca-data-row">
                    <td className="orca-date-column">{formatDateValue(settlement.date, locale)}</td>
                    <td className="orca-status-column">
                      <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-2.5 py-1 font-black orca-table-badge text-[var(--nc-text-primary)]">
                        {settlement.type === "SALE" ? L("بيع", "Sale") : L("إيجار", "Rental")}
                      </span>
                    </td>
                    <td className="orca-text-column">
                      <div className="orca-table-primary max-w-[200px] truncate text-white">
                        {displayPersonSafe(settlement.customerName, locale)}
                      </div>
                      <div className="orca-table-secondary max-w-[200px] truncate text-[var(--nc-text-dim)]">
                        {displayEntitySafe(settlement.unitName, "unit", locale)}
                      </div>
                    </td>
                    <td className="orca-number-column">{formatMoneyValue(settlement.gross, locale)}</td>
                    <td className="orca-number-column text-rose-300">{formatMoneyValue(settlement.deductions, locale)}</td>
                    <td className="orca-number-column font-black text-emerald-300">{formatMoneyValue(settlement.net, locale)}</td>
                    <td className="orca-reference-column orca-table-primary truncate text-[var(--nc-text-dim)]">
                      {safeDisplayValue(settlement.reference, locale)}
                    </td>
                    <td className="orca-single-action-column">
                      <OperationsRowActions label={L("ارتباط التسوية", "Settlement link")}>
                        <OperationsRowAction
                          icon={ExternalLink}
                          available={canOpenContract}
                          unavailableReason={L("لا يوجد عقد مرتبط قابل للفتح", "No linked contract is available")}
                          onClick={() => {
                            if (canOpenSaleContract) {
                              onOpenSaleContract(settlement.contractId);
                            } else if (canOpenLease && settlement.leaseId) {
                              onOpenLease(settlement.leaseId);
                            }
                          }}
                        >
                          {actionLabel}
                        </OperationsRowAction>
                      </OperationsRowActions>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <OperationsPagination
        page={normalizedPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        locale={locale}
        onPageChange={setPage}
      />
    </OperationsPanel>
  );
}
