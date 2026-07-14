'use client';
import { toast } from '@/app/context/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { displayPerson, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

import React, { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Calculator, Megaphone, Plus, Search, Eye,
  Landmark, ChevronRight, AlertCircle, FileCheck, ArrowRight,
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
import { formatCurrency } from '@/lib/ui-formatters';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/display/dateTime';

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
const CONTRACTS_PAGE_SIZE = 6;
const DETAIL_TAB_PAGE_SIZE = 4;


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
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return formatDisplayDate(date);
  }
  return safeDisplayValue(value, locale);
}

function isTechnicalReference(value?: string | null): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^[0-9a-f]{12,}$/i.test(text);
}

function getLeaseDisplayNumber(lease?: Pick<Lease, 'unit' | 'tenant'> | null, locale: RentalLocale = 'ar'): string {
  if (!lease) return textFor(locale, 'عقد إيجار', 'Lease');

  const unit = safeDisplayValue(lease.unit, locale);
  if (unit !== emptyValue(locale)) return textFor(locale, `عقد ${unit}`, `Lease ${unit}`);

  const tenant = displayPersonSafe(lease.tenant, locale);
  if (tenant !== emptyValue(locale)) return textFor(locale, `عقد - ${tenant}`, `Lease - ${tenant}`);

  return textFor(locale, 'عقد إيجار', 'Lease');
}

interface ContractsPaymentsCenterProps {
  defaultPane?: ContractsPaymentsPane;
}

