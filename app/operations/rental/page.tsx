'use client';
import { toast } from '@/app/context/ToastContext';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { displayPerson, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

import React, { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Calculator, Megaphone, Plus, Search, Eye,
  Landmark, ChevronRight, AlertCircle, FileCheck, ArrowRight,
  UserCheck, CloudUpload, Key, Trash2, Settings, Bot, Clock, HelpCircle, CheckCircle2, QrCode, Download
} from 'lucide-react';
import { DateField } from '@/components/ui/DateField';
import { useAuth } from '@/app/context/AuthContext';
import { Button, Card } from '@/components/ui/orca-components';
import PageHeader from '@/components/ui/PageHeader';
import SalesContractsPanel from '@/components/sales/SalesContractsPanel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { MoneyCell } from '@/components/ui/orca-table/cells/MoneyCell';
import { DateCell } from '@/components/ui/orca-table/cells/DateCell';
import { StatusCell } from '@/components/ui/orca-table/cells/StatusCell';
import { formatLeaseStatus, formatInvoiceStatus } from '@/lib/ui-status';
import { formatCurrency, formatShortId } from '@/lib/ui-formatters';
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
  invoiceId: string;
  date: string;     // YYYY-MM-DD
  amount: number;
  method: string;
  ref?: string;
}

interface Settlement {
  id: string;
  contractId: string;
  gross: number;
  deductions: number;
  net: number;
  status: 'pending' | 'completed';
}

interface EventLog {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  note?: string;
}

// ─── Initial Mock Data ──────────────────────────────────────────────────────
const initialLeases: Lease[] = [
  { id: 'L-1001', unit: 'A-101', tenant: 'محمد العلي', start: '2026-01-01', end: '2026-12-31', rent: 12000, currency: 'SAR', status: 'active', deposit: 3000, financialRef: null },
  { id: 'L-1002', unit: 'B-201', tenant: 'سارة الأحمد', start: '2025-07-01', end: '2026-06-30', rent: 45000, currency: 'SAR', status: 'expired', deposit: 5000, financialRef: 'FS-3001' },
  { id: 'L-1003', unit: 'C-301', tenant: 'شركة النخبة', start: '2026-03-01', end: '2027-02-28', rent: 25000, currency: 'SAR', status: 'active', deposit: 5000, financialRef: null }
];

const initialInvoices: Invoice[] = []; // Loaded from API

const initialPayments: Payment[] = [];
const initialSettlements: Settlement[] = [];
const initialEvents: EventLog[] = [];
const CONTRACTS_PAGE_SIZE = 6;
const DETAIL_TAB_PAGE_SIZE = 4;
const INVOICES_PAGE_SIZE = 8;


type RentalLocale = DisplayLocale;

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

function displayEnumSafe(value: unknown, enumType: string, locale: RentalLocale): string | null {
  return cleanDisplayCandidate(displayEnum(String(value || 'UNSPECIFIED'), enumType as any, locale), value, locale);
}

function leaseStatusLabel(status: Lease['status'] | string, locale: RentalLocale): string {
  const fromDisplay = displayEnumSafe(status, 'leaseStatus', locale) || displayEnumSafe(status, 'rentalStatus', locale);
  if (fromDisplay) return fromDisplay;
  switch (String(status).toLowerCase()) {
    case 'active': return textFor(locale, 'نشط', 'Active');
    case 'expired': return textFor(locale, 'منتهي', 'Expired');
    case 'terminated': return textFor(locale, 'ملغى', 'Terminated');
    default: return textFor(locale, 'حالة غير محددة', 'Unspecified');
  }
}

function leaseStatusBadgeClass(status: Lease['status'] | string): string {
  switch (String(status).toLowerCase()) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'expired': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default: return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  }
}

function invoiceStatusLabel(status: Invoice['status'] | string, locale: RentalLocale): string {
  const fromDisplay = displayEnumSafe(status, 'invoiceStatus', locale);
  if (fromDisplay) return fromDisplay;
  switch (String(status).toLowerCase()) {
    case 'paid': return textFor(locale, 'مدفوعة', 'Paid');
    case 'overdue': return textFor(locale, 'متأخرة', 'Overdue');
    case 'unpaid': return textFor(locale, 'غير مدفوعة', 'Unpaid');
    default: return textFor(locale, 'حالة غير محددة', 'Unspecified');
  }
}

function invoiceStatusBadgeClass(status: Invoice['status'] | string): string {
  switch (String(status).toLowerCase()) {
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'overdue': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default: return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  }
}

function settlementStatusLabel(status: Settlement['status'] | string, locale: RentalLocale): string {
  switch (String(status).toLowerCase()) {
    case 'completed': return textFor(locale, 'مكتملة', 'Completed');
    case 'pending': return textFor(locale, 'قيد المعالجة', 'Pending');
    default: return textFor(locale, 'حالة غير محددة', 'Unspecified');
  }
}

function paymentMethodLabel(method: string, locale: RentalLocale): string {
  switch (String(method).toLowerCase()) {
    case 'bank': return textFor(locale, 'تحويل بنكي', 'Bank transfer');
    case 'card': return textFor(locale, 'بطاقة', 'Card');
    case 'cash': return textFor(locale, 'نقدي', 'Cash');
    default: return emptyValue(locale);
  }
}

