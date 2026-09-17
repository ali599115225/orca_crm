'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  Search,
  WalletCards,
  XCircle,
} from 'lucide-react';
import SettingsSelect from '@/components/settings/SettingsSelect';
import {
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPagination,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsRowAction,
  OperationsRowActions,
  OperationsTableToolbar,
  OperationsTextField,
} from '@/components/operations';
import { formatShortId } from '@/lib/ui-formatters';
import {
  displayEntitySafe,
  displayPersonSafe,
  formatDateValue,
  formatMoneyValue,
  formatNumberValue,
  paymentMethodLabel,
  paymentProviderLabel,
  paymentStatusBadgeClass,
  paymentStatusLabel,
  textFor,
  type ContractsPaymentsLocale,
} from '@/components/contracts-payments/workspace-display';

export interface PaymentWorkspaceRecord {
  id: string;
  invoiceId: string | null;
  installmentId?: string | null;
  contractId?: string | null;
  paymentPlanId?: string | null;
  customerName?: string | null;
  unitName?: string | null;
  date: string;
  paidAt?: string | null;
  createdAt?: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency?: string;
  method: string;
  status?: string;
  provider?: string;
  providerReference?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: number;
    invoicePrefix: string;
    status: string;
    type: 'SALE' | 'RENTAL';
    contractId?: string | null;
    leaseId?: string | null;
  } | null;
  installment?: {
    id: string;
    installmentNumber: number;
    amountSar: number;
    dueDate: string;
    paymentStatus: string;
  } | null;
}

interface PaymentsWorkspaceProps {
  locale: ContractsPaymentsLocale;
  payments: PaymentWorkspaceRecord[];
  fetchError: string | null;
  onRetry: () => Promise<void>;
  onOpenSaleContract: (contractId: string) => void;
  onOpenLease: (leaseId: string) => void;
}

const PAGE_SIZE = OPERATIONS_TABLE_PAGE_SIZE;

