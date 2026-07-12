'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import SettingsSelect from '@/components/settings/SettingsSelect';
import { Card } from '@/components/ui/orca-components';
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

const PAGE_SIZE = 10;

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
    <div className="space-y-4 fade-in-up" data-payments-workspace>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('إجمالي المحصل', 'Total collected')}</span>
          <strong className="mt-2 block text-lg text-white">{formatMoneyValue(completedTotal, locale)}</strong>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('دفعات مكتملة', 'Completed payments')}</span>
          <strong className="mt-2 block text-lg text-emerald-400">{formatNumberValue(completed.length, locale)}</strong>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('قيد المعالجة', 'In progress')}</span>
          <strong className="mt-2 block text-lg text-warning">{formatNumberValue(pendingCount, locale)}</strong>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('فشلت أو ألغيت', 'Failed or cancelled')}</span>
          <strong className="mt-2 block text-lg text-rose-400">{formatNumberValue(failedCount, locale)}</strong>
        </Card>
      </div>

      {fetchError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs text-warning">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-warning/30 px-3 py-1.5 font-bold hover:bg-warning/10 disabled:opacity-50"
          >
            <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
            {L('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[var(--nc-surface-strong)]">
        <div className="flex flex-col gap-4 border-b border-white/5 bg-[var(--nc-surface-solid)] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{L('سجل المدفوعات', 'Payments ledger')}</h3>
            <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">{L('معاملات حقيقية مرتبطة بالفواتير والعقود وخطط الدفع والأقساط عند توفرها.', 'Real transactions linked to invoices, contracts, payment plans, and installments when available.')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-[var(--nc-text-dim)]" size={13} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={L('بحث بالعميل أو الفاتورة أو العقد...', 'Search customer, invoice, or contract...')}
                className="w-full rounded-xl border border-white/10 bg-[var(--nc-surface-strong)] py-2 pl-3 pr-8 text-xs text-white outline-none focus:border-[var(--nc-op-blue-border)] sm:w-64"
              />
            </div>
            <SettingsSelect
              className="w-full sm:w-40"
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
              className="w-full sm:w-40"
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
        </div>

        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="nc-table nc-table-striped">
            <thead>
              <tr>
                <th>{L('التاريخ', 'Date')}</th>
                <th>{L('العميل / الوحدة', 'Customer / Unit')}</th>
                <th>{L('الفاتورة / القسط', 'Invoice / Installment')}</th>
                <th>{L('المبلغ', 'Amount')}</th>
                <th>{L('الطريقة / المزود', 'Method / Provider')}</th>
                <th>{L('الحالة', 'Status')}</th>
                <th>{L('الارتباط', 'Link')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="!py-10 text-center text-xs font-medium text-[var(--nc-text-dim)]">
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

                  return (
                    <tr key={payment.id}>
                      <td className="!py-2 whitespace-nowrap">{formatDateValue(payment.date, locale)}</td>
                      <td className="min-w-[160px] !py-2">
                        <div className="max-w-[180px] truncate text-white">{displayPersonSafe(payment.customerName, locale)}</div>
                        <div className="max-w-[180px] truncate text-[10px] text-[var(--nc-text-dim)]">{displayEntitySafe(payment.unitName, 'unit', locale)}</div>
                      </td>
                      <td className="min-w-[140px] !py-2">
                        <div className="font-bold text-white">{invoiceLabel || formatShortId(payment.invoiceId || payment.id)}</div>
                        <div className="text-[10px] text-[var(--nc-text-dim)]">
                          {payment.installment
                            ? L(`القسط ${formatNumberValue(payment.installment.installmentNumber, locale)}`, `Installment ${formatNumberValue(payment.installment.installmentNumber, locale)}`)
                            : L('دون قسط محدد', 'No installment')}
                        </div>
                      </td>
                      <td className="!py-2 whitespace-nowrap font-bold text-white">{formatMoneyValue(payment.amount, locale)}</td>
                      <td className="min-w-[130px] !py-2">
                        <div>{paymentMethodLabel(payment.method, locale)}</div>
                        <div className="text-[10px] text-[var(--nc-text-dim)]">{paymentProviderLabel(payment.provider, locale)}</div>
                      </td>
                      <td className="!py-2 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${paymentStatusBadgeClass(payment.status)}`}>
                          {paymentStatusLabel(payment.status, locale)}
                        </span>
                      </td>
                      <td className="!py-2 whitespace-nowrap">
                        {canOpenSaleContract && payment.contractId ? (
                          <button
                            type="button"
                            onClick={() => onOpenSaleContract(payment.contractId as string)}
                            className="rounded-lg border border-[var(--nc-op-blue)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--nc-op-blue)] hover:border-[var(--nc-op-blue)]/40"
                          >
                            {L('فتح عقد البيع', 'Open sales contract')}
                          </button>
                        ) : canOpenLease && payment.invoice?.leaseId ? (
                          <button
                            type="button"
                            onClick={() => onOpenLease(payment.invoice?.leaseId as string)}
                            className="rounded-lg border border-[var(--nc-op-blue)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--nc-op-blue)] hover:border-[var(--nc-op-blue)]/40"
                          >
                            {L('فتح عقد الإيجار', 'Open rental lease')}
                          </button>
                        ) : (
                          <span className="text-[10px] text-warning">{L('ارتباط غير مكتمل', 'Incomplete link')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredPayments.length > PAGE_SIZE && (
          <div className="flex flex-col gap-2 border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold">{formatNumberValue(rangeStart, locale)}-{formatNumberValue(rangeEnd, locale)} {L('من', 'of')} {formatNumberValue(filteredPayments.length, locale)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={normalizedPage === 0}
                className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {L('السابق', 'Previous')}
              </button>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[var(--nc-foreground)]">
                {L('صفحة', 'Page')} {formatNumberValue(normalizedPage + 1, locale)} {L('من', 'of')} {formatNumberValue(totalPages, locale)}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={normalizedPage >= totalPages - 1}
                className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {L('التالي', 'Next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