export default function ContractsPaymentsCenter({
  defaultPane = 'leases',
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
  const initialPane: ActivePane = isActivePane(requestedPane)
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
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
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
    setPayIdempotencyKey('idemp-' + Math.floor(100000 + Math.random() * 900000));
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
      setPayIdempotencyKey('idemp-' + Math.floor(100000 + Math.random() * 900000));
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

      {isPending ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[var(--nc-foreground-muted)] font-bold">{L('جاري تحميل بيانات القسم...', 'Loading section data...')}</span>
        </div>
      ) : (
        <div className="orca-view-enter">
          
          {/* ── Pane 1: Leases (Master-Detail) ── */}
          {activePane === 'leases' && (
            <div className="orca-master-detail">
              
              {/* Leases List (Master) */}
              <div className="orca-master-pane h-fit w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden fade-in-up">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                  <span className="text-sm font-bold text-white">{L('قائمة عقود الإيجار', 'Leases list')}</span>
                  <div className="flex gap-2">
                    <SettingsButton
                       type="button"
                       variant="primary"
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
                    </SettingsButton>
              </div>
            </div>

                <div className="px-4 pb-3 pt-3 border-b border-white/5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 text-[var(--nc-text-dim)]" size={13} />
                    <input 
                      type="text"
                      placeholder={L("بحث باسم المستأجر، العقد أو الوحدة...", "Search tenant, lease, or unit...")}
                      value={leaseSearch}
                      onChange={(e) => setLeaseSearch(e.target.value)}
                      className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl pr-8 pl-3 py-2 text-xs text-white outline-none focus:border-[var(--nc-accent-border)]"
                    />
                  </div>
                  <SettingsSelect
                    className="w-40"
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

                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <table className="nc-table nc-table-striped">
                    <thead>
                      <tr>
                        <th>{L('رقم العقد', 'Lease')}</th>
                        <th>{L('الوحدة', 'Unit')}</th>
                        <th>{L('المستأجر', 'Tenant')}</th>
                        <th>{L('الحالة', 'Status')}</th>
                        <th className="text-left">{L('الإيجار', 'Rent')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs font-medium text-[var(--nc-text-dim)]">
                            {L('لا توجد عقود إيجار مسجلة', 'No leases are registered')}
                          </td>
                        </tr>
                      ) : (
                        pagedLeases.map((lease) => {
                          const isSelected = selectedLeaseId === lease.id;
                          return (
                            <tr
                              key={lease.id}
                              onClick={() => {
                                setSelectedLeaseId(lease.id);
                                setDetailActiveTab('summary');
                                addTelemetryEvent('lease.opened', { contractId: lease.id, status: lease.status });
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? '!bg-[var(--nc-accent-soft)] border-r-[3px] border-r-[var(--nc-accent)]'
                                  : 'orca-data-row'
                              }`}
                            >
                              <td>
                                <span className={`font-bold ${isSelected ? 'text-[var(--nc-accent)]' : 'text-[var(--nc-text-primary)]'}`}>{getLeaseDisplayNumber(lease, displayLocale)}</span>
                              </td>
                              <td className={`font-mono ${isSelected ? 'text-[var(--nc-text-primary)]' : 'text-[var(--nc-text-dim)]'}`}>{displayEntitySafe(lease.unit, 'unit', displayLocale)}</td>
                              <td className={isSelected ? 'text-[var(--nc-text-primary)]' : 'text-[var(--nc-text-dim)]'}>{displayPersonSafe(lease.tenant, displayLocale)}</td>
                              <td>
                                <span className={`inline-flex min-w-[82px] justify-center rounded-full px-2.5 py-1 text-[10px] font-black ${leaseStatusBadgeClass(lease.status)}`}>
                                  {leaseStatusLabel(lease.status, displayLocale)}
                                </span>
                              </td>
                              <td className="text-left">
                                <MoneyCell amount={lease.rent} lang={isRTL ? 'AR' : 'EN'} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredLeases.length > CONTRACTS_PAGE_SIZE && (
                  <div className="flex flex-col gap-2 border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)] sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold">
                      {L(`${formatNumberValue(leaseRangeStart, displayLocale)}-${formatNumberValue(leaseRangeEnd, displayLocale)} من ${formatNumberValue(filteredLeases.length, displayLocale)}`, `${formatNumberValue(leaseRangeStart, displayLocale)}-${formatNumberValue(leaseRangeEnd, displayLocale)} of ${formatNumberValue(filteredLeases.length, displayLocale)}`)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLeasePage((current) => Math.max(0, current - 1))}
                        disabled={normalizedLeasePage === 0}
                        className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {L('السابق', 'Previous')}
                      </button>
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[var(--nc-foreground)]">
                        {L(`صفحة ${formatNumberValue(normalizedLeasePage + 1, displayLocale)} من ${formatNumberValue(leaseTotalPages, displayLocale)}`, `Page ${formatNumberValue(normalizedLeasePage + 1, displayLocale)} of ${formatNumberValue(leaseTotalPages, displayLocale)}`)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLeasePage((current) => Math.min(leaseTotalPages - 1, current + 1))}
                        disabled={normalizedLeasePage >= leaseTotalPages - 1}
                        className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {L('التالي', 'Next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lease Detail Panel (Detail) */}
              <div className="orca-detail-pane h-fit w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="p-5">
                {!selectedLease ? (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-[var(--nc-surface)]/50 px-4 py-5 text-right text-[var(--nc-text-dim)] text-xs">
                    <Landmark size={20} className="mt-0.5 shrink-0 text-[var(--nc-text-dim)]" />
                    <span>{L('اختر عقدًا من القائمة لعرض تفاصيله.', 'Select a lease from the list to view details.')}</span>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    
                    {/* Detail Panel Header */}
                    <div className="space-y-3 border-b border-white/5 pb-4">
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-white">
                            {getLeaseDisplayNumber(selectedLease, displayLocale)}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            selectedLease.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {leaseStatusLabel(selectedLease.status, displayLocale)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--nc-text-dim)]">
                          {L('المستأجر:', 'Tenant:')} {displayPersonSafe(selectedLease.tenant, displayLocale)} · {L('الوحدة:', 'Unit:')} {displayEntitySafe(selectedLease.unit, 'unit', displayLocale)}
                        </p>
                      </div>

                      {/* Contextual Actions (only inside detail panel!) */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                          className="px-2.5 py-1.5 bg-[var(--nc-op-blue)] hover:bg-[var(--nc-op-blue-hover)] text-white text-[11px] font-black rounded-lg transition-all border border-white/10"
                        >
                           {L('فاتورة عقد إيجار (تسجيل يدوي)', 'Lease invoice (manual)')}
                        </button>

                        {selectedLease.status === 'expired' && !selectedLease.financialRef && (
                          <button
                            disabled
                            className="px-2.5 py-1.5 bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] text-[var(--nc-text-disabled)] text-[11px] font-black rounded-lg cursor-not-allowed"
                            title={isRTL ? "محاكاة غير إنتاجية — قيد التطوير" : "Non-production simulation — under development"}
                          >
                            {L('طلب تسوية المالك (قيد الربط)', 'Request payout (pending)')}
                          </button>
                        )}
                      <button
                        disabled
                        className="px-2.5 py-1.5 bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] text-[var(--nc-foreground-muted)] text-[11px] font-black rounded-lg transition-all opacity-60 cursor-not-allowed"
                        title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
                      >
                        {L("إرسال تذكير (قيد الربط)", "Send Reminder (pending)")}
                      </button>
                      </div>
                    </div>

                    {/* Sub-tabs list */}
                    <div className="orca-workspace-tabs flex flex-wrap justify-center gap-1.5 border-b border-white/5 pb-2">
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
                          className={`min-h-[28px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                            detailActiveTab === tab.id 
                              ? 'border border-[var(--orca-action-gold)] bg-[var(--orca-action-gold-soft)] text-[var(--orca-action-gold)] shadow-sm'
                              : 'bg-[var(--nc-surface)] dark:bg-white/5 border border-white/10 text-[var(--nc-text-dim)] hover:border-[var(--orca-action-gold)] hover:bg-[var(--orca-action-gold-soft)] hover:text-[var(--orca-action-gold)]'
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    {/* Sub-tab Panes */}
                    <div className="text-xs text-[var(--nc-text-dim)]">
                      
                      {/* Summary Tab */}
                      {detailActiveTab === 'summary' && (
                        <div className="space-y-4">
                          <FinancialLifecycleProgress
                            locale={displayLocale}
                            title={L('مسار عقد الإيجار المالي', 'Rental lease financial progress')}
                            nextAction={selectedLeaseLifecycleNextAction}
                            stages={selectedLeaseLifecycleStages}
                            compact
                          />

                          <div className="orca-auto-grid">
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
                        </div>
                      )}

                      {/* Invoices Tab */}
                      {detailActiveTab === 'invoices' && (
                        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          <table className="w-full text-right border-collapse">
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
                        </div>
                      )}

                      {/* Payments Tab */}
                      {detailActiveTab === 'payments' && (
                        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-4">
                          <table className="w-full text-right border-collapse">
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
                        </div>
                      )}

                      {/* Documents Tab */}
                      {detailActiveTab === 'docs' && (
                        <div className="space-y-3">
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
                                className="px-3 py-1 bg-[var(--nc-surface-strong)] border border-white/10 hover:bg-white/5 rounded text-[10px] text-white"
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
                        </div>
                      )}

                      {/* Settlements Tab */}
                      {detailActiveTab === 'settlements' && (
                        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          <table className="w-full text-right border-collapse">
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
                        </div>
                      )}

                      {/* Events Tab */}
                      {detailActiveTab === 'events' && (
                        <div className="space-y-3">
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
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
              </div>

            </div>
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
              onOpenLease={(leaseId) => {
                setSelectedLeaseId(leaseId);
                changePane('leases');
              }}
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
      title={L('مركز العقود والتحصيل المالي', 'Contracts & Financial Collection Center')}
      description={L(
        'إدارة دورة العقد من الالتزام التعاقدي حتى التحصيل والمصالحة والتسوية والإغلاق.',
        'Manage the contract lifecycle from commitment through collection, reconciliation, settlement, and close.',
      )}
      metrics={[
        {
          label: L('العقود النشطة', 'Active contracts'),
          value: formatNumberValue(activeLeases.length, displayLocale),
          hint: L('عقود الإيجار النشطة حاليًا', 'Active rental leases'),
          tone: 'default',
        },
        {
          label: L('إجمالي المستحقات', 'Total receivables'),
          value: formatMoneyValue(totalReceivables, displayLocale),
          hint: L('فواتير لم تغلق ماليًا', 'Invoices not financially closed'),
          tone: 'default',
        },
        {
          label: L('المتأخرات', 'Overdue'),
          value: formatMoneyValue(totalOverdue, displayLocale),
          hint: L(`${formatNumberValue(overdueInvoicesCount, displayLocale)} فواتير متأخرة`, `${formatNumberValue(overdueInvoicesCount, displayLocale)} overdue invoices`),
          tone: totalOverdue > 0 ? 'danger' : 'success',
        },
        {
          label: L('المحصل الفعلي', 'Collected'),
          value: formatMoneyValue(completedPaymentTotal, displayLocale),
          hint: L(`${formatNumberValue(completedPayments.length, displayLocale)} دفعات مكتملة`, `${formatNumberValue(completedPayments.length, displayLocale)} completed payments`),
          tone: 'success',
        },
      ]}
      alerts={[
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
      actions={
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
      }
    >
      <section className="w-full">
        {detailsContent}
      </section>

      {/* ── Modal 1: New Lease Form ── */}
      {activeModal === 'new_lease' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-inner" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateLease}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-op-blue)] border-b border-white/5 pb-2 flex items-center gap-2">
              <Plus size={18} />
              {L('إضافة عقد إيجار جديد', 'Add new lease')}
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">{L('رقم أو رمز الوحدة العقارية:', 'Unit number or code:')}</label>
              <input 
                type="text"
                required
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder={L("مثال: A-101", "Example: A-101")}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">{L('اسم المستأجر:', 'Tenant name:')}</label>
              <input 
                type="text"
                required
                value={newTenant}
                onChange={(e) => setNewTenant(e.target.value)}
                placeholder={L("الاسم الكامل للمستأجر...", "Tenant full name...")}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <DateField 
                  value={newStart}
                  onChange={(val) => setNewStart(val)}
                  label={L("بداية العقد", "Lease start")}
                />
              </div>
              <div className="space-y-1">
                <DateField 
                  value={newEnd}
                  onChange={(val) => setNewEnd(val)}
                  label={L("نهاية العقد", "Lease end")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('قيمة الإيجار الدوري (ر.س):', 'Periodic rent (SAR):')}</label>
                <input 
                  type="number"
                  required
                  value={newRent}
                  onChange={(e) => setNewRent(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('قيمة التأمين المحتجز (ر.س):', 'Security deposit (SAR):')}</label>
                <input 
                  type="number"
                  required
                  value={newDeposit}
                  onChange={(e) => setNewDeposit(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[var(--nc-op-blue)] hover:bg-[var(--nc-op-blue-hover)] text-white font-bold rounded-xl transition-all"
              >
                {L('تأكيد وتسجيل العقد', 'Create lease')}
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                {L('إلغاء', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 2: Create Invoice Form ── */}
      {activeModal === 'create_invoice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateInvoice}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-op-blue)] border-b border-white/5 pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              {L('إصدار فاتورة ضريبية', 'Issue tax invoice')}
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">{L('رقم العقد:', 'Lease:')}</label>
              {prefilledContractId ? (
                <div className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] font-bold text-xs disabled:opacity-50">
                  {getLeaseDisplayNumber(selectedLease || undefined, displayLocale)}
                </div>
              ) : (
                <input 
                  type="text"
                  required
                  value={invLeaseId}
                  onChange={(e) => setInvLeaseId(e.target.value)}
                  placeholder={L("مثال: L-1001", "Example: L-1001")}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)] font-mono"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">{L('المبلغ قبل الضريبة (ر.س):', 'Subtotal before VAT (SAR):')}</label>
              <input 
                type="number"
                name="inv-subtotal"
                required
                value={invSubtotal || ''}
                onChange={(e) => setInvSubtotal(Number(e.target.value))}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
              />
            </div>

            <div className="space-y-1">
               <label className="text-[var(--nc-text-dim)] block">{L('نوع الضريبة:', 'VAT type:')}</label>
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
            </div>

            {invSubtotal > 0 && (
              <div className="bg-[var(--nc-surface)] border border-white/5 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--nc-text-dim)]">{L('قبل الضريبة:', 'Subtotal:')}</span>
                  <span className="text-[var(--nc-text-primary)]">{formatMoneyValue(invSubtotal, displayLocale)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--nc-text-dim)]">
                    {L('ضريبة', 'VAT')} ({invVatType === 'EXEMPT' ? 0 : invVatType === 'ZERO_RATED' ? 0 : 15}%):
                  </span>
                  <span className="text-warning">
                    {formatMoneyValue(invVatType === 'EXEMPT' || invVatType === 'ZERO_RATED' ? 0 : invSubtotal * 0.15, displayLocale)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-white/10">
                  <span className="text-[var(--nc-text-dim)]">{L('الإجمالي:', 'Total:')}</span>
                  <span className="text-emerald-400">
                    {formatMoneyValue(invVatType === 'EXEMPT' || invVatType === 'ZERO_RATED' ? invSubtotal : invSubtotal * 1.15, displayLocale)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <DateField 
                value={invDueDate}
                onChange={(val) => setInvDueDate(val)}
                label={L("تاريخ الاستحقاق", "Due date")}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[var(--nc-op-blue)] hover:bg-[var(--nc-op-blue-hover)] text-white font-bold rounded-xl transition-all"
              >
                 {L('إصدار الفاتورة الضريبية', 'Issue tax invoice')}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setPrefilledContractId('');
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                {L('إلغاء', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 3: Register Payment Form (Idempotency Key validation) ── */}
      {activeModal === 'register_payment' && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleRegisterPayment}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-op-blue)] border-b border-white/5 pb-2 flex items-center gap-2">
              <Key size={18} />
              {L('تسجيل دفعة يدوية للفاتورة', 'Record manual invoice payment')}
            </h3>
            <p className="flex items-center gap-1.5 text-[10px] text-warning bg-warning/5 border border-warning/10 px-2 py-1 rounded-lg mb-3">
              <AlertCircle size={12} className="shrink-0" />
              {L('هذا تسجيل داخلي للسداد ولا يمثل دفعًا إلكترونيًا عبر بوابة دفع.', 'This records an internal/manual payment and does not process an online gateway payment.')}
            </p>
            
            <div className="space-y-2 bg-[var(--nc-surface)] border border-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-[var(--nc-text-dim)]">{L('رقم الفاتورة:', 'Invoice:')}</span>
                <span className="text-white font-bold">{safeDisplayValue(selectedInvoice.invoiceLabel, displayLocale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--nc-text-dim)]">{L('القيمة الإجمالية المطلوبة:', 'Total due:')}</span>
                <span className="text-emerald-400 font-bold">{formatMoneyValue(selectedInvoice.totalAmount, displayLocale)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('طريقة التحصيل:', 'Collection method:')}</label>
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
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('رقم المرجع:', 'Reference number:')}</label>
                <input 
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={L("رقم الحوالة البنكية...", "Bank transfer reference...")}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-op-blue)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <DateField 
                value={payDate}
                onChange={(val) => setPayDate(val)}
                label={L("تاريخ الاستلام والتحصيل", "Collection date")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">{L('مفتاح تفادي التكرار:', 'Idempotency key:')}</label>
              <input 
                type="text"
                disabled
                value={payIdempotencyKey}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-dim)] outline-none font-mono text-[10px]"
              />
              <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{L('يمنع هذا المفتاح تكرار تسجيل عمليات السداد عند الضغط المتكرر.', 'This key prevents duplicate payment registration on repeated clicks.')}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                disabled={isPaying}
                className="flex-1 py-2.5 bg-[var(--nc-op-blue)] hover:bg-[var(--nc-op-blue-hover)] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaying ? L('جاري التسجيل...', 'Recording...') : L('تأكيد التحصيل والتسوية', 'Confirm collection')}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                {L('إلغاء', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

    </ContractsPaymentsShell>
  );
}