export default function PaymentsWorkspace({
  locale,
  payments,
  fetchError,
  onRetry,
  onOpenSaleContract,
  onOpenLease,
}: PaymentsWorkspaceProps) {
  const L = (ar: string, en: string) => textFor(locale, ar, en);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [page, setPage] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const invoiceLabel = payment.invoice
        ? `${payment.invoice.invoicePrefix}-${payment.invoice.invoiceNumber}`
        : '';
      const searchable = [
        payment.id,
        payment.invoiceId,
        payment.contractId,
        payment.paymentPlanId,
        payment.customerName,
        payment.unitName,
        payment.providerReference,
        invoiceLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = !statusFilter || payment.status === statusFilter;
      const matchesProvider = !providerFilter || payment.provider === providerFilter;
      return matchesSearch && matchesStatus && matchesProvider;
    });
  }, [payments, providerFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages - 1);
  const rows = filteredPayments.slice(
    normalizedPage * PAGE_SIZE,
    normalizedPage * PAGE_SIZE + PAGE_SIZE,
  );
  const rangeStart = filteredPayments.length === 0 ? 0 : normalizedPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((normalizedPage + 1) * PAGE_SIZE, filteredPayments.length);
  const completed = payments.filter((payment) =>
    ['COMPLETED', 'PAID'].includes(String(payment.status || '').toUpperCase()),
  );
  const completedTotal = completed.reduce((total, payment) => total + payment.amount, 0);
  const pendingCount = payments.filter((payment) =>
    ['PENDING', 'PROCESSING', 'INITIATING'].includes(String(payment.status || '').toUpperCase()),
  ).length;
  const failedCount = payments.filter((payment) =>
    ['FAILED', 'CANCELLED'].includes(String(payment.status || '').toUpperCase()),
  ).length;
  const providers = Array.from(new Set(
    payments.map((payment) => payment.provider).filter((provider): provider is string => Boolean(provider)),
  ));
  const statuses = Array.from(new Set(
    payments.map((payment) => payment.status).filter((status): status is string => Boolean(status)),
  ));

  useEffect(() => setPage(0), [search, statusFilter, providerFilter]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-3" data-payments-workspace>
      <OperationsKpiGrid>
        <OperationsMetricCard
          title={L('إجمالي المحصل', 'Total collected')}
          value={formatMoneyValue(completedTotal, locale)}
          description={L('دفعات مكتملة فعليًا', 'Completed payments only')}
          icon={WalletCards}
        />
        <OperationsMetricCard
          title={L('دفعات مكتملة', 'Completed payments')}
          value={formatNumberValue(completed.length, locale)}
          description={L('معاملات مكتملة أو مدفوعة', 'Completed or paid transactions')}
          icon={CheckCircle2}
        />
        <OperationsMetricCard
          title={L('قيد المعالجة', 'In progress')}
          value={formatNumberValue(pendingCount, locale)}
          description={L('معلقة أو قيد الإنشاء', 'Pending or processing')}
          icon={Clock3}
        />
        <OperationsMetricCard
          title={L('فشلت أو ألغيت', 'Failed or cancelled')}
          value={formatNumberValue(failedCount, locale)}
          description={L('تحتاج مراجعة تشغيلية', 'Needs operational review')}
          icon={XCircle}
        />
      </OperationsKpiGrid>

      {fetchError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs text-warning">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            className="orca-operations-secondary-button"
          >
            <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
            {L('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : null}

      <OperationsPanel className="overflow-hidden">
        <OperationsPanelHeader
          title={L('سجل المدفوعات', 'Payments ledger')}
          description={L(
            'معاملات مرتبطة بالفواتير والعقود وخطط الدفع والأقساط عند توفرها.',
            'Transactions linked to invoices, contracts, payment plans, and installments when available.',
          )}
        />

        <OperationsTableToolbar data-payments-toolbar>
          <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 lg:flex-1">
              <Search className="absolute right-3 top-3.5 text-[var(--nc-text-dim)]" size={13} />
              <OperationsTextField
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={L('بحث بالعميل أو الفاتورة أو العقد...', 'Search customer, invoice, or contract...')}
                className="w-full pl-3 pr-8"
              />
            </div>
            <SettingsSelect
              className="w-full lg:w-44"
              placement="bottom"
              value={statusFilter}
              aria-label={L('تصفية حالة الدفع', 'Filter payment status')}
              onChange={setStatusFilter}
              options={[
                { value: '', label: L('كل الحالات', 'All statuses') },
                ...statuses.map((status) => ({ value: status, label: paymentStatusLabel(status, locale) })),
              ]}
            />
            <SettingsSelect
              className="w-full lg:w-44"
              placement="bottom"
              value={providerFilter}
              aria-label={L('تصفية مزود الدفع', 'Filter payment provider')}
              onChange={setProviderFilter}
              options={[
                { value: '', label: L('كل المزودين', 'All providers') },
                ...providers.map((provider) => ({ value: provider, label: paymentProviderLabel(provider, locale) })),
              ]}
            />
          </div>
        </OperationsTableToolbar>

        <div className="orca-contracts-table-scroll">
          <table className="nc-table nc-table-striped orca-contracts-data-table">
            <thead>
              <tr>
                <th className="orca-date-column">{L('التاريخ', 'Date')}</th>
                <th className="orca-text-column">{L('العميل / الوحدة', 'Customer / Unit')}</th>
                <th className="orca-reference-column">{L('الفاتورة / القسط', 'Invoice / Installment')}</th>
                <th className="orca-number-column">{L('المبلغ', 'Amount')}</th>
                <th className="orca-text-column">{L('الطريقة / المزود', 'Method / Provider')}</th>
                <th className="orca-status-column">{L('الحالة', 'Status')}</th>
                <th className="orca-single-action-column">{L('الارتباط', 'Link')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="!py-8 text-center text-xs font-medium text-[var(--nc-text-dim)]">
                    {L('لا توجد مدفوعات مطابقة', 'No matching payments')}
                  </td>
                </tr>
              ) : (
                rows.map((payment) => {
                  const invoiceLabel = payment.invoice
                    ? `${payment.invoice.invoicePrefix}-${payment.invoice.invoiceNumber}`
                    : null;
                  const canOpenSaleContract = payment.invoice?.type === 'SALE' && Boolean(payment.contractId);
                  const canOpenLease = payment.invoice?.type === 'RENTAL' && Boolean(payment.invoice?.leaseId);
                  const canOpenContract = canOpenSaleContract || canOpenLease;
                  const actionLabel = canOpenSaleContract
                    ? L('فتح عقد البيع', 'Open sales contract')
                    : canOpenLease
                      ? L('فتح عقد الإيجار', 'Open rental lease')
                      : L('فتح العقد', 'Open contract');

                  return (
                    <tr key={payment.id} className="orca-data-row">
                      <td className="orca-date-column">{formatDateValue(payment.date, locale)}</td>
                      <td className="min-w-[170px]">
                        <div className="orca-table-primary max-w-[190px] truncate text-white">{displayPersonSafe(payment.customerName, locale)}</div>
                        <div className="orca-table-secondary max-w-[190px] truncate text-[var(--nc-text-dim)]">{displayEntitySafe(payment.unitName, 'unit', locale)}</div>
                      </td>
                      <td className="min-w-[150px]">
                        <div className="orca-table-primary font-bold text-white">{invoiceLabel || formatShortId(payment.invoiceId || payment.id)}</div>
                        <div className="orca-table-secondary text-[var(--nc-text-dim)]">
                          {payment.installment
                            ? L(`القسط ${formatNumberValue(payment.installment.installmentNumber, locale)}`, `Installment ${formatNumberValue(payment.installment.installmentNumber, locale)}`)
                            : L('دون قسط محدد', 'No installment')}
                        </div>
                      </td>
                      <td className="orca-number-column font-bold text-white">{formatMoneyValue(payment.amount, locale)}</td>
                      <td className="min-w-[140px]">
                        <div>{paymentMethodLabel(payment.method, locale)}</div>
                        <div className="orca-table-secondary text-[var(--nc-text-dim)]">{paymentProviderLabel(payment.provider, locale)}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`inline-flex min-w-[86px] justify-center rounded-full px-2.5 py-1 font-black orca-table-badge ${paymentStatusBadgeClass(payment.status)}`}>
                          {paymentStatusLabel(payment.status, locale)}
                        </span>
                      </td>
                      <td className="orca-single-action-column">
                        <OperationsRowActions label={L('ارتباط الدفعة', 'Payment link')}>
                          <OperationsRowAction
                            icon={ExternalLink}
                            available={canOpenContract}
                            unavailableReason={L('لا يوجد عقد مرتبط قابل للفتح', 'No linked contract is available')}
                            onClick={() => {
                              if (canOpenSaleContract && payment.contractId) {
                                onOpenSaleContract(payment.contractId);
                              } else if (canOpenLease && payment.invoice?.leaseId) {
                                onOpenLease(payment.invoice.leaseId);
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
          totalItems={filteredPayments.length}
          pageSize={PAGE_SIZE}
          locale={locale}
          onPageChange={setPage}
        />
      </OperationsPanel>
    </div>
  );
}
