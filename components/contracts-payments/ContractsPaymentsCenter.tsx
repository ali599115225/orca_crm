'use client';
import { toast } from '@/app/context/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { displayPerson, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

import React, { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Calculator, Megaphone, Plus, Search, Eye,
  Landmark, ChevronRight, AlertCircle, FileCheck,
  UserCheck, CloudUpload, Key, Trash2, Settings, Bot, Clock, HelpCircle, CheckCircle2, QrCode,
  Receipt, PenLine, SlidersHorizontal,
} from 'lucide-react';
import { DateField } from '@/components/ui/DateField';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/components/ui/orca-components';
import SalesContractsPanel from '@/components/sales/SalesContractsPanel';
import InvoicesWorkspace from '@/components/contracts-payments/InvoicesWorkspace';
import PaymentsWorkspace from '@/components/contracts-payments/PaymentsWorkspace';
import ReconciliationWorkspace from '@/components/contracts-payments/ReconciliationWorkspace';
import SettlementsWorkspace, { type SettlementWorkspaceRecord } from '@/components/contracts-payments/SettlementsWorkspace';
import ContractsPaymentsShell, { type ContractsPaymentsPane } from '@/components/contracts-payments/ContractsPaymentsShell';
import { CONTRACTS_PAYMENTS_ROUTES } from '@/components/contracts-payments/routes';
import FinancialLifecycleProgress, { type FinancialLifecycleStage } from '@/components/contracts-payments/FinancialLifecycleProgress';
import SettingsButton from '@/components/settings/SettingsButton';
import SettingsSelect from '@/components/settings/SettingsSelect';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { MoneyCell } from '@/components/ui/orca-table/cells/MoneyCell';
import { StatusCell } from '@/components/ui/orca-table/cells/StatusCell';
import { formatLeaseStatus, formatInvoiceStatus } from '@/lib/ui-status';
import { formatCurrency, formatShortId } from '@/lib/ui-formatters';
import { formatDisplayDateTime } from '@/lib/display/dateTime';
import {
  OperationsBackAction,
  OperationsDialog,
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsMasterList,
  OperationsMasterRow,
  OPERATIONS_TABLE_PAGE_SIZE,
  OperationsNumberField,
  OperationsPagination,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTabs,
  OperationsTextField,
  OperationsTabPanel,
} from '@/components/operations';
import { operationsVisual } from '@/features/operations/visual';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Lease {
  id: string;
  unit: string;
  tenant: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  rent: number;
  currency: string;
  status: 'active' | 'expired' | 'terminated';
  deposit: number;
  financialRef?: string | null;
}

interface Invoice {
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

interface Payment {
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
  ref?: string;
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

type Settlement = SettlementWorkspaceRecord;

interface EventLog {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  note?: string;
}

// ─── Initial Data ───────────────────────────────────────────────────────────
const initialLeases: Lease[] = [];

const initialInvoices: Invoice[] = []; // Loaded from API

const initialPayments: Payment[] = [];
const initialSettlements: Settlement[] = [];
const initialEvents: EventLog[] = [];
const CONTRACTS_PAGE_SIZE = OPERATIONS_TABLE_PAGE_SIZE;
const DETAIL_TAB_PAGE_SIZE = 4;

function createPaymentIdempotencyKey(): string {
  return `idemp-${globalThis.crypto.randomUUID()}`;
}


type RentalLocale = DisplayLocale;
type ActivePane = ContractsPaymentsPane;

const ACTIVE_PANES = new Set<ActivePane>([
  'leases',
  'sales',
  'invoices',
  'payments',
  'reconciliation',
  'settlements',
]);

function isActivePane(value: string | null): value is ActivePane {
  return Boolean(value && ACTIVE_PANES.has(value as ActivePane));
}

function textFor(locale: RentalLocale, ar: string, en: string): string {
  return locale === 'ar' ? ar : en;
}

function emptyValue(locale: RentalLocale): string {
  return textFor(locale, 'غير محدد', 'Not specified');
}

function noDataValue(locale: RentalLocale): string {
  return textFor(locale, 'لا توجد بيانات', 'No data available');
}

function isArabicText(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function isDemoOrMockValue(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return text.includes('demo') ||
    text.includes('stress') ||
    text.includes('mock') ||
    text.includes('test data') ||
    text.includes('unnamed') ||
    text.includes('unknown') ||
    text.includes('no data available') ||
    text.includes('تجريبي') ||
    text.includes('محاكاة') ||
    text.includes('اختباري') ||
    text.includes('غير معروف') ||
    text.includes('لا توجد بيانات');
}

function isUnsafeDisplayValue(value: unknown, locale: RentalLocale): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (isTechnicalReference(text) || isDemoOrMockValue(text)) return true;
  if (locale === 'en' && isArabicText(text)) return true;
  if (locale === 'ar' && !isArabicText(text) && /^[a-zA-Z][a-zA-Z\s]*$/.test(text) && text.length >= 4) return true;
  return false;
}

function cleanDisplayCandidate(value: unknown, original: unknown, locale: RentalLocale): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  if (isUnsafeDisplayValue(text, locale)) return null;
  const raw = String(original || '').trim().toLowerCase();
  if (raw && text.toLowerCase() === raw && /^[a-z0-9_\-.]+$/i.test(text) && text.includes('_')) return null;
  return text;
}

function safeDisplayValue(value: unknown, locale: RentalLocale): string {
  const text = String(value || '').trim();
  if (isUnsafeDisplayValue(text, locale)) return emptyValue(locale);
  return text;
}

function displayPersonSafe(value: unknown, locale: RentalLocale): string {
  return cleanDisplayCandidate(displayPerson(String(value || ''), locale), value, locale) || safeDisplayValue(value, locale);
}

function displayEntitySafe(value: unknown, kind: string, locale: RentalLocale): string {
  return cleanDisplayCandidate(displayEntity(String(value || ''), kind as any, locale), value, locale) || safeDisplayValue(value, locale);
}

function leaseStatusLabel(status: Lease['status'] | string, locale: RentalLocale): string {
  return displayEnum(String(status || ''), 'rentalStatus', locale);
}

function leaseStatusBadgeClass(status: Lease['status'] | string): string {
  switch (String(status).toLowerCase()) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'expired': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default: return 'bg-warning/20 text-warning border border-warning/30';
  }
}

function invoiceStatusLabel(status: Invoice['status'] | string, locale: RentalLocale): string {
  return displayEnum(String(status || ''), 'invoiceStatus', locale);
}

function invoiceStatusBadgeClass(status: Invoice['status'] | string): string {
  switch (String(status).toLowerCase()) {
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'overdue': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default: return 'bg-warning/20 text-warning border border-warning/30';
  }
}

function settlementStatusLabel(status: Settlement['status'] | string, locale: RentalLocale): string {
  return displayEnum(String(status || ''), 'settlementStatus', locale);
}

function paymentMethodLabel(method: string, locale: RentalLocale): string {
  const normalized = String(method || '').trim().toLowerCase();
  if (normalized === 'bank_transfer' || normalized === 'transfer') {
    return displayEnum('bank', 'paymentMethod', locale);
  }
  return displayEnum(normalized, 'paymentMethod', locale);
}

function paymentStatusLabel(status: string | undefined, locale: RentalLocale): string {
  switch (String(status || '').trim().toUpperCase()) {
    case 'COMPLETED': return textFor(locale, 'مكتملة', 'Completed');
    case 'PAID': return textFor(locale, 'مدفوعة', 'Paid');
    case 'PENDING': return textFor(locale, 'معلقة', 'Pending');
    case 'PROCESSING': return textFor(locale, 'قيد المعالجة', 'Processing');
    case 'INITIATING': return textFor(locale, 'قيد الإنشاء', 'Initiating');
    case 'FAILED': return textFor(locale, 'فشلت', 'Failed');
    case 'CANCELLED': return textFor(locale, 'ملغاة', 'Cancelled');
    default: return safeDisplayValue(status, locale);
  }
}

function paymentProviderLabel(provider: string | undefined, locale: RentalLocale): string {
  switch (String(provider || '').trim().toUpperCase()) {
    case 'MANUAL': return textFor(locale, 'يدوي', 'Manual');
    case 'NGENIUS': return 'N-Genius';
    case 'PAYLINK': return 'Paylink';
    default: return safeDisplayValue(provider, locale);
  }
}

function paymentStatusBadgeClass(status: string | undefined): string {
  switch (String(status || '').trim().toUpperCase()) {
    case 'COMPLETED':
    case 'PAID':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    case 'PROCESSING':
    case 'INITIATING':
      return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
    default:
      return 'bg-warning/20 text-warning border border-warning/30';
  }
}

function vatTypeLabel(type: string, locale: RentalLocale): string {
  return displayEnum(String(type || ''), 'vatType', locale);
}

function formatNumberValue(value: number, locale: RentalLocale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value || 0);
}

function formatMoneyValue(value: number, locale: RentalLocale): string {
  return locale === 'ar'
    ? `${formatNumberValue(value, locale)} ر.س`
    : `SAR ${formatNumberValue(value, locale)}`;
}

