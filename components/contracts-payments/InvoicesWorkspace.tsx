'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, ReceiptText, Search, WalletCards } from 'lucide-react';
import SettingsSelect from '@/components/settings/SettingsSelect';
import {
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsPagination,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsRowAction,
  OperationsRowActions,
  OperationsTableToolbar,
  OperationsTextField,
} from '@/components/operations';
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

const PAGE_SIZE = OPERATIONS_TABLE_PAGE_SIZE;
const COLLECTIBLE = new Set(['Pending', 'Partial', 'Overdue']);
const MANUALLY_COLLECTIBLE_STATUSES = new Set(['unpaid', 'partial', 'overdue']);

function nextCollectibleInstallment(invoice: InvoiceWorkspaceRecord) {
  return [...(invoice.installments || [])]
    .filter((installment) => COLLECTIBLE.has(installment.paymentStatus))
    .sort((left, right) => {
      const dateOrder = String(left.dueDate || '').localeCompare(String(right.dueDate || ''));
      if (dateOrder !== 0) return dateOrder;
      return Number(left.installmentNumber || 0) - Number(right.installmentNumber || 0);
    })[0] || null;
}

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

  const payNextInstallment = async (installmentId: string) => {
    try {
      const response = await fetch(`/api/v1/installments/${installmentId}/pay`, {
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
    <OperationsPanel className="overflow-hidden" data-invoices-workspace>
      <OperationsPanelHeader
        title={L('جدول الفواتير الصادرة', 'Issued invoices table')}
        description={L(
          'متابعة الفواتير وحالة التحصيل والإجراءات المتاحة لكل فاتورة.',
          'Track invoices, collection status, and the actions available for each invoice.',
        )}
      />

      <OperationsTableToolbar data-invoices-toolbar>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:flex-1">
            <Search className="absolute right-3 top-3.5 text-[var(--nc-text-dim)]" size={13} />
            <OperationsTextField
              type="text"
              placeholder={L('بحث برقم الفاتورة أو العقد...', 'Search by invoice or contract...')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-3 pr-8"
            />
          </div>
          <SettingsSelect
            className="w-full sm:w-44"
            placement="bottom"
            value={statusFilter}
            aria-label={L('تصفية حالة الفاتورة', 'Filter invoice status')}
            onChange={setStatusFilter}
            options={[
              { value: '', label: L('كل الحالات', 'All statuses') },
              { value: 'unpaid', label: L('غير مدفوعة', 'Unpaid') },
              { value: 'partial', label: L('مدفوعة جزئيًا', 'Partially paid') },
              { value: 'paid', label: L('مدفوعة', 'Paid') },
              { value: 'overdue', label: L('متأخرة', 'Overdue') },
              { value: 'void', label: L('ملغاة', 'Void') },
            ]}
          />
        </div>
      </OperationsTableToolbar>

      <div className="orca-contracts-table-scroll">
        <table className="nc-table nc-table-striped orca-contracts-data-table">
          <thead>
            <tr>
              <th className="orca-reference-column">{L('رقم الفاتورة', 'Invoice')}</th>
              <th className="orca-text-column">{L('العميل / الوحدة', 'Customer / Unit')}</th>
              <th className="orca-date-column">{L('تاريخ الاستحقاق', 'Due date')}</th>
              <th className="orca-number-column">{L('الإجمالي', 'Total')}</th>
              <th className="orca-status-column">{L('الحالة', 'Status')}</th>
              <th className="orca-actions-column">{L('الإجراءات', 'Actions')}</th>
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
              rows.map((invoice) => {
                const nextInstallment = nextCollectibleInstallment(invoice);
                const canRecordPayment = MANUALLY_COLLECTIBLE_STATUSES.has(invoice.status);
                const canPayNextInstallment = canRecordPayment && Boolean(nextInstallment);

                return (
                  <tr key={invoice.id} className="orca-data-row">
                    <td className="orca-reference-column orca-table-primary truncate font-bold text-white">
                      {safeDisplayValue(invoice.invoiceLabel, locale)}
                    </td>
                    <td className="orca-text-column">
                      <div className="orca-table-primary max-w-[190px] truncate text-white">
                        {displayPersonSafe(invoice.customerName, locale)}
                      </div>
                      <div className="orca-table-secondary max-w-[190px] truncate text-[var(--nc-text-dim)]">
                        {displayEntitySafe(invoice.unitName, 'unit', locale)}
                      </div>
                    </td>
                    <td className="orca-date-column font-mono text-[var(--nc-text-dim)]">
                      <DateCell value={invoice.due} />
                    </td>
                    <td className="orca-number-column font-bold text-white">
                      <MoneyCell amount={invoice.totalAmount} />
                    </td>
                    <td className="orca-status-column">
                      <span className={`inline-flex min-w-[92px] justify-center rounded-full px-2.5 py-1 font-black orca-table-badge ${invoiceStatusBadgeClass(invoice.status)}`}>
                        {invoiceStatusLabel(invoice.status, locale)}
                      </span>
                    </td>
                    <td className="orca-actions-column">
                      <OperationsRowActions label={L(`إجراءات ${invoice.invoiceLabel}`, `Actions for ${invoice.invoiceLabel}`)}>
                        <OperationsRowAction
                          icon={ReceiptText}
                          available={canRecordPayment}
                          unavailableReason={L('لا يمكن تسجيل سداد لهذه الحالة', 'Payment recording is unavailable for this status')}
                          onClick={() => onRecordPayment(invoice.id)}
                        >
                          {L('تسجيل سداد', 'Record payment')}
                        </OperationsRowAction>
                        <OperationsRowAction
                          icon={WalletCards}
                          available={canPayNextInstallment}
                          unavailableReason={nextInstallment
                            ? L('لا يمكن دفع القسط في حالة الفاتورة الحالية', 'Installment payment is unavailable for this invoice status')
                            : L('لا يوجد قسط مستحق قابل للدفع', 'No collectible installment is available')}
                          onClick={() => {
                            if (nextInstallment) void payNextInstallment(nextInstallment.id);
                          }}
                        >
                          {L('دفع القسط التالي', 'Pay next installment')}
                        </OperationsRowAction>
                        <OperationsRowAction
                          icon={Download}
                          onClick={() => window.open(`/api/v1/invoices/${invoice.id}/pdf`, '_blank')}
                        >
                          {L('تحميل PDF', 'Download PDF')}
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
        totalItems={filteredInvoices.length}
        pageSize={PAGE_SIZE}
        locale={locale}
        onPageChange={setPage}
      />
    </OperationsPanel>
  );
}
