'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import SettingsSelect from '@/components/settings/SettingsSelect';
import { DateCell } from '@/components/ui/orca-table/cells/DateCell';
import { MoneyCell } from '@/components/ui/orca-table/cells/MoneyCell';
import {
  displayEntitySafe,
  displayPersonSafe,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  safeDisplayValue,
  textFor,
  type ContractsPaymentsLocale,
} from '@/components/contracts-payments/workspace-display';

export interface InvoiceWorkspaceRecord {
  id: string;
  invoiceNumber: number;
  invoicePrefix: string;
  invoiceLabel: string;
  zatcaUuid: string;
  contractId?: string | null;
  leaseId?: string | null;
  type?: 'SALE' | 'RENTAL';
  due: string;
  dueDate?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'partial' | 'overdue' | 'void';
  qrCode?: string;
  qrImage?: string;
  customerName?: string;
  unitName?: string;
  installments?: Array<{
    id: string;
    installmentNumber?: number;
    amountSar: number;
    dueDate?: string;
    paymentStatus: string;
  }>;
}

interface InvoicesWorkspaceProps {
  locale: ContractsPaymentsLocale;
  invoices: InvoiceWorkspaceRecord[];
  onRecordPayment: (invoiceId: string) => void;
}

const PAGE_SIZE = 8;
const COLLECTIBLE = new Set(['Pending', 'Partial', 'Overdue']);