function formatDateValue(value: string, locale: RentalLocale): string {
  if (!value) return emptyValue(locale);
  const raw = String(value).trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }
  return safeDisplayValue(value, locale);
}

function isTechnicalReference(value?: string | null): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^[0-9a-f]{12,}$/i.test(text);
}

function getLeaseDisplayNumber(lease?: Pick<Lease, 'id'> | null, locale: RentalLocale = 'ar'): string {
  if (!lease?.id) return textFor(locale, 'عقد إيجار', 'Lease');
  return formatShortId(lease.id, locale === 'ar' ? 'عقد' : 'LEASE');
}

interface ContractsPaymentsCenterProps {
  defaultPane?: ContractsPaymentsPane;
  detailLeaseId?: string;
}

export default function ContractsPaymentsCenter({
  defaultPane = 'leases',
  detailLeaseId,
}: ContractsPaymentsCenterProps) {
  const { lang } = useApp();
  const isRTL = lang === 'AR';
  const displayLocale: RentalLocale = isRTL ? 'ar' : 'en';
  const L = (ar: string, en: string) => textFor(displayLocale, ar, en);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPane = searchParams.get('pane');
  const initialPane: ActivePane = detailLeaseId
    ? 'leases'
    : isActivePane(requestedPane)
      ? requestedPane
      : defaultPane;
  const [activePane, setActivePane] = useState<ActivePane>(initialPane);

  // Core entities state
  const [leases, setLeases] = useState<Lease[]>(initialLeases);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements);
  const [events, setEvents] = useState<EventLog[]>(initialEvents);

  // Filters & selection
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(detailLeaseId ?? null);
  const [leaseSearch, setLeaseSearch] = useState('');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('');
  const [leasePage, setLeasePage] = useState(0);
  
  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [prefilledContractId, setPrefilledContractId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);

  // New Lease form state
  const [newUnit, setNewUnit] = useState('');
  const [newTenant, setNewTenant] = useState('');
  const [newStart, setNewStart] = useState(''); // YYYY-MM-DD
  const [newEnd, setNewEnd] = useState('');     // YYYY-MM-DD
  const [newRent, setNewRent] = useState(1000);
  const [newDeposit, setNewDeposit] = useState(0);

  // Create Invoice form state
  const [invSubtotal, setInvSubtotal] = useState(0);
  const [invVatType, setInvVatType] = useState('STANDARD');
  const [invDueDate, setInvDueDate] = useState('');
  const [invLeaseId, setInvLeaseId] = useState('');

  // Payment form state
  const [payMethod, setPayMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(''); // YYYY-MM-DD
  const [payIdempotencyKey, setPayIdempotencyKey] = useState('');
  const [isPaying, setIsPaying] = useState(false);


  const { hasPermission } = useAuth();
  // Permission check — delegated to AuthContext
  const isAllowed = (action: string) => hasPermission(action);

  const [enableCompliance, setEnableCompliance] = useState(false);

  const changePane = (pane: ActivePane) => {
    startTransition(() => setActivePane(pane));
    router.push(CONTRACTS_PAYMENTS_ROUTES[pane], { scroll: false });
  };

  // Details sub-tabs controller
  const [detailActiveTab, setDetailActiveTab] = useState('summary');
  const [detailTabPages, setDetailTabPages] = useState<Record<string, number>>({});

  // Telemetry logger console
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([
    {
      id: 'evt_init',
      type: 'system.leases_initialized',
      timestamp: new Date().toISOString(),
      actorId: 'system_core',
      payload: { message: 'تهيئة نظام إدارة العقود والمدفوعات والمحاسبة بنجاح' }
    }
  ]);

  // API loading states
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentFetchError, setPaymentFetchError] = useState<string | null>(null);
  const [settlementFetchError, setSettlementFetchError] = useState<string | null>(null);

  const refreshPayments = async (): Promise<void> => {
    const paymentsRes = await fetch('/api/v1/payments/');
    if (!paymentsRes.ok) throw new Error('PAYMENTS_DATA_LOAD_FAILED');

    const paymentsJson = await paymentsRes.json();
    if (!paymentsJson.success) throw new Error('PAYMENTS_DATA_LOAD_FAILED');

    setPayments(Array.isArray(paymentsJson.payments) ? paymentsJson.payments : []);
    setPaymentFetchError(null);
  };

  const refreshSettlements = async (): Promise<void> => {
    const response = await fetch('/api/v1/settlements/');
    if (!response.ok) throw new Error('SETTLEMENTS_DATA_LOAD_FAILED');

    const payload = await response.json();
    if (!payload.success) throw new Error('SETTLEMENTS_DATA_LOAD_FAILED');

    setSettlements(Array.isArray(payload.settlements) ? payload.settlements : []);
    setSettlementFetchError(null);
  };

  // Fetch real leases, invoices, and payment transactions on mount.
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const [leasesRes, invoicesRes] = await Promise.all([
          fetch('/api/v1/leases/'),
          fetch('/api/v1/invoices/'),
        ]);
        if (!leasesRes.ok || !invoicesRes.ok) {
          throw new Error('RENTAL_DATA_LOAD_FAILED');
        }

        const [leasesJson, invoicesJson] = await Promise.all([
          leasesRes.json(),
          invoicesRes.json(),
        ]);

        if (!leasesJson.success || !invoicesJson.success) {
          throw new Error('RENTAL_DATA_LOAD_FAILED');
        }

        setLeases(Array.isArray(leasesJson.leases) ? leasesJson.leases : []);
        setInvoices(Array.isArray(invoicesJson.invoices) ? invoicesJson.invoices : []);

        const [paymentResult, settlementResult] = await Promise.allSettled([
          refreshPayments(),
          refreshSettlements(),
        ]);

        if (paymentResult.status === 'rejected') {
          setPayments([]);
          setPaymentFetchError(L('تعذر تحميل سجل المدفوعات.', 'Unable to load the payments ledger.'));
          addTelemetryEvent('api.error', { error: 'PAYMENTS_DATA_LOAD_FAILED' });
        }

        if (settlementResult.status === 'rejected') {
          setSettlements([]);
          setSettlementFetchError(L('تعذر تحميل سجل التسويات.', 'Unable to load the settlements ledger.'));
          addTelemetryEvent('api.error', { error: 'SETTLEMENTS_DATA_LOAD_FAILED' });
        }

        addTelemetryEvent('api.data_loaded', {
          leases: true,
          invoices: true,
          payments: paymentResult.status === 'fulfilled',
          settlements: settlementResult.status === 'fulfilled',
        });
      } catch (err: unknown) {
        setLeases([]);
        setInvoices([]);
        setPayments([]);
        setFetchError(L('تعذر تحميل بيانات العقود والفواتير.', 'Unable to load contracts and invoices.'));
        addTelemetryEvent('api.error', { error: 'RENTAL_DATA_LOAD_FAILED' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    setMounted(true);
    // Generate an idempotency key initially
    setPayIdempotencyKey(createPaymentIdempotencyKey());
  }, []);

  useEffect(() => {
    const pane = searchParams.get('pane');
    const nextPane: ActivePane = isActivePane(pane) ? pane : defaultPane;
    setActivePane((current) => (current === nextPane ? current : nextPane));
  }, [defaultPane, searchParams]);

  // early return moved to the bottom of the component to prevent uninitialized ReferenceErrors

  const addTelemetryEvent = (type: string, payload: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      actorId: 'usr_active',
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
  };

  // isAllowed defined above via useAuth

  // Utility helpers
  const formatDateToDDMMYYYY = (iso: string): string => formatDateValue(iso, displayLocale);

  // KPIs
  const totalReceivables = invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.totalAmount, 0);
  const pendingSettlementsCount = settlements.filter(s => s.status === 'pending').length;

  const activeLeases = leases.filter(l => l.status === 'active');
  const selectedLease = leases.find(l => l.id === selectedLeaseId);

  // Alerts List
  const overdueInvoicesCount = invoices.filter(i => i.status === 'overdue').length;
  const expiredLeasesCount = leases.filter(l => l.status === 'expired').length;

  // Event handlers
  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('CREATE_LEASE')) {
      alert(L('عذراً، لا تملك صلاحية إنشاء عقد جديد.', 'Sorry, you do not have permission to create a new lease.'));
      return;
    }

    if (!newStart || !newEnd || !newUnit || !newTenant) {
      alert(L('يرجى تعبئة جميع الحقول الإجبارية.', 'Please fill in all required fields.'));
      return;
    }

    if (enableCompliance) {
      addTelemetryEvent('compliance.check', { tenantName: newTenant, result: 'cleared' });
    }

    try {
      const res = await fetch('/api/v1/leases/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: newUnit, tenant: newTenant, start: newStart, end: newEnd, rent: newRent, deposit: newDeposit }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setLeases(prev => [...prev, json.lease]);
    } catch (err: any) {
      alert(L('خطأ في إنشاء العقد: ', 'Error creating lease: ') + err.message);
    }

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: 'new',
      type: 'lease.created',
      timestamp: new Date().toISOString(),
      note: `تم إنشاء العقد بنجاح للوحدة ${newUnit}`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('lease.created', {
      unit: newUnit,
      tenant: newTenant,
      start: newStart,
      end: newEnd,
      rent: newRent,
      deposit: newDeposit,
      actorId: 'usr_active',
      timestamp: new Date().toISOString(),
      status: 'active'
    });

    // Reset Form
    setNewUnit('');
    setNewTenant('');
    setNewStart('');
    setNewEnd('');
    setNewRent(1000);
    setNewDeposit(0);
    setActiveModal(null);
    alert(L('تم تسجيل العقد الجديد بنجاح!', 'New lease registered successfully!'));
  };

  const handleLeaseDocumentUpload = () => {
    toast.info(L('نظام رفع مستندات العقود قيد التطوير. سيُتاح في التحديث القادم.', 'Lease document upload is under development. Available in the next update.'));
    setSelectedDocumentFile(null);
  };

  const handleDownloadLeaseAgreement = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    const contractLabel = getLeaseDisplayNumber(lease, displayLocale);
    const fileLabel = contractLabel.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');
    const content = `عقد إيجار موحد\n--------------------------------------\nرقم العقد: ${contractLabel}\nالوحدة: ${lease?.unit || 'غير محددة'}\nالمستأجر: ${lease?.tenant || 'غير محدد'}\nتاريخ البداية: ${lease?.start || '-'}\nتاريخ الانتهاء: ${lease?.end || '-'}\nالمبلغ السنوي: ${lease?.rent?.toLocaleString() || '-'} ر.س\n\nهذه نسخة تجريبية من مسودة العقد الموحد.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `عقد_إيجار_موحد_${fileLabel}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addTelemetryEvent('document.downloaded', { contractId: leaseId });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('CREATE_INVOICE')) {
      alert(L('عذراً، لا تملك صلاحية إصدار فواتير.', 'Sorry, you do not have permission to issue invoices.'));
      return;
    }

    const leaseId = invLeaseId || prefilledContractId;
    if (!leaseId || !invDueDate || invSubtotal <= 0) {
      alert(L('يرجى التحقق من المدخلات.', 'Please verify the inputs.'));
      return;
    }

    let newInvoiceId = 'unknown';
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId, subtotal: invSubtotal, vatType: invVatType, dueDate: invDueDate }),
      });
      const json = await res.json();
      if (json.success) {
        const inv = json.invoice;
        newInvoiceId = inv.id;
        setInvoices(prev => [{
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoicePrefix: inv.invoicePrefix,
          invoiceLabel: inv.invoiceLabel,
          zatcaUuid: inv.zatcaUuid,
          contractId: inv.leaseId,
          due: inv.dueDate,
          subtotal: inv.subtotal,
          vatRate: inv.vatRate,
          vatAmount: inv.vatAmount,
          totalAmount: inv.totalAmount,
          status: inv.status,
          qrCode: inv.qrCode,
          qrImage: inv.qrImage,
          customerName: inv.customerName,
          unitName: inv.unitName,
        }, ...prev]);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      alert(L('خطأ في إصدار الفاتورة: ', 'Error issuing invoice: ') + err.message);
      return;
    }

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: leaseId,
      type: 'invoice.issued',
      timestamp: new Date().toISOString(),
      note: `تم إصدار الفاتورة ${newInvoiceId} بقيمة ${invSubtotal} ر.س`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('invoice.issued', {
      contractId: leaseId,
      invoiceId: newInvoiceId,
      actorId: 'usr_active',
      timestamp: new Date().toISOString(),
      status: 'unpaid',
      payload: { subtotal: invSubtotal, vatType: invVatType, due: invDueDate, currency: 'SAR' }
    });

    setInvSubtotal(0);
    setInvVatType('STANDARD');
    setInvDueDate('');
    setInvLeaseId('');
    setPrefilledContractId('');
    setActiveModal(null);
    alert(L('تم إصدار الفاتورة بنجاح!', 'Invoice issued successfully!'));
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!isAllowed('PAY_INVOICE')) {
      toast.error(L('عذراً، لا تملك صلاحية تسجيل الدفعات.', 'Sorry, you do not have permission to record payments.'));
      return;
    }

    if (!payDate || !payIdempotencyKey) {
      toast.error(L('يرجى تحديد تاريخ السداد وإدخال مفتاح تفادي التكرار (Idempotency Key).', 'Please specify the payment date and enter the idempotency key.'));
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetch(`/api/v1/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': payIdempotencyKey,
        },
        body: JSON.stringify({
          amount: selectedInvoice.totalAmount,
          method: payMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تسجيل الدفعة');
      }

      addTelemetryEvent('payment.received', {
        contractId: selectedInvoice.contractId,
        invoiceId: selectedInvoice.id,
        paymentId: data.payment?.id,
        actorId: 'usr_active',
        timestamp: new Date().toISOString(),
        status: 'paid',
        idempotencyKey: payIdempotencyKey,
        payload: { amount: selectedInvoice.totalAmount, method: payMethod, ref: payRef }
      });

      // Refresh invoice and payment read models after a successful write.
      const [invoiceRefresh, paymentRefresh] = await Promise.allSettled([
        fetch('/api/v1/invoices/'),
        refreshPayments(),
      ]);
      if (invoiceRefresh.status === 'fulfilled' && invoiceRefresh.value.ok) {
        const json = await invoiceRefresh.value.json();
        if (json.success) setInvoices(json.invoices);
      }
      if (paymentRefresh.status === 'rejected') {
        setPaymentFetchError(L('تم تسجيل الدفعة، لكن تعذر تحديث السجل.', 'Payment recorded, but the ledger could not be refreshed.'));
      }

      toast.success(data.message || L('تم تسجيل الدفعة بنجاح', 'Payment recorded successfully'));

      // Reset
      setPayRef('');
      setPayDate('');
      setPayIdempotencyKey(createPaymentIdempotencyKey());
      setSelectedInvoice(null);
      setActiveModal(null);
    } catch (err: any) {
      toast.error(err.message || L('حدث خطأ أثناء تسجيل الدفعة', 'An error occurred while recording the payment'));
    } finally {
      setIsPaying(false);
    }
  };


  // Filter lists
  const filteredLeases = leases.filter(l => {
    const matchSearch = !leaseSearch || `${l.id} ${l.unit} ${l.tenant}`.toLowerCase().includes(leaseSearch.toLowerCase());
    const matchStatus = !leaseStatusFilter || l.status === leaseStatusFilter;
    return matchSearch && matchStatus;
  });

  const leaseTotalPages = Math.max(1, Math.ceil(filteredLeases.length / CONTRACTS_PAGE_SIZE));
  const normalizedLeasePage = Math.min(leasePage, leaseTotalPages - 1);
  const pagedLeases = filteredLeases.slice(
    normalizedLeasePage * CONTRACTS_PAGE_SIZE,
    normalizedLeasePage * CONTRACTS_PAGE_SIZE + CONTRACTS_PAGE_SIZE,
  );
  const leaseRangeStart = filteredLeases.length === 0 ? 0 : normalizedLeasePage * CONTRACTS_PAGE_SIZE + 1;
  const leaseRangeEnd = Math.min((normalizedLeasePage + 1) * CONTRACTS_PAGE_SIZE, filteredLeases.length);

  const completedPayments = payments.filter((payment) =>
    ['COMPLETED', 'PAID'].includes(String(payment.status || '').toUpperCase()),
  );
  const completedPaymentTotal = completedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );

  const selectedLeaseInvoices = selectedLease ? invoices.filter(i => i.leaseId === selectedLease.id) : [];
  const selectedLeaseInvoiceIds = new Set(selectedLeaseInvoices.map(i => i.id));
  const selectedLeasePayments = selectedLease
    ? payments.filter((payment) => payment.invoiceId && selectedLeaseInvoiceIds.has(payment.invoiceId))
    : [];
  const selectedLeaseCompletedPayments = selectedLeasePayments.filter((payment) =>
    ['COMPLETED', 'PAID'].includes(String(payment.status || '').toUpperCase()),
  );
  const selectedLeaseHasInvoices = selectedLeaseInvoices.length > 0;
  const selectedLeaseInvoicesPaid =
    selectedLeaseHasInvoices &&
    selectedLeaseInvoices.every((invoice) => String(invoice.status).toLowerCase() === 'paid');
  const selectedLeaseLifecycleStages: FinancialLifecycleStage[] = selectedLease
    ? [
        {
          id: 'contract',
          label: L('العقد', 'Contract'),
          state: selectedLease.status === 'terminated' ? 'blocked' : 'complete',
          hint: leaseStatusLabel(selectedLease.status, displayLocale),
        },
        {
          id: 'invoices',
          label: L('الفواتير', 'Invoices'),
          state: selectedLeaseHasInvoices
            ? selectedLeaseInvoicesPaid
              ? 'complete'
              : 'current'
            : 'current',
          hint: L(
            `${formatNumberValue(selectedLeaseInvoices.length, displayLocale)} فاتورة`,
            `${formatNumberValue(selectedLeaseInvoices.length, displayLocale)} invoices`,
          ),
        },
        {
          id: 'payments',
          label: L('المدفوعات', 'Payments'),
          state: selectedLeaseCompletedPayments.length > 0
            ? selectedLeaseInvoicesPaid
              ? 'complete'
              : 'current'
            : selectedLeaseHasInvoices
              ? 'current'
              : 'pending',
          hint: L(
            `${formatNumberValue(selectedLeaseCompletedPayments.length, displayLocale)} مكتملة`,
            `${formatNumberValue(selectedLeaseCompletedPayments.length, displayLocale)} completed`,
          ),
        },
        {
          id: 'settlement',
          label: L('التسوية', 'Settlement'),
          state: selectedLease.financialRef
            ? 'complete'
            : selectedLease.status === 'expired' && selectedLeaseInvoicesPaid
              ? 'current'
              : 'pending',
          hint: selectedLease.financialRef
            ? safeDisplayValue(selectedLease.financialRef, displayLocale)
            : L('لا توجد تسوية', 'No settlement'),
        },
        {
          id: 'close',
          label: L('الإغلاق', 'Close'),
          state:
            selectedLease.status === 'expired' && Boolean(selectedLease.financialRef)
              ? 'complete'
              : 'pending',
          hint: L('إغلاق العقد بعد التسوية', 'Close after settlement'),
        },
      ]
    : [];
  const selectedLeaseLifecycleNextAction = !selectedLease
    ? ''
    : selectedLease.status === 'terminated'
      ? L('مراجعة سبب إنهاء العقد', 'Review contract termination')
      : !selectedLeaseHasInvoices
        ? L('إصدار فاتورة العقد', 'Issue lease invoice')
        : !selectedLeaseInvoicesPaid
          ? L('تحصيل الفواتير المفتوحة', 'Collect open invoices')
          : selectedLease.status === 'active'
            ? L('متابعة الفوترة الدورية', 'Continue recurring billing')
            : !selectedLease.financialRef
              ? L('بدء تسوية العقد', 'Start lease settlement')
              : L('إغلاق العقد ماليًا', 'Financially close lease');
  const selectedLeaseDocuments = selectedLease ? [
    {
      id: 'lease-agreement',
      name: `${L('عقد_إيجار_موحد', 'lease_agreement')}_${getLeaseDisplayNumber(selectedLease, displayLocale).replace(/\s+/g, '_')}.txt`,
      size: '1.2 MB',
    }
  ] : [];
  const selectedLeaseSettlements = selectedLease ? settlements.filter(s => s.contractId === selectedLease.id) : [];
  const selectedLeaseEvents = selectedLease
    ? events
      .filter(e => e.contractId === selectedLease.id)
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  function paginateDetailItems<T>(tabId: string, items: T[]) {
    const totalPages = Math.max(1, Math.ceil(items.length / DETAIL_TAB_PAGE_SIZE));
    const page = Math.min(detailTabPages[tabId] ?? 0, totalPages - 1);
    const start = page * DETAIL_TAB_PAGE_SIZE;
    return {
      page,
      totalPages,
      items: items.slice(start, start + DETAIL_TAB_PAGE_SIZE),
    };
  }

  const detailInvoicePage = paginateDetailItems('invoices', selectedLeaseInvoices);
  const detailPaymentPage = paginateDetailItems('payments', selectedLeasePayments);
  const detailDocumentPage = paginateDetailItems('docs', selectedLeaseDocuments);
  const detailSettlementPage = paginateDetailItems('settlements', selectedLeaseSettlements);
  const detailEventPage = paginateDetailItems('events', selectedLeaseEvents);

  const setDetailPage = (tabId: string, page: number) => {
    setDetailTabPages(prev => ({ ...prev, [tabId]: Math.max(0, page) }));
  };

  const renderDetailPager = (tabId: string, totalItems: number, page: number, totalPages: number) => {
    if (totalItems <= DETAIL_TAB_PAGE_SIZE) return null;

    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-[var(--nc-text-dim)]">
        <span className="font-bold">{L(`صفحة ${formatNumberValue(page + 1, displayLocale)} من ${formatNumberValue(totalPages, displayLocale)}`, `Page ${formatNumberValue(page + 1, displayLocale)} of ${formatNumberValue(totalPages, displayLocale)}`)}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDetailPage(tabId, page - 1)}
            disabled={page === 0}
            className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {L('السابق', 'Previous')}
          </button>
          <button
            type="button"
            onClick={() => setDetailPage(tabId, page + 1)}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {L('التالي', 'Next')}
          </button>
        </div>
      </div>
    );
  };

  const formatEventTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return safeDisplayValue(timestamp, displayLocale);
    return formatDisplayDateTime(date);
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'lease.created': return L('إنشاء عقد', 'Lease created');
      case 'invoice.issued': return L('إصدار فاتورة', 'Invoice issued');
      case 'payment.received': return L('تسجيل دفعة', 'Payment recorded');
      case 'settlement.requested': return L('طلب تسوية', 'Settlement requested');
      case 'settlement.completed': return L('اكتمال تسوية', 'Settlement completed');
      default: return L('تحديث تشغيلي', 'Operational update');
    }
  };

  const cleanEventNote = (note?: string) => {
    const text = String(note || '').trim();
    if (!text || isUnsafeDisplayValue(text, displayLocale)) return L('تم تحديث سجل العقد.', 'Lease record updated.');
    if (displayLocale === 'en' && isArabicText(text)) return 'Lease record updated.';
    return text
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, L('مرجع', 'Reference'))
      .replace(/[0-9a-f]{12,}/gi, L('مرجع', 'Reference'))
      .replace(/\{.*\}/g, '')
      .trim() || L('تم تحديث سجل العقد.', 'Lease record updated.');
  };

  useEffect(() => {
    setLeasePage(0);
  }, [leaseSearch, leaseStatusFilter]);

  useEffect(() => {
    setDetailTabPages({});
  }, [selectedLeaseId]);

  useEffect(() => {
    if (leasePage > leaseTotalPages - 1) {
      setLeasePage(leaseTotalPages - 1);
    }
  }, [leasePage, leaseTotalPages]);


  // Main operational panes rendered inside the shared contracts-and-payments shell.
  const detailsContent = (
    <div className="orca-contracts-container space-y-4">

      {isPending || isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[var(--nc-foreground-muted)] font-bold">{L('جاري تحميل بيانات القسم...', 'Loading section data...')}</span>
        </div>
      ) : (
        <div className="orca-view-enter">
          
          {/* ── Pane 1: Leases (Master-Detail) ── */}
          {activePane === 'leases' && (
            <OperationsExecutiveGrid variant="singlePane" data-lease-detail-grid>
              
              {/* Rental leases list — full-width list workspace, matching Sales contracts. */}
              {!detailLeaseId ? (
              <OperationsPanel className="h-fit overflow-hidden" data-rental-leases-list>
                <OperationsPanelHeader
                  dir={isRTL ? 'rtl' : 'ltr'}
                  title={L('قائمة عقود الإيجار', 'Leases list')}
                  description={L('اختر عقدًا لعرض دورة الفوترة والتحصيل والمستندات والتسويات.', 'Select a lease to review invoicing, collection, documents, and settlements.')}
                  icon={Landmark}
                  actions={
                    <button
                      type="button"
                      className={operationsVisual.primaryButton}
                      onClick={() => {
                        if (!isAllowed('CREATE_LEASE')) {
                          alert(L('عذراً، لا تملك الصلاحية لإضافة عقد جديد.', 'Sorry, you do not have permission to add a new lease.'));
                          return;
                        }
                        setActiveModal('new_lease');
                      }}
                    >
                      <Plus size={13} />
                      {L('عقد جديد', 'New lease')}
                    </button>
                  }
                />

                <div className={selectedLease ? "grid gap-2 border-b border-white/5 px-3 py-2" : "flex gap-2 border-b border-white/5 px-3 py-2"}>
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute right-3 top-2.5 text-[var(--nc-text-dim)]" size={13} />
                    <OperationsTextField
                      placeholder={L("بحث باسم المستأجر، العقد أو الوحدة...", "Search tenant, lease, or unit...")}
                      value={leaseSearch}
                      onChange={(e) => setLeaseSearch(e.target.value)}
                      className="pl-3 pr-8"
                    />
                  </div>
                  <SettingsSelect
                    className={selectedLease ? "w-full" : "w-40"}
                    placement="bottom"
                    value={leaseStatusFilter}
                    aria-label={L("تصفية حالة العقد", "Filter lease status")}
                    onChange={setLeaseStatusFilter}
                    options={[
                      { value: '', label: L('كل الحالات', 'All statuses') },
                      { value: 'active', label: L('نشط', 'Active') },
                      { value: 'expired', label: L('منتهي', 'Expired') },
                      { value: 'terminated', label: L('ملغى', 'Terminated') },
                    ]}
                  />
                </div>

                <div className="border-b border-[var(--nc-border)] px-3 py-2">
                  <div
                    dir="ltr"
                    data-lease-columns="lease-unit-tenant-status-rent"
                    className={isRTL
                      ? "hidden grid-cols-[minmax(24ch,.8fr)_112px_minmax(150px,1fr)_minmax(110px,.75fr)_minmax(150px,1.1fr)] gap-3 px-3 font-black text-[var(--nc-text-dim)] lg:grid orca-contracts-grid-header"
                      : "hidden grid-cols-[minmax(150px,1.1fr)_minmax(110px,.75fr)_minmax(150px,1fr)_112px_minmax(24ch,.8fr)] gap-3 px-3 font-black text-[var(--nc-text-dim)] lg:grid orca-contracts-grid-header"}
                  >
                    {isRTL ? (
                      <>
                        <span dir="ltr" className="text-start">{L('الإيجار', 'Rent')}</span>
                        <span className="text-center">{L('الحالة', 'Status')}</span>
                        <span dir="rtl" className="text-start">{L('المستأجر', 'Tenant')}</span>
                        <span dir="rtl" className="text-start">{L('الوحدة', 'Unit')}</span>
                        <span dir="rtl" className="text-start">{L('رقم العقد', 'Lease')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-start">{L('رقم العقد', 'Lease')}</span>
                        <span className="text-start">{L('الوحدة', 'Unit')}</span>
                        <span className="text-start">{L('المستأجر', 'Tenant')}</span>
                        <span className="text-center">{L('الحالة', 'Status')}</span>
                        <span dir="ltr" className="text-start">{L('الإيجار', 'Rent')}</span>
                      </>
                    )}
                  </div>
                </div>

                {filteredLeases.length === 0 ? (
                  <div className="p-3">
                    <OperationsEmptyState>
                      {L('لا توجد عقود إيجار مسجلة', 'No leases are registered')}
                    </OperationsEmptyState>
                  </div>
                ) : (
                  <OperationsMasterList>
                    {pagedLeases.map((lease) => {
                      const isSelected = selectedLeaseId === lease.id;
                      return (
                        <OperationsMasterRow
                          key={lease.id}
                          selected={isSelected}
                          aria-pressed={isSelected}
                          onClick={() => {
                            addTelemetryEvent('lease.opened', { contractId: lease.id, status: lease.status });
                            router.push(`/operations/rental/leases/${lease.id}`);
                          }}
                          dir="ltr"
                          data-lease-columns="lease-unit-tenant-status-rent"
                          className={isRTL
                            ? "orca-contracts-grid-row grid min-h-[68px] grid-cols-2 items-center gap-3 px-3 py-2 lg:grid-cols-[minmax(24ch,.8fr)_112px_minmax(150px,1fr)_minmax(110px,.75fr)_minmax(150px,1.1fr)]"
                            : "orca-contracts-grid-row grid min-h-[68px] grid-cols-2 items-center gap-3 px-3 py-2 lg:grid-cols-[minmax(150px,1.1fr)_minmax(110px,.75fr)_minmax(150px,1fr)_112px_minmax(24ch,.8fr)]"}
                        >
                          {isRTL ? (
                            <>
                              <span dir="ltr" className="orca-table-primary orca-number-column text-start font-black text-[var(--nc-text-primary)]">
                                {formatMoneyValue(lease.rent, displayLocale)}
                              </span>
                              <span className={`inline-flex w-fit min-w-[82px] justify-center rounded-full px-2.5 py-1 font-black orca-table-badge ${leaseStatusBadgeClass(lease.status)}`}>
                                {leaseStatusLabel(lease.status, displayLocale)}
                              </span>
                              <span dir="rtl" className="orca-table-primary hidden truncate text-start text-[var(--nc-text-secondary)] lg:block">
                                {displayPersonSafe(lease.tenant, displayLocale)}
                              </span>
                              <span dir="rtl" className="orca-table-primary truncate text-start font-mono text-[var(--nc-text-secondary)]">
                                {displayEntitySafe(lease.unit, 'unit', displayLocale)}
                              </span>
                              <span dir="rtl" className="min-w-0 text-start">
                                <strong className={`orca-table-primary block truncate ${isSelected ? 'text-[var(--nc-accent-text)]' : 'text-[var(--nc-text-primary)]'}`}>
                                  {getLeaseDisplayNumber(lease, displayLocale)}
                                </strong>
                                <span className="orca-table-secondary mt-0.5 block truncate text-[var(--nc-text-dim)] lg:hidden">
                                  {displayPersonSafe(lease.tenant, displayLocale)}
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 text-start">
                                <strong className={`orca-table-primary block truncate ${isSelected ? 'text-[var(--nc-accent-text)]' : 'text-[var(--nc-text-primary)]'}`}>
                                  {getLeaseDisplayNumber(lease, displayLocale)}
                                </strong>
                                <span className="orca-table-secondary mt-0.5 block truncate text-[var(--nc-text-dim)] lg:hidden">
                                  {displayPersonSafe(lease.tenant, displayLocale)}
                                </span>
                              </span>
                              <span className="orca-table-primary truncate text-start font-mono text-[var(--nc-text-secondary)]">
                                {displayEntitySafe(lease.unit, 'unit', displayLocale)}
                              </span>
                              <span className="orca-table-primary hidden truncate text-start text-[var(--nc-text-secondary)] lg:block">
                                {displayPersonSafe(lease.tenant, displayLocale)}
                              </span>
                              <span className={`inline-flex w-fit min-w-[82px] justify-center rounded-full px-2.5 py-1 font-black orca-table-badge ${leaseStatusBadgeClass(lease.status)}`}>
                                {leaseStatusLabel(lease.status, displayLocale)}
                              </span>
                              <span dir="ltr" className="orca-table-primary orca-number-column text-start font-black text-[var(--nc-text-primary)]">
                                {formatMoneyValue(lease.rent, displayLocale)}
                              </span>
                            </>
                          )}
                        </OperationsMasterRow>
                      );
                    })}
                  </OperationsMasterList>
                )}

                <OperationsPagination
                  page={normalizedLeasePage}
                  totalPages={leaseTotalPages}
                  totalItems={filteredLeases.length}
                  pageSize={CONTRACTS_PAGE_SIZE}
                  locale={displayLocale}
                  onPageChange={setLeasePage}
                />
              </OperationsPanel>
              ) : null}



              {/* Lease Detail Panel (Detail) */}
              {detailLeaseId && selectedLease ? (
                <OperationsPanel padded className="h-fit overflow-hidden" data-rental-lease-detail>
                  <div className="space-y-4 text-center">
                    
                    {/* Contextual contract actions live below the dedicated page header. */}
                    <div className="flex flex-wrap items-center justify-start gap-2 border-b border-[var(--nc-border)] pb-3">

                        <button
                          onClick={() => {
                             if (!isAllowed('CREATE_INVOICE')) {
                               alert(L('لا تملك صلاحية إصدار فواتير.', 'You do not have permission to issue invoices.'));
                               return;
                             }
                            setPrefilledContractId(selectedLease.id);
                            setInvSubtotal(selectedLease.rent);
                            setInvVatType('STANDARD');
                            setActiveModal('create_invoice');
                          }}
                          className={operationsVisual.primaryButton}
                        >
                           {L('فاتورة عقد إيجار (تسجيل يدوي)', 'Lease invoice (manual)')}
                        </button>

                        {selectedLease.status === 'expired' && !selectedLease.financialRef && (
                          <button
                            disabled
                            className={operationsVisual.secondaryButton}
                            title={isRTL ? "محاكاة غير إنتاجية — قيد التطوير" : "Non-production simulation — under development"}
                          >
                            {L('طلب تسوية المالك (قيد الربط)', 'Request payout (pending)')}
                          </button>
                        )}
                      <button
                        disabled
                        className={operationsVisual.secondaryButton}
                        title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
                      >
                        {L("إرسال تذكير (قيد الربط)", "Send Reminder (pending)")}
                      </button>
                      </div>

                    {/* Sub-tabs list */}
                    <OperationsTabs
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="w-full justify-start"
                      data-rental-lease-detail-tabs
                    >
                      {[
                        { id: 'summary', name: L('الملخص', 'Summary') },
                        { id: 'invoices', name: L('الفواتير', 'Invoices') },
                        { id: 'payments', name: L('الدفعات', 'Payments') },
                        { id: 'docs', name: L('المستندات', 'Documents') },
                        { id: 'settlements', name: L('التسويات', 'Settlements') },
                        { id: 'events', name: L('سجل الأحداث', 'Event log') }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setDetailActiveTab(tab.id)}
                          role="tab"
                          aria-selected={detailActiveTab === tab.id}
                          className={detailActiveTab === tab.id ? operationsVisual.activeTab : operationsVisual.tab}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </OperationsTabs>

                    {/* Sub-tab Panes */}
                    <div className="text-xs text-[var(--nc-text-dim)]">
                      
                      {/* Summary Tab */}
                      {detailActiveTab === 'summary' && (
                        <OperationsTabPanel className="space-y-4" data-lease-tab-panel="summary">
                          <FinancialLifecycleProgress
                            locale={displayLocale}
                            title={L('مسار عقد الإيجار المالي', 'Rental lease financial progress')}
                            nextAction={selectedLeaseLifecycleNextAction}
                            stages={selectedLeaseLifecycleStages}
                            compact
                          />

                          <div className="orca-lease-summary-grid">
                            <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/10">
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">{L('تاريخ صلاحية العقد', 'Lease term')}</span>
                              <span className="font-bold text-white mt-1.5 block">
                                {formatDateToDDMMYYYY(selectedLease.start)} — {formatDateToDDMMYYYY(selectedLease.end)}
                              </span>
                            </div>
                            <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/10">
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">{L('القيمة الإيجارية الدورية', 'Periodic rent')}</span>
                              <span className="font-bold text-white mt-1.5 block">{formatMoneyValue(selectedLease.rent, displayLocale)}</span>
                            </div>
                            <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/10">
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">{L('تأمين محتجز', 'Security deposit')}</span>
                              <span className="font-bold text-white mt-1.5 block">{formatMoneyValue(selectedLease.deposit, displayLocale)}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-[var(--nc-text-dim)] flex flex-wrap items-center justify-center gap-1 pt-2 font-mono text-center">
                            <span>{L('المرجع المالي للتسوية:', 'Settlement reference:')}</span>
                            <span className="text-cyan-400 font-bold">{selectedLease.financialRef ? safeDisplayValue(selectedLease.financialRef, displayLocale) : L('لا توجد تسويات جارية لهذا العقد حالياً', 'No active settlement for this lease')}</span>
                          </div>
                        </OperationsTabPanel>
                      )}

                      {/* Invoices Tab */}
                      {detailActiveTab === 'invoices' && (
                        <OperationsTabPanel horizontalScroll data-lease-tab-panel="invoices">
                          <table className="min-w-[560px] w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">{L('رقم الفاتورة', 'Invoice')}</th>
                                <th className="pb-2">{L('تاريخ الاستحقاق', 'Due date')}</th>
                                <th className="pb-2">{L('الإجمالي', 'Total')}</th>
                                <th className="pb-2">{L('الحالة', 'Status')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailInvoicePage.items.map(inv => (
                                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-bold text-white">{safeDisplayValue(inv.invoiceLabel, displayLocale)}</td>
                                  <td className="py-2.5 font-mono text-[var(--nc-text-dim)]">{formatDateToDDMMYYYY(inv.due)}</td>
                                  <td className="py-2.5 font-bold text-white">{formatMoneyValue(inv.totalAmount, displayLocale)}</td>
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      inv.status === 'paid' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : inv.status === 'overdue'
                                          ? 'bg-rose-500/20 text-rose-400'
                                          : 'bg-warning/20 text-warning'
                                    }`}>
                                      {invoiceStatusLabel(inv.status, displayLocale)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {selectedLeaseInvoices.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-3 text-right text-[var(--nc-text-dim)]">{L('لا توجد فواتير مرتبطة بهذا العقد حالياً.', 'No invoices are linked to this lease.')}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          {renderDetailPager('invoices', selectedLeaseInvoices.length, detailInvoicePage.page, detailInvoicePage.totalPages)}
                        </OperationsTabPanel>
                      )}

                      {/* Payments Tab */}
                      {detailActiveTab === 'payments' && (
                        <OperationsTabPanel horizontalScroll className="space-y-4" data-lease-tab-panel="payments">
                          <table className="min-w-[560px] w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">{L('التاريخ', 'Date')}</th>
                                <th className="pb-2">{L('المبلغ', 'Amount')}</th>
                                <th className="pb-2">{L('الطريقة', 'Method')}</th>
                                <th className="pb-2">{L('الحالة', 'Status')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailPaymentPage.items.map((pay) => {
                                const linkedInvoice = invoices.find(i => i.id === pay.invoiceId);
                                const payStatus = linkedInvoice?.status === 'paid' ? invoiceStatusLabel('paid', displayLocale) : L('مسجلة', 'Recorded');
                                const payStatusClass = linkedInvoice?.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-warning/20 text-warning';
                                return (
                                <tr key={pay.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-mono text-[var(--nc-text-dim)]">{formatDateToDDMMYYYY(pay.date)}</td>
                                  <td className="py-2.5 text-white font-bold">{formatMoneyValue(pay.amount, displayLocale)}</td>
                                  <td className="py-2.5 text-[var(--nc-text-dim)]">{paymentMethodLabel(pay.method, displayLocale)}</td>
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${payStatusClass}`}>
                                      {payStatus}
                                    </span>
                                  </td>
                                </tr>
                                );
                              })}
                              {selectedLeasePayments.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-3 text-right text-[var(--nc-text-dim)]">{L('لا توجد دفعات محصلة بعد.', 'No payments have been collected yet.')}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          {renderDetailPager('payments', selectedLeasePayments.length, detailPaymentPage.page, detailPaymentPage.totalPages)}
                        </OperationsTabPanel>
                      )}

                      {/* Documents Tab */}
                      {detailActiveTab === 'docs' && (
                        <OperationsTabPanel className="space-y-3" data-lease-tab-panel="docs">
                          <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-3 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[11px] text-[var(--nc-text-dim)]">{L('إضافة مستند أو ملف عقد مصدق:', 'Add a document or certified lease file:')}</span>
                            <div className="flex flex-wrap gap-2">
                              <input
                            type="file"
                            className="text-[10px] text-[var(--nc-text-dim)]"
                            onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] || null)}
                          />
                              <button 
                                onClick={handleLeaseDocumentUpload}
                                className={operationsVisual.secondaryButton}
                              >
                                {L('رفع الملف', 'Upload file')}
                              </button>
                            </div>
                          </div>

                          <ul className="space-y-2">
                            {detailDocumentPage.items.map(doc => (
                            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-[var(--nc-surface)]/60 px-3 py-2">
                              <button
                                onClick={() => handleDownloadLeaseAgreement(selectedLease.id)}
                                className="text-right text-cyan-400 hover:underline truncate max-w-[280px]"
                              >
                                {doc.name}
                              </button>
                              <span className="text-[9px] text-[var(--nc-text-dim)] font-mono shrink-0">({doc.size})</span>
                            </li>
                            ))}
                          </ul>
                          {selectedLeaseDocuments.length === 0 && (
                            <p className="py-3 text-right text-[var(--nc-text-dim)]">{L('لا توجد مستندات مرتبطة بهذا العقد.', 'No documents are linked to this lease.')}</p>
                          )}
                          {renderDetailPager('docs', selectedLeaseDocuments.length, detailDocumentPage.page, detailDocumentPage.totalPages)}
                        </OperationsTabPanel>
                      )}

                      {/* Settlements Tab */}
                      {detailActiveTab === 'settlements' && (
                        <OperationsTabPanel horizontalScroll data-lease-tab-panel="settlements">
                          <table className="min-w-[560px] w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">{L('التاريخ', 'Date')}</th>
                                <th className="pb-2">{L('المبلغ', 'Amount')}</th>
                                <th className="pb-2">{L('الحالة', 'Status')}</th>
                                <th className="pb-2">{L('المرجع', 'Reference')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailSettlementPage.items.map((settle, index) => (
                                <tr key={settle.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-mono text-[var(--nc-text-dim)]">—</td>
                                  <td className="py-2.5 text-white font-bold">{formatMoneyValue(settle.net, displayLocale)}</td>
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      settle.status === 'completed' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-warning/20 text-warning'
                                    }`}>
                                      {settlementStatusLabel(settle.status, displayLocale)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 font-bold text-xs text-[var(--nc-text-dim)]">{L(`تسوية ${formatNumberValue(detailSettlementPage.page * DETAIL_TAB_PAGE_SIZE + index + 1, displayLocale)}`, `Settlement ${formatNumberValue(detailSettlementPage.page * DETAIL_TAB_PAGE_SIZE + index + 1, displayLocale)}`)}</td>
                                </tr>
                              ))}
                              {selectedLeaseSettlements.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-3 text-right text-[var(--nc-text-dim)]">{L('لا توجد تسويات مالية مرتبطة بهذا العقد.', 'No financial settlements are linked to this lease.')}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          {renderDetailPager('settlements', selectedLeaseSettlements.length, detailSettlementPage.page, detailSettlementPage.totalPages)}
                        </OperationsTabPanel>
                      )}

                      {/* Events Tab */}
                      {detailActiveTab === 'events' && (
                        <OperationsTabPanel className="space-y-3" data-lease-tab-panel="events">
                          <div className="border-r-2 border-white/5 pr-4 space-y-3">
                            {detailEventPage.items.map(evt => (
                              <div key={evt.id} className="relative">
                                <div className="absolute right-[-21px] top-1 w-2 h-2 rounded-full bg-[var(--nc-op-blue)]"></div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--nc-text-dim)]">
                                  <span className="font-bold text-[var(--nc-text-primary)]">{getEventLabel(evt.type)}</span>
                                  <span className="font-mono">{formatEventTimestamp(evt.timestamp)}</span>
                                </div>
                                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{cleanEventNote(evt.note)}</p>
                              </div>
                            ))}
                            {selectedLeaseEvents.length === 0 && (
                              <p className="py-3 text-right text-[var(--nc-text-dim)]">{L('لا توجد أحداث مسجلة لهذا العقد.', 'No events are recorded for this lease.')}</p>
                            )}
                          </div>
                          {renderDetailPager('events', selectedLeaseEvents.length, detailEventPage.page, detailEventPage.totalPages)}
                        </OperationsTabPanel>
                      )}

                    </div>
                  </div>
                </OperationsPanel>
              ) : null}

              {detailLeaseId && !selectedLease && !isLoading ? (
                <div className="p-3">
                  <OperationsEmptyState>
                    {L('تعذر العثور على عقد الإيجار المطلوب.', 'The requested rental lease could not be found.')}
                  </OperationsEmptyState>
                </div>
              ) : null}

            </OperationsExecutiveGrid>
          )}

          {/* ── Pane 2: Sales Contracts ── */}
          {activePane === 'sales' && (
            <SalesContractsPanel locale={displayLocale} />
          )}

          {/* ── Invoices workspace ── */}
          {activePane === 'invoices' && (
            <InvoicesWorkspace
              locale={displayLocale}
              invoices={invoices}
              onRecordPayment={(invoiceId) => {
                const invoice = invoices.find((item) => item.id === invoiceId);
                if (!invoice) return;
                setSelectedInvoice(invoice);
                setPayDate(new Date().toISOString().split('T')[0]);
                setActiveModal('register_payment');
              }}
            />
          )}

          {/* ── Payments workspace ── */}
          {activePane === 'payments' && (
            <PaymentsWorkspace
              locale={displayLocale}
              payments={payments}
              fetchError={paymentFetchError}
              onRetry={refreshPayments}
              onOpenSaleContract={(contractId) =>
                router.push(`/operations/rental/sales/contracts/${contractId}`)
              }
              onOpenLease={(leaseId) =>
                router.push(`/operations/rental/leases/${leaseId}`)
              }
            />
          )}

          {activePane === 'reconciliation' && (
            <ReconciliationWorkspace locale={displayLocale} />
          )}

          {activePane === 'settlements' && (
            <SettlementsWorkspace
              locale={displayLocale}
              settlements={settlements}
              loading={isLoading}
              fetchError={settlementFetchError}
              onRetry={refreshSettlements}
              onOpenSaleContract={(contractId) =>
                router.push(`/operations/rental/sales/contracts/${contractId}`)
              }
              onOpenLease={(leaseId) => {
                setSelectedLeaseId(leaseId);
                changePane('leases');
              }}
            />
          )}
        </div>
      )}

    </div>
  );

  if (!mounted) return <div className="p-10 text-[var(--nc-foreground)]">{L('جاري التهيئة...', 'Initializing...')}</div>;

  return (
    <ContractsPaymentsShell
      locale={displayLocale}
      activePane={activePane}
      onPaneChange={changePane}
      loading={isLoading}
      title={
        detailLeaseId
          ? selectedLease
            ? getLeaseDisplayNumber(selectedLease, displayLocale)
            : L('عقد الإيجار', 'Rental lease')
          : L('مركز العقود والتحصيل المالي', 'Contracts & Financial Collection Center')
      }
      description={
        detailLeaseId && selectedLease
          ? `${L('المستأجر:', 'Tenant:')} ${displayPersonSafe(selectedLease.tenant, displayLocale)} · ${L('الوحدة:', 'Unit:')} ${displayEntitySafe(selectedLease.unit, 'unit', displayLocale)}`
          : L(
              'إدارة دورة العقد من الالتزام التعاقدي حتى التحصيل والمصالحة والتسوية والإغلاق.',
              'Manage the contract lifecycle from commitment through collection, reconciliation, settlement, and close.',
            )
      }
      metrics={
        detailLeaseId
          ? [
              {
                label: L('الإيجار الدوري', 'Periodic rent'),
                value: selectedLease ? formatMoneyValue(selectedLease.rent, displayLocale) : '—',
                hint: L('القيمة الدورية للعقد', 'Lease periodic value'),
                tone: 'default' as const,
              },
              {
                label: L('التأمين', 'Deposit'),
                value: selectedLease ? formatMoneyValue(selectedLease.deposit, displayLocale) : '—',
                hint: L('التأمين المحتجز', 'Security deposit'),
                tone: 'default' as const,
              },
              {
                label: L('الفواتير', 'Invoices'),
                value: formatNumberValue(selectedLeaseInvoices.length, displayLocale),
                hint: L('الفواتير المرتبطة بالعقد', 'Invoices linked to the lease'),
                tone: 'default' as const,
              },
              {
                label: L('المحصل', 'Collected'),
                value: formatMoneyValue(
                  selectedLeaseCompletedPayments.reduce((sum, payment) => sum + payment.amount, 0),
                  displayLocale,
                ),
                hint: L(
                  `${formatNumberValue(selectedLeaseCompletedPayments.length, displayLocale)} دفعات مكتملة`,
                  `${formatNumberValue(selectedLeaseCompletedPayments.length, displayLocale)} completed payments`,
                ),
                tone: 'success' as const,
              },
            ]
          : [
              {
                label: L('العقود النشطة', 'Active contracts'),
                value: formatNumberValue(activeLeases.length, displayLocale),
                hint: L('عقود الإيجار النشطة حاليًا', 'Active rental leases'),
                tone: 'default' as const,
              },
              {
                label: L('إجمالي المستحقات', 'Total receivables'),
                value: formatMoneyValue(totalReceivables, displayLocale),
                hint: L('فواتير لم تغلق ماليًا', 'Invoices not financially closed'),
                tone: 'default' as const,
              },
              {
                label: L('المتأخرات', 'Overdue'),
                value: formatMoneyValue(totalOverdue, displayLocale),
                hint: L(`${formatNumberValue(overdueInvoicesCount, displayLocale)} فواتير متأخرة`, `${formatNumberValue(overdueInvoicesCount, displayLocale)} overdue invoices`),
                tone: totalOverdue > 0 ? 'danger' as const : 'success' as const,
              },
              {
                label: L('المحصل الفعلي', 'Collected'),
                value: formatMoneyValue(completedPaymentTotal, displayLocale),
                hint: L(`${formatNumberValue(completedPayments.length, displayLocale)} دفعات مكتملة`, `${formatNumberValue(completedPayments.length, displayLocale)} completed payments`),
                tone: 'success' as const,
              },
            ]
      }
      alerts={detailLeaseId ? [] : [
        ...(overdueInvoicesCount > 0
          ? [{
              label: L(`${formatNumberValue(overdueInvoicesCount, displayLocale)} فواتير متأخرة`, `${formatNumberValue(overdueInvoicesCount, displayLocale)} overdue invoices`),
              tone: 'danger' as const,
            }]
          : []),
        ...(expiredLeasesCount > 0
          ? [{
              label: L(`${formatNumberValue(expiredLeasesCount, displayLocale)} عقود تحتاج تجديد`, `${formatNumberValue(expiredLeasesCount, displayLocale)} leases need renewal`),
              tone: 'warning' as const,
            }]
          : []),
        ...(pendingSettlementsCount > 0
          ? [{
              label: L(`${formatNumberValue(pendingSettlementsCount, displayLocale)} تسويات معلقة`, `${formatNumberValue(pendingSettlementsCount, displayLocale)} pending settlements`),
              tone: 'info' as const,
            }]
          : []),
      ]}
      showWorkspaceNavigation={!detailLeaseId}
      actions={
        detailLeaseId ? (
          <OperationsBackAction
            href="/operations/rental/leases"
            label={L('العودة إلى عقود الإيجار', 'Back to rental leases')}
            locale={displayLocale}
          />
        ) : (
        <>
          <SettingsButton
            type="button"
            variant="primary"
            onClick={() => changePane('sales')}
          >
            <PenLine size={13} />
            {L('عقود البيع', 'Sales contracts')}
          </SettingsButton>
          <SettingsButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (!isAllowed('CREATE_LEASE')) {
                alert(L('عذراً، لا تملك الصلاحية لإضافة عقد جديد.', 'Sorry, you do not have permission to add a new lease.'));
                return;
              }
              setActiveModal('new_lease');
            }}
          >
            <Plus size={13} />
            {L('عقد إيجار جديد', 'New lease')}
          </SettingsButton>
          <SettingsButton
            type="button"
            variant="ghost"
            onClick={() => {
              if (!isAllowed('CREATE_INVOICE')) {
                alert(L('عذراً، لا تملك الصلاحية لإصدار فواتير.', 'Sorry, you do not have permission to issue invoices.'));
                return;
              }
              setActiveModal('create_invoice');
            }}
          >
            <Receipt size={13} />
            {L('إصدار فاتورة', 'Issue invoice')}
          </SettingsButton>
        </>
        )
      }
    >
      <section className="w-full">
        {detailsContent}
      </section>

      <OperationsDialog
        open={activeModal === 'new_lease'}
        onClose={() => setActiveModal(null)}
        title={L('إضافة عقد إيجار جديد', 'Add new lease')}
        description={L(
          'أدخل بيانات الوحدة والمستأجر وفترة العقد والقيم المالية.',
          'Enter the unit, tenant, lease period, and financial values.',
        )}
        closeLabel={L('إغلاق', 'Close')}
        dir={displayLocale === 'ar' ? 'rtl' : 'ltr'}
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className={operationsVisual.secondaryButton}
            >
              {L('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              form="contracts-new-lease-form"
              className={operationsVisual.primaryButton}
            >
              {L('تأكيد وتسجيل العقد', 'Create lease')}
            </button>
          </>
        }
      >
        <form
          id="contracts-new-lease-form"
          onSubmit={handleCreateLease}
          noValidate
          data-contracts-modal="true"
          className="grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <OperationsFormField label={L('رقم أو رمز الوحدة العقارية', 'Unit number or code')}>
              <OperationsTextField
                required
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder={L('مثال: A-101', 'Example: A-101')}
              />
            </OperationsFormField>

            <OperationsFormField label={L('اسم المستأجر', 'Tenant name')}>
              <OperationsTextField
                required
                value={newTenant}
                onChange={(e) => setNewTenant(e.target.value)}
                placeholder={L('الاسم الكامل للمستأجر...', 'Tenant full name...')}
              />
            </OperationsFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DateField
              value={newStart}
              onChange={(val) => setNewStart(val)}
              label={L('بداية العقد', 'Lease start')}
            />
            <DateField
              value={newEnd}
              onChange={(val) => setNewEnd(val)}
              label={L('نهاية العقد', 'Lease end')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <OperationsFormField label={L('قيمة الإيجار الدوري (ر.س)', 'Periodic rent (SAR)')}>
              <OperationsNumberField
                mode="decimal"
                value={newRent ? String(newRent) : ''}
                onValueChange={(value) => setNewRent(Number(value || 0))}
                className="orca-operations-input"
              />
            </OperationsFormField>

            <OperationsFormField label={L('قيمة التأمين المحتجز (ر.س)', 'Security deposit (SAR)')}>
              <OperationsNumberField
                mode="decimal"
                value={newDeposit ? String(newDeposit) : ''}
                onValueChange={(value) => setNewDeposit(Number(value || 0))}
                className="orca-operations-input"
              />
            </OperationsFormField>
          </div>
        </form>
      </OperationsDialog>

      <OperationsDialog
        open={activeModal === 'create_invoice'}
        onClose={() => {
          setPrefilledContractId('');
          setActiveModal(null);
        }}
        title={L('إصدار فاتورة ضريبية', 'Issue tax invoice')}
        description={L(
          'اربط الفاتورة بالعقد وحدد المبلغ والضريبة وتاريخ الاستحقاق.',
          'Link the invoice to a lease, then set subtotal, VAT, and due date.',
        )}
        closeLabel={L('إغلاق', 'Close')}
        dir={displayLocale === 'ar' ? 'rtl' : 'ltr'}
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setPrefilledContractId('');
                setActiveModal(null);
              }}
              className={operationsVisual.secondaryButton}
            >
              {L('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              form="contracts-create-invoice-form"
              className={operationsVisual.primaryButton}
            >
              {L('إصدار الفاتورة الضريبية', 'Issue tax invoice')}
            </button>
          </>
        }
      >
        <form
          id="contracts-create-invoice-form"
          onSubmit={handleCreateInvoice}
          noValidate
          data-contracts-modal="true"
          className="grid gap-4"
        >
          <OperationsFormField label={L('رقم العقد', 'Lease')}>
            {prefilledContractId ? (
              <div className="orca-operations-input flex items-center font-bold">
                {getLeaseDisplayNumber(selectedLease || undefined, displayLocale)}
              </div>
            ) : (
              <OperationsTextField
                required
                value={invLeaseId}
                onChange={(e) => setInvLeaseId(e.target.value)}
                placeholder={L('مثال: L-1001', 'Example: L-1001')}
                className="font-mono"
              />
            )}
          </OperationsFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <OperationsFormField label={L('المبلغ قبل الضريبة (ر.س)', 'Subtotal before VAT (SAR)')}>
              <OperationsNumberField
                mode="decimal"
                name="inv-subtotal"
                value={invSubtotal ? String(invSubtotal) : ''}
                onValueChange={(value) => setInvSubtotal(Number(value || 0))}
                className="orca-operations-input"
              />
            </OperationsFormField>

            <OperationsFormField label={L('نوع الضريبة', 'VAT type')}>
              <SettingsSelect
                className="w-full"
                placement="bottom"
                value={invVatType}
                onChange={setInvVatType}
                options={[
                  { value: 'STANDARD', label: vatTypeLabel('STANDARD', displayLocale) },
                  { value: 'ZERO_RATED', label: vatTypeLabel('ZERO_RATED', displayLocale) },
                  { value: 'EXEMPT', label: vatTypeLabel('EXEMPT', displayLocale) },
                ]}
              />
            </OperationsFormField>
          </div>

          {invSubtotal > 0 ? (
            <div className={operationsVisual.softPanel + ' grid gap-2 p-3'}>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--nc-text-dim)]">{L('قبل الضريبة', 'Subtotal')}</span>
                <strong>{formatMoneyValue(invSubtotal, displayLocale)}</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--nc-text-dim)]">
                  {L('الضريبة', 'VAT')} ({invVatType === 'STANDARD' ? 15 : 0}%)
                </span>
                <strong>
                  {formatMoneyValue(
                    invVatType === 'STANDARD' ? invSubtotal * 0.15 : 0,
                    displayLocale,
                  )}
                </strong>
              </div>
              <div className="flex justify-between border-t border-[var(--nc-border)] pt-2 text-xs">
                <span>{L('الإجمالي', 'Total')}</span>
                <strong className="text-emerald-400">
                  {formatMoneyValue(
                    invVatType === 'STANDARD' ? invSubtotal * 1.15 : invSubtotal,
                    displayLocale,
                  )}
                </strong>
              </div>
            </div>
          ) : null}

          <DateField
            value={invDueDate}
            onChange={(val) => setInvDueDate(val)}
            label={L('تاريخ الاستحقاق', 'Due date')}
          />
        </form>
      </OperationsDialog>

      <OperationsDialog
        open={activeModal === 'register_payment' && Boolean(selectedInvoice)}
        onClose={() => {
          setSelectedInvoice(null);
          setActiveModal(null);
        }}
        title={L('تسجيل دفعة يدوية للفاتورة', 'Record manual invoice payment')}
        description={L(
          'هذا تسجيل داخلي للسداد ولا يمثل دفعًا إلكترونيًا عبر بوابة دفع.',
          'This records an internal/manual payment and does not process an online gateway payment.',
        )}
        closeLabel={L('إغلاق', 'Close')}
        closeDisabled={isPaying}
        dir={displayLocale === 'ar' ? 'rtl' : 'ltr'}
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              disabled={isPaying}
              onClick={() => {
                setSelectedInvoice(null);
                setActiveModal(null);
              }}
              className={operationsVisual.secondaryButton}
            >
              {L('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              form="contracts-register-payment-form"
              disabled={isPaying}
              className={operationsVisual.primaryButton}
            >
              {isPaying
                ? L('جاري التسجيل...', 'Recording...')
                : L('تأكيد التحصيل والتسوية', 'Confirm collection')}
            </button>
          </>
        }
      >
        {selectedInvoice ? (
          <form
            id="contracts-register-payment-form"
            onSubmit={handleRegisterPayment}
            noValidate
            data-contracts-modal="true"
            className="grid gap-4"
          >
            <div className={operationsVisual.softPanel + ' grid gap-2 p-3'}>
              <div className="flex justify-between gap-3 text-[11px]">
                <span className="text-[var(--nc-text-dim)]">{L('رقم الفاتورة', 'Invoice')}</span>
                <strong>{safeDisplayValue(selectedInvoice.invoiceLabel, displayLocale)}</strong>
              </div>
              <div className="flex justify-between gap-3 text-[11px]">
                <span className="text-[var(--nc-text-dim)]">{L('القيمة الإجمالية المطلوبة', 'Total due')}</span>
                <strong className="text-emerald-400">
                  {formatMoneyValue(selectedInvoice.totalAmount, displayLocale)}
                </strong>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <OperationsFormField label={L('طريقة التحصيل', 'Collection method')}>
                <SettingsSelect
                  className="w-full"
                  placement="bottom"
                  value={payMethod}
                  onChange={setPayMethod}
                  options={[
                    { value: 'bank', label: paymentMethodLabel('bank', displayLocale) },
                    { value: 'card', label: paymentMethodLabel('card', displayLocale) },
                    { value: 'cash', label: paymentMethodLabel('cash', displayLocale) },
                  ]}
                />
              </OperationsFormField>

              <OperationsFormField label={L('رقم المرجع', 'Reference number')}>
                <OperationsTextField
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={L('رقم الحوالة البنكية...', 'Bank transfer reference...')}
                />
              </OperationsFormField>
            </div>

            <DateField
              value={payDate}
              onChange={(val) => setPayDate(val)}
              label={L('تاريخ الاستلام والتحصيل', 'Collection date')}
            />

            <OperationsFormField
              label={L('مفتاح تفادي التكرار', 'Idempotency key')}
              hint={L(
                'يمنع هذا المفتاح تكرار تسجيل عمليات السداد عند الضغط المتكرر.',
                'This key prevents duplicate payment registration on repeated clicks.',
              )}
            >
              <OperationsTextField
                disabled
                value={payIdempotencyKey}
                className="font-mono text-[10px]"
              />
            </OperationsFormField>
          </form>
        ) : null}
      </OperationsDialog>

    </ContractsPaymentsShell>
  );
}