function vatTypeLabel(type: string, locale: RentalLocale): string {
  switch (String(type).toUpperCase()) {
    case 'STANDARD': return textFor(locale, 'ضريبة 15%', 'VAT 15%');
    case 'ZERO_RATED': return textFor(locale, 'صفرية', 'Zero-rated');
    case 'EXEMPT': return textFor(locale, 'معفاة', 'Exempt');
    default: return emptyValue(locale);
  }
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

export default function RentalPage() {
  const { lang } = useApp();
  const isRTL = lang === 'AR';
  const displayLocale: RentalLocale = isRTL ? 'ar' : 'en';
  const L = (ar: string, en: string) => textFor(displayLocale, ar, en);
  const [mounted, setMounted] = useState(false);
  const [activePane, setActivePane] = useState<'dashboard' | 'leases' | 'sales' | 'invoices' | 'reconciliation' | 'settlements'>('leases');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
  
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [invoicePage, setInvoicePage] = useState(0);

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

  // Reconciliation Upload mock state
  const [bankFileLoaded, setBankFileLoaded] = useState(false);
  const [reconcileMatches, setReconcileMatches] = useState<any[]>([]);
  const [reconcileExceptions, setReconcileExceptions] = useState<any[]>([]);

  const { hasPermission } = useAuth();
  // Permission check — delegated to AuthContext
  const isAllowed = (action: string) => hasPermission(action);

  const [enableCompliance, setEnableCompliance] = useState(false);

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

  // Fetch leases & invoices from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const [leasesRes, invoicesRes] = await Promise.all([
          fetch('/api/v1/leases/'),
          fetch('/api/v1/invoices/'),
        ]);
        if (leasesRes.ok) { const json = await leasesRes.json(); if (json.success) setLeases(json.leases); }
        if (invoicesRes.ok) { const json = await invoicesRes.json(); if (json.success) setInvoices(json.invoices); }
        addTelemetryEvent('api.data_loaded', { leases: true, invoices: true });
      } catch (err: any) {
        setFetchError(err.message);
        addTelemetryEvent('api.error', { error: err.message });
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
  const collectedThisMonth = payments.reduce((acc, p) => acc + p.amount, 0);
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
      alert('عذراً، لا تملك صلاحية إنشاء عقد جديد.');
      return;
    }

    if (!newStart || !newEnd || !newUnit || !newTenant) {
      alert('يرجى تعبئة جميع الحقول الإجبارية.');
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
      alert('خطأ في إنشاء العقد: ' + err.message);
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
    alert('تم تسجيل العقد الجديد بنجاح!');
  };

  const handleLeaseDocumentUpload = () => {
    toast.info('نظام رفع مستندات العقود قيد التطوير. سيُتاح في التحديث القادم.');
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
      alert('عذراً، لا تملك صلاحية إصدار فواتير.');
      return;
    }

    const leaseId = invLeaseId || prefilledContractId;
    if (!leaseId || !invDueDate || invSubtotal <= 0) {
      alert('يرجى التحقق من المدخلات.');
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
      alert('خطأ في إصدار الفاتورة: ' + err.message);
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
    alert('تم إصدار الفاتورة بنجاح!');
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!isAllowed('PAY_INVOICE')) {
      toast.error('عذراً، لا تملك صلاحية تسجيل الدفعات.');
      return;
    }

    if (!payDate || !payIdempotencyKey) {
      toast.error('يرجى تحديد تاريخ السداد وإدخال مفتاح تفادي التكرار (Idempotency Key).');
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

      // Refresh data
      const invoicesRes = await fetch('/api/v1/invoices/');
      if (invoicesRes.ok) {
        const json = await invoicesRes.json();
        if (json.success) setInvoices(json.invoices);
      }

      toast.success(data.message || 'تم تسجيل الدفعة بنجاح');

      // Reset
      setPayRef('');
      setPayDate('');
      setPayIdempotencyKey('idemp-' + Math.floor(100000 + Math.random() * 900000));
      setSelectedInvoice(null);
      setActiveModal(null);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsPaying(false);
    }
  };

  const handleRequestSettlement = (_contractId: string, _amount: number) => {
    toast.info('نظام التسويات المالية قيد التطوير. سيُتاح في التحديث القادم.');
  };

  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    toast.info('نظام المطابقة البنكية قيد التطوير. سيُتاح في التحديث القادم.');
  };

  const handleConfirmReconcileMatch = (_match: any) => {
    toast.info('نظام المطابقة البنكية قيد التطوير. سيُتاح في التحديث القادم.');
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

  const filteredInvoices = invoices.filter(i => {
    const matchSearch = !invoiceSearch || `${i.id} ${i.contractId}`.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = !invoiceStatusFilter || i.status === invoiceStatusFilter;
    return matchSearch && matchStatus;
  });

  const invoiceTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / INVOICES_PAGE_SIZE));
  const normalizedInvoicePage = Math.min(invoicePage, invoiceTotalPages - 1);
  const pagedInvoices = filteredInvoices.slice(
    normalizedInvoicePage * INVOICES_PAGE_SIZE,
    normalizedInvoicePage * INVOICES_PAGE_SIZE + INVOICES_PAGE_SIZE,
  );
  const invoiceRangeStart = filteredInvoices.length === 0 ? 0 : normalizedInvoicePage * INVOICES_PAGE_SIZE + 1;
  const invoiceRangeEnd = Math.min((normalizedInvoicePage + 1) * INVOICES_PAGE_SIZE, filteredInvoices.length);

  const selectedLeaseInvoices = selectedLease ? invoices.filter(i => i.contractId === selectedLease.id) : [];
  const selectedLeaseInvoiceIds = new Set(selectedLeaseInvoices.map(i => i.id));
  const selectedLeasePayments = selectedLease ? payments.filter(p => selectedLeaseInvoiceIds.has(p.invoiceId)) : [];
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
    setInvoicePage(0);
  }, [invoiceSearch, invoiceStatusFilter]);

  useEffect(() => {
    setDetailTabPages({});
  }, [selectedLeaseId]);

  useEffect(() => {
    if (leasePage > leaseTotalPages - 1) {
      setLeasePage(leaseTotalPages - 1);
    }
  }, [leasePage, leaseTotalPages]);

  useEffect(() => {
    if (invoicePage > invoiceTotalPages - 1) {
      setInvoicePage(invoiceTotalPages - 1);
    }
  }, [invoicePage, invoiceTotalPages]);


  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpisContent = (
    <>
      <div className="nc-card-elevated p-5">
        <div className="flex items-start mb-3">
          <div className="flex-1">
            <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{L('المستحقات المفوترة', 'Billed receivables')}</p>
            <h3 className="nc-metric-lg font-black text-[var(--nc-text-primary)]">{formatMoneyValue(totalReceivables, displayLocale)}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent-text)]">
            <FileText size={18} />
          </div>
        </div>
        <p className="text-[9px] text-[var(--nc-text-dim)]">{L('إجمالي الفواتير الصادرة', 'Total issued invoices')}</p>
      </div>
      <div className="nc-card-elevated p-5">
        <div className="flex items-start mb-3">
          <div className="flex-1">
            <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{L('متأخرات السداد', 'Overdue payments')}</p>
            <h3 className="nc-metric-lg font-black text-[var(--nc-foreground)]">{formatMoneyValue(totalOverdue, displayLocale)}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle size={18} />
          </div>
        </div>
        <p className="text-[9px] text-[var(--nc-text-dim)]">{L('مستحقات تجاوزت تاريخ الاستحقاق', 'Receivables past due date')}</p>
      </div>
      <div className="nc-card-elevated p-5">
        <div className="flex items-start mb-3">
          <div className="flex-1">
            <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{L('محصل هذا الشهر', 'Collected this month')}</p>
            <h3 className="nc-metric-lg font-black text-[var(--nc-foreground)]">{formatMoneyValue(collectedThisMonth, displayLocale)}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <p className="text-[9px] text-[var(--nc-text-dim)]">{L('إجمالي التحصيلات خلال الشهر الحالي', 'Total collections this month')}</p>
      </div>
      <div className="nc-card-elevated p-5">
        <div className="flex items-start mb-3">
          <div className="flex-1">
            <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{L('تسويات معلقة', 'Pending settlements')}</p>
            <h3 className="nc-metric-lg font-black text-cyan-400">{pendingSettlementsCount}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Landmark size={18} />
          </div>
        </div>
        <p className="text-[9px] text-[var(--nc-text-dim)]">{L('تسويات مالية غير مؤكدة بعد', 'Financial settlements not confirmed yet')}</p>
      </div>
    </>
  );

  const actionsContent = (
    <Card className="p-5 space-y-4 flex flex-col">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Plus size={16} className="text-[var(--nc-text-secondary)]" />
          {L('إجراءات سريعة', 'Quick actions')}
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">{L('إضافة عقود وفواتير جديدة', 'Add leases and invoices')}</p>
      </div>
      <div className="space-y-3 pt-2">
        <div className="space-y-3">
          <Button
            onClick={() => {
              if (!isAllowed("CREATE_LEASE")) { alert("عذراً، لا تملك الصلاحية لإضافة عقد جديد."); return; }
              setActiveModal("new_lease");
            }}
            className="w-full py-2 text-xs font-bold flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus size={16} />
            {L('عقد إيجار جديد', 'New lease')}
          </Button>
          <button
            onClick={() => {
              if (!isAllowed("CREATE_INVOICE")) { alert("عذراً، لا تملك الصلاحية لإصدار فواتير."); return; }
              setActiveModal("new_invoice");
            }}
            className="w-full py-2 bg-[var(--nc-surface-solid)] border border-white/10 hover:border-[var(--nc-accent-border)] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 min-h-[44px]"
          >
            <Plus size={13} />
             {L('إصدار فاتورة (تسجيل يدوي)', 'Issue invoice (manual)')}
          </button>
        </div>
      </div>
    </Card>
  );

  const insightsContent = (
    <Card className="p-5 space-y-4 flex flex-col">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot size={16} className="text-cyan-400" />
          {L('التنبيهات الذكية', 'Smart alerts')}
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">{L('إشعارات عاجلة وإجراءات مقترحة', 'Urgent alerts and recommended actions')}</p>
      </div>
      <div className="space-y-3 text-xs">
        {overdueInvoicesCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-rose-300">{L(`${formatNumberValue(overdueInvoicesCount, displayLocale)} فواتير متأخرة تجاوزت تاريخ الاستحقاق`, `${formatNumberValue(overdueInvoicesCount, displayLocale)} overdue invoices`)}</p>
          </div>
        )}
        {expiredLeasesCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[var(--nc-text-secondary)]">{L(`${formatNumberValue(expiredLeasesCount, displayLocale)} عقود إيجارية منتهية تحتاج تجديد`, `${formatNumberValue(expiredLeasesCount, displayLocale)} expired leases need renewal`)}</p>
          </div>
        )}
        {pendingSettlementsCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <Landmark size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-cyan-300">{L(`${formatNumberValue(pendingSettlementsCount, displayLocale)} طلبات تسوية مالية معلقة`, `${formatNumberValue(pendingSettlementsCount, displayLocale)} pending settlements`)}</p>
          </div>
        )}
        {overdueInvoicesCount === 0 && expiredLeasesCount === 0 && pendingSettlementsCount === 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-emerald-300">{L('لا توجد تنبيهات عاجلة', 'No urgent alerts')}</p>
          </div>
        )}
        <div className="border-t border-white/5 pt-3 space-y-2">
          <p className="text-[var(--nc-text-dim)] font-bold text-[10px] uppercase tracking-wider">{L('إجراءات ذكية', 'Smart actions')}</p>
              <button
                disabled
                className="w-full py-1.5 text-[10px] font-bold text-[var(--nc-text-disabled)] border border-[var(--nc-glass-border)] rounded-lg cursor-not-allowed min-h-[44px]"
                title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
              >
                {L("إرسال تنبيهات سداد (قيد الربط)", "Send Payment Reminders (pending)")}
              </button>
              <button
                disabled
                className="w-full py-1.5 text-[10px] font-bold text-[var(--nc-text-disabled)] border border-[var(--nc-glass-border)] rounded-lg cursor-not-allowed min-h-[44px]"
                title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
              >
                {L("تشغيل مصالحة بنكية (قيد الربط)", "Run Bank Reconciliation (pending)")}
              </button>
        </div>
      </div>
    </Card>
  );

  const compactOperationsStrip = (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="h-fit rounded-2xl border border-white/10 bg-[var(--nc-surface-strong)] px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-[var(--nc-text-secondary)]" />
            <h4 className="text-sm font-black text-white">{L('إجراءات سريعة', 'Quick actions')}</h4>
          </div>
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('إضافة عقود وفواتير', 'Add leases and invoices')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isAllowed("CREATE_LEASE")) { alert("عذراً، لا تملك الصلاحية لإضافة عقد جديد."); return; }
              setActiveModal("new_lease");
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8EB1D1] px-3 py-2 text-[11px] font-black text-[#1e293b] transition-colors hover:bg-[#A7C7E7]"
          >
            <Plus size={13} />
            {L('عقد إيجار جديد', 'New lease')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isAllowed("CREATE_INVOICE")) { alert("عذراً، لا تملك الصلاحية لإصدار فواتير."); return; }
              setActiveModal("new_invoice");
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[var(--nc-surface-solid)] px-3 py-2 text-[11px] font-black text-white transition-all hover:border-[var(--nc-accent-border)]"
          >
            <Plus size={13} />
            {L('إصدار فاتورة (تسجيل يدوي)', 'Issue invoice (manual)')}
          </button>
        </div>
      </div>

      <div className="h-fit rounded-2xl border border-white/10 bg-[var(--nc-surface-strong)] px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-cyan-400" />
            <h4 className="text-sm font-black text-white">{L('التنبيهات الذكية', 'Smart alerts')}</h4>
          </div>
          <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{L('تنبيهات وإجراءات مقترحة', 'Alerts and recommended actions')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {overdueInvoicesCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 font-bold text-rose-300">
              <AlertCircle size={12} />
              {L(`${formatNumberValue(overdueInvoicesCount, displayLocale)} فواتير متأخرة`, `${formatNumberValue(overdueInvoicesCount, displayLocale)} overdue invoices`)}
            </span>
          )}
          {expiredLeasesCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-bold text-[var(--nc-text-secondary)]">
              <Clock size={12} />
              {L(`${formatNumberValue(expiredLeasesCount, displayLocale)} عقود تحتاج تجديد`, `${formatNumberValue(expiredLeasesCount, displayLocale)} leases need renewal`)}
            </span>
          )}
          {pendingSettlementsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 font-bold text-cyan-300">
              <Landmark size={12} />
              {L(`${formatNumberValue(pendingSettlementsCount, displayLocale)} تسويات معلقة`, `${formatNumberValue(pendingSettlementsCount, displayLocale)} pending settlements`)}
            </span>
          )}
          {overdueInvoicesCount === 0 && expiredLeasesCount === 0 && pendingSettlementsCount === 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
              <CheckCircle2 size={12} />
              {L('لا توجد تنبيهات عاجلة', 'No urgent alerts')}
            </span>
          )}
          <button
            disabled
            className="rounded-lg border border-[var(--nc-glass-border)] px-2.5 py-1 font-bold text-[var(--nc-text-disabled)] opacity-70"
            title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
          >
            {L("إرسال تنبيهات سداد (قيد الربط)", "Send Payment Reminders (pending)")}
          </button>
          <button
            disabled
            className="rounded-lg border border-[var(--nc-glass-border)] px-2.5 py-1 font-bold text-[var(--nc-text-disabled)] opacity-70"
            title={isRTL ? "قيد الربط المحاسبي" : "Accounting integration pending"}
          >
            {L("تشغيل مصالحة بنكية (قيد الربط)", "Run Bank Reconciliation (pending)")}
          </button>
        </div>
      </div>
    </section>
  );

  // Details content: Tab bar + Panes
  const detailsContent = (
    <div className="space-y-4">
      {/* ── Tab Bar ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'leases', name: L('📄 عقود الإيجار', '📄 Rental leases') },
          { id: 'sales', name: L('✍️ عقود البيع', '✍️ Sales contracts') },
          { id: 'invoices', name: L('🧾 الفواتير', '🧾 Invoices') },
          { id: 'reconciliation', name: L('🏦 المصالحة البنكية', '🏦 Bank reconciliation') },
          { id: 'settlements', name: L('💰 التسويات', '💰 Settlements') }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => startTransition(() => setActivePane(t.id as any))}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePane === t.id
                ? 'bg-[var(--nc-accent)] text-[#1e293b] shadow-sm'
                : 'bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] hover:border-[var(--nc-accent-border)]'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* ── Panes Render ── */}

      {isPending ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[var(--nc-foreground-muted)] font-bold">{L('جاري تحميل بيانات القسم...', 'Loading section data...')}</span>
        </div>
      ) : (
        <div className="orca-view-enter">
          
          {/* ── Pane 1: Leases (Master-Detail) ── */}
          {activePane === 'leases' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Leases List (Master) */}
              <div className="h-fit w-full lg:w-[45%] bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden fade-in-up">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                  <span className="text-sm font-bold text-white">{L('قائمة عقود الإيجار', 'Leases list')}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (!isAllowed('CREATE_LEASE')) {
                          alert('عذراً، لا تملك الصلاحية لإضافة عقد جديد.');
                          return;
                        }
                        setActiveModal('new_lease');
                      }}
                      className="px-3 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-[#1e293b] text-[11px] font-black rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      {L('عقد جديد', 'New lease')}
                    </button>
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
                  <select
                    value={leaseStatusFilter}
                    aria-label={L("تصفية حالة العقد", "Filter lease status")}
                    onChange={(e) => setLeaseStatusFilter(e.target.value)}
                    className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">{L('كل الحالات', 'All statuses')}</option>
                    <option value="active">{L('نشط', 'Active')}</option>
                    <option value="expired">{L('منتهي', 'Expired')}</option>
                    <option value="terminated">{L('ملغى', 'Terminated')}</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
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
                          <td colSpan={5} className="py-12 text-center text-xs font-medium text-[var(--nc-text-dim)]">
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
                                  : 'hover:bg-[var(--nc-surface-soft)]'
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
              <div className="h-fit flex-1 w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="p-5 max-h-[560px] overflow-y-auto">
                {!selectedLease ? (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-[var(--nc-surface)]/50 px-4 py-5 text-right text-[var(--nc-text-dim)] text-xs">
                    <Landmark size={20} className="mt-0.5 shrink-0 text-slate-600" />
                    <span>{L('اختر عقدًا من القائمة لعرض تفاصيله.', 'Select a lease from the list to view details.')}</span>
                  </div>
                ) : (
                  <div className="space-y-4 text-right">
                    
                    {/* Detail Panel Header */}
                    <div className="space-y-3 border-b border-white/5 pb-4">
                      <div className="flex flex-col items-start gap-1.5">
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (!isAllowed('CREATE_INVOICE')) {
                              alert('لا تملك صلاحية إصدار فواتير.');
                              return;
                            }
                            setPrefilledContractId(selectedLease.id);
                            setInvSubtotal(selectedLease.rent);
                            setInvVatType('STANDARD');
                            setActiveModal('create_invoice');
                          }}
                          className="px-2.5 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-[#1e293b] text-[11px] font-black rounded-lg transition-all border border-white/10"
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
                    <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-2">
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
                              ? 'bg-[#8EB1D1] text-[#1e293b] shadow-sm' 
                              : 'bg-[var(--nc-surface)] dark:bg-white/5 border border-white/10 text-[var(--nc-text-dim)] hover:text-white'
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                          <div className="text-[11px] text-[var(--nc-text-dim)] flex items-center gap-1 pt-2 font-mono">
                            <span>{L('المرجع المالي للتسوية:', 'Settlement reference:')}</span>
                            <span className="text-cyan-400 font-bold">{selectedLease.financialRef ? safeDisplayValue(selectedLease.financialRef, displayLocale) : L('لا توجد تسويات جارية لهذا العقد حالياً', 'No active settlement for this lease')}</span>
                          </div>
                        </div>
                      )}

                      {/* Invoices Tab */}
                      {detailActiveTab === 'invoices' && (
                        <div className="overflow-x-auto">
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
                                          : 'bg-amber-500/20 text-amber-400'
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
                        <div className="overflow-x-auto space-y-4">
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
                                  : 'bg-amber-500/20 text-amber-400';
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
                        <div className="overflow-x-auto">
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
                                        : 'bg-amber-500/20 text-amber-400'
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
                                <div className="absolute right-[-21px] top-1 w-2 h-2 rounded-full bg-[#8EB1D1]"></div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--nc-text-dim)]">
                                  <span className="font-bold text-slate-200">{getEventLabel(evt.type)}</span>
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

          {/* ── Pane 3: Invoices ── */}
          {activePane === 'invoices' && (
            <div className="bg-[var(--nc-surface-strong)] border border-white/5 rounded-2xl overflow-hidden fade-in-up">
              <div className="p-4 border-b border-white/5 bg-[var(--nc-surface-solid)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{L('جدول الفواتير الصادرة', 'Issued invoices table')}</h3>
                  <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{L('تصفية ومتابعة الفواتير المحصلة والمعلقة', 'Filter and track paid and pending invoices')}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-2 text-[var(--nc-text-dim)]" size={13} />
                    <input 
                      type="text"
                      placeholder={L("بحث برقم الفاتورة أو العقد...", "Search by invoice or lease...")}
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white outline-none w-52 focus:border-[#8EB1D1]/40"
                    />
                  </div>
                  <select
                    value={invoiceStatusFilter}
                    aria-label={L("تصفية حالة الفاتورة", "Filter invoice status")}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="">{L('كل الحالات', 'All statuses')}</option>
                    <option value="unpaid">{L('غير مدفوعة', 'Unpaid')}</option>
                    <option value="paid">{L('مدفوعة', 'Paid')}</option>
                    <option value="overdue">{L('متأخرة', 'Overdue')}</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
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
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="!py-8 text-center text-xs font-medium text-[var(--nc-text-dim)]">
                          {L('لا توجد فواتير مطابقة', 'No matching invoices')}
                        </td>
                      </tr>
                    ) : (
                      pagedInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="!py-2 font-bold text-white text-xs whitespace-nowrap truncate max-w-[160px]">
                            {safeDisplayValue(inv.invoiceLabel, displayLocale)}
                          </td>
                          <td className="!py-2 text-xs min-w-[140px]">
                            <div className="text-white truncate max-w-[140px]">{displayPersonSafe(inv.customerName, displayLocale)}</div>
                            <div className="text-[var(--nc-text-dim)] text-[10px] truncate max-w-[140px]">{displayEntitySafe(inv.unitName, 'unit', displayLocale)}</div>
                          </td>
                          <td className="!py-2 font-mono text-[var(--nc-text-dim)] text-xs whitespace-nowrap">
                            <DateCell value={inv.due} />
                          </td>
                          <td className="!py-2 font-bold text-white text-xs whitespace-nowrap">
                            <MoneyCell amount={inv.totalAmount} />
                          </td>
                          <td className="!py-2 whitespace-nowrap">
                            <span className={`inline-flex min-w-[82px] justify-center rounded-full px-2.5 py-1 text-[10px] font-black ${invoiceStatusBadgeClass(inv.status)}`}>
                              {invoiceStatusLabel(inv.status, displayLocale)}
                            </span>
                          </td>
                          <td className="!py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.status !== 'paid' && (
                                <>
                                  <button
                                    onClick={() => { setSelectedInvoice(inv); setPayDate(new Date().toISOString().split('T')[0]); setActiveModal('register_payment'); }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--nc-surface)] border border-[var(--nc-op-blue)]/20 hover:border-[var(--nc-op-blue)]/40 text-[var(--nc-op-blue)] rounded text-[10px] font-bold transition-all"
                                  >
                                    {L('تسجيل سداد', 'Record payment')}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const nextInstallment = [...(inv.installments || [])]
                                          .filter(inst => ['Pending', 'Partial', 'Overdue'].includes(inst.paymentStatus))
                                          .sort((left, right) => {
                                            const dateOrder = String(left.dueDate || '').localeCompare(String(right.dueDate || ''));
                                            if (dateOrder !== 0) return dateOrder;
                                            return Number(left.installmentNumber || 0) - Number(right.installmentNumber || 0);
                                          })[0];

                                        if (!nextInstallment) {
                                          alert(L('لا يوجد قسط مستحق قابل للدفع لهذه الفاتورة', 'No collectible installment is due for this invoice'));
                                          return;
                                        }

                                        const installmentId = nextInstallment.id;
                                        const res = await fetch(`/api/v1/installments/${installmentId}/pay/ngenius`, {
                                          method: 'POST',
                                          credentials: 'include'
                                        });

                                        if (!res.ok) {
                                          const data = await res.json();
                                          alert(data.error || L('فشل إنشاء رابط الدفع', 'Failed to create payment link'));
                                          return;
                                        }

                                        const data = await res.json();
                                        if (data.success && data.redirectUrl) {
                                          window.location.assign(data.redirectUrl);
                                        } else {
                                          alert(data.error || L('فشل إنشاء رابط الدفع', 'Failed to create payment link'));
                                        }
                                      } catch {
                                        alert(L('تعذر إنشاء رابط الدفع. تحقق من الاتصال أو إعدادات N-Genius.', 'Could not create payment link. Check the connection or N-Genius settings.'));
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--nc-surface)] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded text-[10px] font-bold transition-all"
                                  >
                                    {L('دفع القسط التالي', 'Pay next installment')}
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => window.open(`/api/v1/invoices/${inv.id}/pdf`, '_blank')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] hover:border-slate-500 text-[var(--nc-text-dim)] hover:text-[var(--nc-text-primary)] rounded text-[10px] font-bold transition-all"
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

              {filteredInvoices.length > INVOICES_PAGE_SIZE && (
                <div className="flex flex-col gap-2 border-t border-[var(--nc-glass-border)] px-4 py-3 text-xs text-[var(--nc-text-dim)] sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-bold">
                    {formatNumberValue(invoiceRangeStart, displayLocale)}-{formatNumberValue(invoiceRangeEnd, displayLocale)} {L('من', 'of')} {formatNumberValue(filteredInvoices.length, displayLocale)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInvoicePage((current) => Math.max(0, current - 1))}
                      disabled={normalizedInvoicePage === 0}
                      className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {L('السابق', 'Previous')}
                    </button>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[var(--nc-foreground)]">
                      {L('صفحة', 'Page')} {formatNumberValue(normalizedInvoicePage + 1, displayLocale)} {L('من', 'of')} {formatNumberValue(invoiceTotalPages, displayLocale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInvoicePage((current) => Math.min(invoiceTotalPages - 1, current + 1))}
                      disabled={normalizedInvoicePage >= invoiceTotalPages - 1}
                      className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-1.5 font-bold text-[var(--nc-foreground)] transition-colors hover:bg-[var(--nc-surface-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {L('التالي', 'Next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Pane 3: Reconciliation (المصالحة البنكية) ── */}
          {activePane === 'reconciliation' && (
            <div className="bg-[var(--nc-surface-strong)] border border-white/5 rounded-2xl overflow-hidden fade-in-up">
              <div className="p-4 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                <h3 className="text-sm font-bold text-white">{L('أداة المصالحة البنكية الفورية', 'Instant bank reconciliation')}</h3>
                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{L('تطابق وتدقيق الحسابات البنكية مع فواتير الإيجارات', 'Match and audit bank transactions against rental invoices')}</p>
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <i className="ph-bold ph-flask text-rose-400 text-sm"></i>
                  <span className="text-[10px] font-bold text-rose-400">{L('قيد الربط المحاسبي — للمراجعة الداخلية', 'Accounting integration pending — internal review')}</span>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="border border-dashed border-white/10 p-8 rounded-2xl text-center space-y-3 bg-[var(--nc-surface)] dark:bg-white/5">
                  <CloudUpload className="mx-auto text-[#8EB1D1]/70" size={32} />
                  <div className="text-xs text-[var(--nc-text-dim)]">{L('قم برفع ملف الحساب البنكي (.csv / .xls) للمطابقة', 'Upload a bank statement file (.csv / .xls) for matching')}</div>
                  <input
                    type="file"
                    onChange={handleBankFileUpload}
                    className="mx-auto block text-xs text-[var(--nc-text-dim)] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[var(--nc-surface)] file:text-[var(--nc-text-dim)] file:cursor-pointer"
                  />
                </div>

                {bankFileLoaded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        {L('المطابقات المقترحة', 'Match recommendations')}
                      </h4>

                      {reconcileMatches.map((match, idx) => (
                        <div key={idx} className="bg-[var(--nc-surface)] dark:bg-white/5 border border-emerald-500/20 p-4 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between font-bold text-white">
                            <span>{L('رقم المعاملة:', 'Transaction:')} {safeDisplayValue(match.transactionId, displayLocale)}</span>
                            <span className="text-emerald-400">{formatMoneyValue(match.amount, displayLocale)}</span>
                          </div>
                          <p className="text-[var(--nc-text-dim)] text-[11px]">{safeDisplayValue(match.note, displayLocale)}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                            <span className="text-[10px] text-[var(--nc-text-dim)]">{L('الفاتورة المقترحة:', 'Suggested invoice:')} {safeDisplayValue(match.invoiceId, displayLocale)}</span>
                            <button
                              onClick={() => handleConfirmReconcileMatch(match)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition-all"
                            >
                              {L('تأكيد وتسوية المطابقة', 'Confirm and settle match')}
                            </button>
                          </div>
                        </div>
                      ))}
                      {reconcileMatches.length === 0 && <p className="text-[11px] text-[var(--nc-text-dim)]">{L('لا توجد مطابقات مقترحة معلقة.', 'No pending match recommendations.')}</p>}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        {L('قائمة الاستثناءات والعمليات غير المعرفة', 'Exceptions and unidentified transactions')}
                      </h4>

                      {reconcileExceptions.map((ex, idx) => (
                        <div key={idx} className="bg-[var(--nc-surface)] dark:bg-white/5 border border-rose-500/20 p-4 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between font-bold text-white">
                            <span>{L('رقم المعاملة:', 'Transaction:')} {safeDisplayValue(ex.transactionId, displayLocale)}</span>
                            <span className="text-rose-400">{formatMoneyValue(ex.amount, displayLocale)}</span>
                          </div>
                          <p className="text-[var(--nc-text-dim)] text-[11px]">{safeDisplayValue(ex.note, displayLocale)}</p>
                          <div className="flex justify-end pt-2 border-t border-slate-900">
                            <button
                              onClick={() => {
                                alert(L('تحويل المعاملة للفحص اليدوي من قبل قسم المالية.', 'The transaction was sent to finance for manual review.'));
                                addTelemetryEvent('reconciliation.exception_checked', { transactionId: ex.transactionId });
                              }}
                              className="px-2.5 py-1 bg-[var(--nc-surface)] border border-slate-700 hover:border-slate-500 text-[var(--nc-text-dim)] rounded text-[10px] font-bold transition-all"
                            >
                              {L('تحديد يدوي / فحص', 'Manual review')}
                            </button>
                          </div>
                        </div>
                      ))}
                      {reconcileExceptions.length === 0 && <p className="text-[11px] text-[var(--nc-text-dim)]">{L('قائمة الاستثناءات فارغة.', 'The exceptions list is empty.')}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Pane 4: Settlements (التسويات والـ Payouts) ── */}
          {activePane === 'settlements' && (
            <div className="bg-[var(--nc-surface-strong)] border border-white/5 rounded-2xl overflow-hidden fade-in-up">
              <div className="p-4 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                <h3 className="text-sm font-bold text-white">{L('سجل تسويات إيرادات الملاك', 'Owner revenue settlements')}</h3>
                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{L('تتبع الحوالات الموجهة لحسابات الملاك بعد استقطاع الرسوم', 'Track owner transfers after fee deductions')}</p>
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <i className="ph-bold ph-flask text-rose-400 text-sm"></i>
                  <span className="text-[10px] font-bold text-rose-400">{L('قيد الربط المحاسبي — للمراجعة الداخلية', 'Accounting integration pending — internal review')}</span>
                </div>
              </div>
              <div className="p-6 space-y-4">

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--nc-surface-solid)] border-y border-white/5 text-[var(--nc-text-dim)] text-[11px] font-bold">
                      <th className="py-3 px-4">{L('رقم التسوية', 'Settlement')}</th>
                      <th className="py-3 px-4">{L('رقم العقد', 'Lease')}</th>
                      <th className="py-3 px-4">{L('المبلغ الإجمالي', 'Gross amount')}</th>
                      <th className="py-3 px-4">{L('خصومات إدارية (10%)', 'Admin deductions (10%)')}</th>
                      <th className="py-3 px-4">{L('صافي المالك', 'Owner net')}</th>
                      <th className="py-3 px-4 text-center">{L('الحالة', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s, index) => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white font-mono text-xs">{L('تسوية', 'Settlement')} {formatNumberValue(index + 1, displayLocale)}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400 text-xs">{safeDisplayValue(s.contractId, displayLocale)}</td>
                        <td className="py-3.5 px-4 text-[var(--nc-text-dim)]">{formatMoneyValue(s.gross, displayLocale)}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-mono">-{formatMoneyValue(s.deductions, displayLocale)}</td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">{formatMoneyValue(s.net, displayLocale)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            s.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {settlementStatusLabel(s.status, displayLocale)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );

  if (!mounted) return <div className="p-10 text-[var(--nc-foreground)]">{L('جاري التهيئة...', 'Initializing...')}</div>;

  return (
    <div className="nc-page nc-stack overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <PageHeader
        title={L('نظام العقود والمدفوعات والتسويات', 'Contracts, Payments & Settlements')}
        description={L('إدارة عقود البيع والإيجار، خطط الدفع، الفواتير، الأقساط والتحصيل المالي.', 'Manage sales and rental contracts, payment plans, invoices, installments, and collection.')}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-foreground)] text-xs font-semibold">
          <i className="ph-bold ph-file-text"></i>
          {isLoading ? L('جاري التحميل...', 'Loading...') : L(`${formatNumberValue(leases.length, displayLocale)} عقد نشط`, `${formatNumberValue(leases.length, displayLocale)} active leases`)}
        </div>
      </PageHeader>

      <section className="nc-stagger-enter grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {kpisContent}
      </section>

      {compactOperationsStrip}

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
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-white/5 pb-2 flex items-center gap-2">
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
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
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
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
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
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('قيمة التأمين المحتجز (ر.س):', 'Security deposit (SAR):')}</label>
                <input 
                  type="number"
                  required
                  value={newDeposit}
                  onChange={(e) => setNewDeposit(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-[#1e293b] font-bold rounded-xl transition-all"
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
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-white/5 pb-2 flex items-center gap-2">
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
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1] font-mono"
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
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
               <label className="text-[var(--nc-text-dim)] block">{L('نوع الضريبة:', 'VAT type:')}</label>
              <select
                value={invVatType}
                onChange={(e) => setInvVatType(e.target.value)}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
              >
                <option value="STANDARD">{vatTypeLabel('STANDARD', displayLocale)}</option>
                <option value="ZERO_RATED">{vatTypeLabel('ZERO_RATED', displayLocale)}</option>
                <option value="EXEMPT">{vatTypeLabel('EXEMPT', displayLocale)}</option>
              </select>
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
                  <span className="text-amber-400">
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
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-[#1e293b] font-bold rounded-xl transition-all"
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
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-white/5 pb-2 flex items-center gap-2">
              <Key size={18} />
              {L('تسجيل دفعة يدوية للفاتورة', 'Record manual invoice payment')}
            </h3>
            {isRTL ? (
              <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded-lg mb-3">{L('⚠️ هذا تسجيل داخلي للسداد ولا يمثل دفعًا إلكترونيًا عبر بوابة دفع.', '⚠️ This records an internal/manual payment and does not process an online gateway payment.')}</p>
            ) : (
              <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded-lg mb-3">⚠️ This records an internal/manual payment and does not process an online gateway payment.</p>
            )}
            
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
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
                >
                  <option value="bank">{paymentMethodLabel('bank', displayLocale)}</option>
                  <option value="card">{paymentMethodLabel('card', displayLocale)}</option>
                  <option value="cash">{paymentMethodLabel('cash', displayLocale)}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">{L('رقم المرجع:', 'Reference number:')}</label>
                <input 
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={L("رقم الحوالة البنكية...", "Bank transfer reference...")}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-primary)] outline-none focus:border-[#8EB1D1]"
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
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-[#1e293b] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

    </div>
  );
}