export default function InvoicesWorkspace({
  locale,
  invoices,
  onRecordPayment,
}: InvoicesWorkspaceProps) {
  const L = (ar: string, en: string) => textFor(locale, ar, en);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const searchable = [
        invoice.id,
        invoice.invoiceLabel,
        invoice.contractId,
        invoice.leaseId,
        invoice.customerName,
        invoice.unitName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = !statusFilter || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages - 1);
  const rows = filteredInvoices.slice(
    normalizedPage * PAGE_SIZE,
    normalizedPage * PAGE_SIZE + PAGE_SIZE,
  );
  const rangeStart = filteredInvoices.length === 0 ? 0 : normalizedPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((normalizedPage + 1) * PAGE_SIZE, filteredInvoices.length);

  useEffect(() => setPage(0), [search, statusFilter]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  const payNextInstallment = async (invoice: InvoiceWorkspaceRecord) => {
    try {
      const nextInstallment = [...(invoice.installments || [])]
        .filter((installment) => COLLECTIBLE.has(installment.paymentStatus))
        .sort((left, right) => {
          const dateOrder = String(left.dueDate || '').localeCompare(String(right.dueDate || ''));
          if (dateOrder !== 0) return dateOrder;
          return Number(left.installmentNumber || 0) - Number(right.installmentNumber || 0);
        })[0];

      if (!nextInstallment) {
        alert(L(
          'لا يوجد قسط مستحق قابل للدفع لهذه الفاتورة',
          'No collectible installment is due for this invoice',
        ));
        return;
      }

      const response = await fetch(`/api/v1/installments/${nextInstallment.id}/pay`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.redirectUrl) {
        alert(data.error || L('فشل إنشاء رابط الدفع', 'Failed to create payment link'));
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch {
      alert(L(
        'تعذر إنشاء رابط الدفع. تحقق من الاتصال أو إعدادات N-Genius.',
        'Could not create payment link. Check the connection or N-Genius settings.',
      ));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[var(--nc-surface-strong)] fade-in-up" data-invoices-workspace>
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 bg-[var(--nc-surface-solid)] p-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-white">{L('جدول الفواتير الصادرة', 'Issued invoices table')}</h3>
          <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">{L('تصفية ومتابعة الفواتير المحصلة والمعلقة', 'Filter and track paid and pending invoices')}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute right-3 top-2 text-[var(--nc-text-dim)]" size={13} />
            <input
              type="text"
              placeholder={L('بحث برقم الفاتورة أو العقد...', 'Search by invoice or contract...')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--nc-surface-strong)] py-1.5 pl-3 pr-8 text-xs text-white outline-none focus:border-[var(--nc-op-blue-border)] sm:w-56"
            />
          </div>
          <SettingsSelect
            className="w-full sm:w-40"
            placement="bottom"
            value={statusFilter}
            aria-label={L('تصفية حالة الفاتورة', 'Filter invoice status')}
            onChange={setStatusFilter}
            options={[
              { value: '', label: L('كل الحالات', 'All statuses') },
              { value: 'unpaid', label: L('غير مدفوعة', 'Unpaid') },
              { value: 'paid', label: L('مدفوعة', 'Paid') },
              { value: 'overdue', label: L('متأخرة', 'Overdue') },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="nc-table nc-table-striped">
          <thead>
            <tr>
              <th>{L('رقم الفاتورة', 'Invoice')}</th>
              <th>{L('العميل / الوحدة', 'Customer / Unit')}</th>
              <th>{L('تاريخ الاستحقاق', 'Due date')}</th>
              <th>{L('الإجمالي', 'Total')}</th>
              <th>{L('الحالة', 'Status')}</th>
              <th className="text-center">{L('الإجراء', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="!py-8 text-center text-xs font-medium text-[var(--nc-text-dim)]">
                  {L('لا توجد فواتير مطابقة', 'No matching invoices')}
                </td>
              </tr>
            ) : (
              rows.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="max-w-[170px] truncate !py-2 whitespace-nowrap text-xs font-bold text-white">
                    {safeDisplayValue(invoice.invoiceLabel, locale)}
                  </td>
                  <td className="min-w-[150px] !py-2 text-xs">
                    <div className="max-w-[160px] truncate text-white">{displayPersonSafe(invoice.customerName, locale)}</div>
                    <div className="max-w-[160px] truncate text-[10px] text-[var(--nc-text-dim)]">{displayEntitySafe(invoice.unitName, 'unit', locale)}</div>
                  </td>
                  <td className="!py-2 whitespace-nowrap font-mono text-xs text-[var(--nc-text-dim)]">
                    <DateCell value={invoice.due} />
                  </td>
                  <td className="!py-2 whitespace-nowrap text-xs font-bold text-white">
                    <MoneyCell amount={invoice.totalAmount} />
                  </td>
                  <td className="!py-2 whitespace-nowrap">
                    <span className={`inline-flex min-w-[82px] justify-center rounded-full px-2.5 py-1 text-[10px] font-black ${invoiceStatusBadgeClass(invoice.status)}`}>
                      {invoiceStatusLabel(invoice.status, locale)}
                    </span>
                  </td>
                  <td className="!py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {invoice.status !== 'paid' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onRecordPayment(invoice.id)}
                            className="inline-flex items-center gap-1 rounded border border-[var(--nc-op-blue)]/20 bg-[var(--nc-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-op-blue)] transition-all hover:border-[var(--nc-op-blue)]/40"
                          >
                            {L('تسجيل سداد', 'Record payment')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void payNextInstallment(invoice)}
                            className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-[var(--nc-surface)] px-2 py-0.5 text-[10px] font-bold text-emerald-400 transition-all hover:border-emerald-500/40"
                          >
                            {L('دفع القسط التالي', 'Pay next installment')}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => window.open(`/api/v1/invoices/${invoice.id}/pdf`, '_blank')}
                        className="inline-flex items-center gap-1 rounded border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-text-dim)] transition-all hover:border-[var(--nc-glass-border-hover)] hover:text-[var(--nc-text-primary)]"
                        title={L('تحميل PDF', 'Download PDF')}
                      >
                        <Download size={11} /> {L('تحميل', 'Download')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredInvoices.length > PAGE_SIZE && (
        <div className="flex flex-col gap-2 border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">{rangeStart}-{rangeEnd} {L('من', 'of')} {filteredInvoices.length}</span>
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
              {L('صفحة', 'Page')} {normalizedPage + 1} {L('من', 'of')} {totalPages}
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
  );
}
