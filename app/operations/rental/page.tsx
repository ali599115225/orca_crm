'use client';
import { toast } from '@/app/context/ToastContext';

import React, { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Calculator, Megaphone, Plus, Search, Eye,
  Landmark, ChevronRight, AlertCircle, FileCheck, ArrowRight,
  UserCheck, CloudUpload, Key, Trash2, Settings, Bot, Clock, HelpCircle, CheckCircle2
} from 'lucide-react';
import { DateField } from '@/components/ui/DateField';
import { useAuth } from '@/app/context/AuthContext';
import { Button, Card } from '@/components/ui/orca-components';
import LayoutContainer from '@/components/ui/LayoutContainer';
import PageHeader from '@/components/ui/PageHeader';

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
  contractId: string;
  due: string;      // YYYY-MM-DD
  amount: number;
  status: 'unpaid' | 'paid' | 'overdue';
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

const initialInvoices: Invoice[] = [
  { id: 'INV-9001', contractId: 'L-1001', due: '2026-06-14', amount: 12000, status: 'unpaid' },
  { id: 'INV-9002', contractId: 'L-1002', due: '2026-05-01', amount: 45000, status: 'paid' },
  { id: 'INV-9003', contractId: 'L-1003', due: '2026-07-01', amount: 25000, status: 'unpaid' },
  { id: 'INV-9004', contractId: 'L-1001', due: '2026-05-10', amount: 12000, status: 'overdue' },
  { id: 'INV-9005', contractId: 'L-1003', due: '2026-05-20', amount: 25000, status: 'overdue' }
];

const initialPayments: Payment[] = [
  { id: 'P-5001', invoiceId: 'INV-9002', date: '2026-05-02', amount: 45000, method: 'bank', ref: 'TXN-8891' }
];

const initialSettlements: Settlement[] = [
  { id: 'FS-3001', contractId: 'L-1002', gross: 120000, deductions: 12000, net: 108000, status: 'completed' }
];

const initialEvents: EventLog[] = [
  { id: 'ev_1', contractId: 'L-1001', type: 'lease.created', timestamp: '2026-01-01T10:00:00Z', note: 'تم تسجيل عقد جديد للوحدة A-101' },
  { id: 'ev_2', contractId: 'L-1002', type: 'lease.created', timestamp: '2025-07-01T09:00:00Z', note: 'تم تسجيل عقد جديد للوحدة B-201' },
  { id: 'ev_3', contractId: 'L-1002', type: 'invoice.issued', timestamp: '2026-05-01T08:00:00Z', note: 'تم إصدار فاتورة بمبلغ 45,000 ر.س' },
  { id: 'ev_4', contractId: 'L-1002', type: 'payment.received', timestamp: '2026-05-02T14:30:00Z', note: 'تم تحصيل الدفعة رقم INV-9002' }
];

export default function RentalPage() {
  const [mounted, setMounted] = useState(false);
  const [activePane, setActivePane] = useState<'dashboard' | 'leases' | 'invoices' | 'reconciliation' | 'settlements'>('leases');
  const [isPending, startTransition] = useTransition();

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
  
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');

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
  const [invoiceDue, setInvoiceDue] = useState(''); // YYYY-MM-DD
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [invoiceContractId, setInvoiceContractId] = useState('');

  // Payment form state
  const [payMethod, setPayMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(''); // YYYY-MM-DD
  const [payIdempotencyKey, setPayIdempotencyKey] = useState('');

  // Reconciliation Upload mock state
  const [bankFileLoaded, setBankFileLoaded] = useState(false);
  const [reconcileMatches, setReconcileMatches] = useState<any[]>([]);
  const [reconcileExceptions, setReconcileExceptions] = useState<any[]>([]);

  const { hasPermission } = useAuth();
  // Permission check — delegated to AuthContext
  const isAllowed = (action: string) => hasPermission(action);

  // Feature Flags
  const [enableZakat, setEnableZakat] = useState(false);
  const [enableCompliance, setEnableCompliance] = useState(false);

  // Details sub-tabs controller
  const [detailActiveTab, setDetailActiveTab] = useState('summary');

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
  const formatDateToDDMMYYYY = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // KPIs
  const totalReceivables = invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0);
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
    if (!selectedLease) {
      toast.error('يرجى اختيار عقد أولاً قبل رفع المستند.');
      return;
    }
    if (!selectedDocumentFile) {
      toast.error('يرجى اختيار ملف للرفع أولاً.');
      return;
    }

    addTelemetryEvent('document.uploaded', {
      contractId: selectedLease.id,
      fileName: selectedDocumentFile.name,
      fileSize: selectedDocumentFile.size,
    });

    toast.success('تم رفع مستند العقد بنجاح.');
    setSelectedDocumentFile(null);
  };

  const handleDownloadLeaseAgreement = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    const content = `عقد إيجار موحد\n--------------------------------------\nرقم العقد: ${lease?.id || leaseId}\nالوحدة: ${lease?.unit || 'غير محددة'}\nالمستأجر: ${lease?.tenant || 'غير محدد'}\nتاريخ البداية: ${lease?.start || '-'}\nتاريخ الانتهاء: ${lease?.end || '-'}\nالمبلغ السنوي: ${lease?.rent?.toLocaleString() || '-'} ر.س\n\nهذه نسخة تجريبية من مسودة العقد الموحد.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `عقد_إيجار_موحد_${leaseId}.txt`;
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

    const targetContractId = invoiceContractId || prefilledContractId;
    if (!targetContractId || !invoiceDue || invoiceAmount <= 0) {
      alert('يرجى التحقق من المدخلات.');
      return;
    }

    let finalAmount = invoiceAmount;
    if (enableZakat) {
      finalAmount = Math.round(invoiceAmount * 1.15);
      addTelemetryEvent('zakat.tax_calculated', { invoiceAmount, vat: Math.round(invoiceAmount * 0.15), total: finalAmount });
    }

    let newInvoiceId = 'unknown';
    try {
      const res = await fetch('/api/v1/invoices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: targetContractId, due: invoiceDue, amount: finalAmount }),
      });
      const json = await res.json();
      if (json.success) {
        newInvoiceId = json.invoice.id;
        setInvoices(prev => [...prev, json.invoice]);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      alert('خطأ في إصدار الفاتورة: ' + err.message);
      return;
    }

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: targetContractId,
      type: 'invoice.issued',
      timestamp: new Date().toISOString(),
      note: `تم إصدار الفاتورة بمبلغ ${finalAmount.toLocaleString()} ر.س`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('invoice.issued', {
      contractId: targetContractId,
      invoiceId: newInvoiceId,
      actorId: 'usr_active',
      timestamp: new Date().toISOString(),
      status: 'unpaid',
      payload: { due: invoiceDue, amount: finalAmount, currency: 'SAR' }
    });

    setInvoiceDue('');
    setInvoiceAmount(0);
    setInvoiceContractId('');
    setPrefilledContractId('');
    setActiveModal(null);
    alert(`تم إصدار الفاتورة بنجاح!`);
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!isAllowed('PAY_INVOICE')) {
      alert('عذراً، لا تملك صلاحية تسجيل الدفعات.');
      return;
    }

    if (!payDate || !payIdempotencyKey) {
      alert('يرجى تحديد تاريخ السداد وإدخال مفتاح تفادي التكرار (Idempotency Key).');
      return;
    }

    const payId = 'P-' + Math.floor(5002 + Math.random() * 900);
    const newP: Payment = {
      id: payId,
      invoiceId: selectedInvoice.id,
      date: payDate,
      amount: selectedInvoice.amount,
      method: payMethod,
      ref: payRef || undefined
    };

    setPayments(prev => [...prev, newP]);
    setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? { ...inv, status: 'paid' } : inv));

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: selectedInvoice.contractId,
      type: 'payment.received',
      timestamp: new Date().toISOString(),
      note: `تم سداد الفاتورة رقم ${selectedInvoice.id} بمبلغ ${selectedInvoice.amount.toLocaleString()} ر.س عبر ${payMethod}`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('payment.received', {
      contractId: selectedInvoice.contractId,
      invoiceId: selectedInvoice.id,
      paymentId: payId,
      actorId: 'usr_active',
      timestamp: new Date().toISOString(),
      status: 'paid',
      idempotencyKey: payIdempotencyKey,
      payload: { amount: selectedInvoice.amount, method: payMethod, ref: payRef }
    });

    // Reset
    setPayRef('');
    setPayDate('');
    setPayIdempotencyKey('idemp-' + Math.floor(100000 + Math.random() * 900000));
    setSelectedInvoice(null);
    setActiveModal(null);
    alert(`تم تسجيل عملية الدفع بنجاح! رقم الإيصال: ${payId}`);
  };

  const handleRequestSettlement = (contractId: string, amount: number) => {
    if (!isAllowed('REQUEST_SETTLEMENT')) {
      alert('عذراً، لا تملك صلاحية طلب تسوية المستحقات للمالك.');
      return;
    }

    const settleId = 'FS-' + Math.floor(3002 + Math.random() * 900);
    const gross = amount;
    const deductions = Math.round(gross * 0.1); // 10% administrative deductions
    const net = gross - deductions;

    const newS: Settlement = {
      id: settleId,
      contractId,
      gross,
      deductions,
      net,
      status: 'pending'
    };

    setSettlements(prev => [...prev, newS]);
    setLeases(prev => prev.map(l => l.id === contractId ? { ...l, financialRef: settleId } : l));

    addTelemetryEvent('settlement.requested', {
      contractId,
      settlementId: settleId,
      actorId: 'usr_active',
      timestamp: new Date().toISOString(),
      status: 'pending',
      payload: { gross, deductions, net }
    });

    alert(`تم إرسال طلب تسوية للمالك بنجاح! رقم التسوية: ${settleId}. جاري إرسالها إلى خدمة الحسابات المركزية (General Ledger Proxy).`);

    // Simulate completion from Accounting general ledger
    setTimeout(() => {
      setSettlements(prev => prev.map(s => s.id === settleId ? { ...s, status: 'completed' } : s));
      addTelemetryEvent('settlement.completed', {
        contractId,
        settlementId: settleId,
        actorId: 'system_accounting',
        timestamp: new Date().toISOString(),
        status: 'completed',
        payload: { gross, deductions, net, ledgerRef: 'GL-REF-' + Math.floor(10000 + Math.random() * 90000) }
      });
    }, 4000);
  };

  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!isAllowed('MANAGE_RECONCILE')) {
      alert('عذراً، لا تملك الصلاحية لتشغيل المصالحة البنكية.');
      return;
    }

    const file = e.target.files[0];
    setBankFileLoaded(true);

    addTelemetryEvent('reconciliation.upload', { fileName: file.name, fileSize: file.size });

    // Simulate matching algorithm
    setReconcileMatches([
      { transactionId: 'TXN-8892', amount: 12000, invoiceId: 'INV-9004', confidence: 0.98, note: 'تطابق تام لقيمة الفاتورة المتبقية لعقد محمد العلي' }
    ]);
    setReconcileExceptions([
      { transactionId: 'TXN-9981', amount: 450, note: 'تحويل بنكي مجهول الهوية بدون رقم مرجعي متاح' }
    ]);

    alert('تم تحميل كشف الحساب البنكي بنجاح! جاري تشغيل خوارزميات المطابقة الفورية (Reconciliation Batch)...');
  };

  const handleConfirmReconcileMatch = (match: any) => {
    const inv = invoices.find(i => i.id === match.invoiceId);
    if (!inv) return;

    const pid = 'P-' + Math.floor(5200 + Math.random() * 100);
    const newP: Payment = {
      id: pid,
      invoiceId: inv.id,
      date: new Date().toISOString().split('T')[0],
      amount: inv.amount,
      method: 'bank',
      ref: match.transactionId
    };

    setPayments(prev => [...prev, newP]);
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i));
    setReconcileMatches(prev => prev.filter(m => m.transactionId !== match.transactionId));

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: inv.contractId,
      type: 'payment.received',
      timestamp: new Date().toISOString(),
      note: `تمت تسوية الفاتورة ${inv.id} آلياً عن طريق مصالحة الدفعة البنكية ${match.transactionId}`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('payment.received', {
      contractId: inv.contractId,
      invoiceId: inv.id,
      paymentId: pid,
      actorId: 'system_reconciliation',
      timestamp: new Date().toISOString(),
      status: 'paid',
      payload: { amount: inv.amount, method: 'bank', ref: match.transactionId }
    });

    alert(`تم اعتماد المطابقة بنجاح وتسوية الفاتورة ${inv.id}.`);
  };

  // Filter lists
  const filteredLeases = leases.filter(l => {
    const matchSearch = !leaseSearch || `${l.id} ${l.unit} ${l.tenant}`.toLowerCase().includes(leaseSearch.toLowerCase());
    const matchStatus = !leaseStatusFilter || l.status === leaseStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredInvoices = invoices.filter(i => {
    const matchSearch = !invoiceSearch || `${i.id} ${i.contractId}`.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = !invoiceStatusFilter || i.status === invoiceStatusFilter;
    return matchSearch && matchStatus;
  });


  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpisContent = (
    <>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">المستحقات المفوترة</p>
            <h3 className="text-2xl font-black text-white">{totalReceivables.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-secondary)]">
            <FileText size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">متأخرات السداد</p>
            <h3 className="text-2xl font-black text-rose-400">{totalOverdue.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">محصل هذا الشهر</p>
            <h3 className="text-2xl font-black text-emerald-400">{collectedThisMonth.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">تسويات معلقة</p>
            <h3 className="text-2xl font-black text-cyan-400">{pendingSettlementsCount}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Landmark size={18} />
          </div>
        </div>
      </Card>
    </>
  );

  const actionsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search size={16} className="text-[var(--nc-text-secondary)]" />
          البحث والتصفية
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">ابحث بالعقد أو المستأجر أو الوحدة</p>
      </div>
      <div className="space-y-3 flex-grow pt-2">
        <input
          placeholder="بحث بالعقد، المستأجر أو الوحدة..."
          value={leaseSearch}
          onChange={(e) => setLeaseSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
        />
        <select
          value={leaseStatusFilter}
          onChange={(e) => setLeaseStatusFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none"
        >
          <option value="">كل العقود</option>
          <option value="active">نشط</option>
          <option value="expired">منتهي</option>
          <option value="terminated">ملغى</option>
        </select>
        <div className="border-t border-white/5 pt-3 space-y-2">
          <Button
            onClick={() => {
              if (!isAllowed("CREATE_LEASE")) { alert("عذراً، لا تملك الصلاحية لإضافة عقد جديد."); return; }
              setActiveModal("new_lease");
            }}
            className="w-full py-2 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            عقد إيجار جديد
          </Button>
          <button
            onClick={() => {
              if (!isAllowed("CREATE_INVOICE")) { alert("عذراً، لا تملك الصلاحية لإصدار فواتير."); return; }
              setActiveModal("new_invoice");
            }}
            className="w-full py-2 bg-[var(--nc-surface-solid)] border border-white/10 hover:border-[var(--nc-accent-border)] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Plus size={13} />
            إصدار فاتورة دورية
          </button>
        </div>
      </div>
    </Card>
  );

  const insightsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot size={16} className="text-cyan-400" />
          التنبيهات الذكية
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">إشعارات عاجلة وإجراءات مقترحة</p>
      </div>
      <div className="space-y-3 flex-grow text-xs">
        {overdueInvoicesCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-rose-300">{overdueInvoicesCount} فواتير متأخرة تجاوزت تاريخ الاستحقاق</p>
          </div>
        )}
        {expiredLeasesCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300">{expiredLeasesCount} عقود إيجارية منتهية تحتاج تجديد</p>
          </div>
        )}
        {pendingSettlementsCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <Landmark size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-cyan-300">{pendingSettlementsCount} طلبات تسوية مالية معلقة</p>
          </div>
        )}
        {overdueInvoicesCount === 0 && expiredLeasesCount === 0 && pendingSettlementsCount === 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-emerald-300">لا توجد تنبيهات عاجلة</p>
          </div>
        )}
        <div className="border-t border-white/5 pt-3 space-y-2">
          <p className="text-[var(--nc-text-dim)] font-bold text-[10px] uppercase tracking-wider">إجراءات ذكية</p>
          <button
            onClick={() => {
              const overdueInvs = invoices.filter(i => i.status === "overdue");
              if (overdueInvs.length === 0) { alert("لا يوجد فواتير متأخرة."); return; }
              overdueInvs.forEach(inv => addTelemetryEvent("invoice.reminder_sent", { invoiceId: inv.id }));
              alert("تم إرسال تذكيرات للفواتير المتأخرة.");
            }}
            className="w-full py-1.5 text-[10px] font-bold text-[var(--nc-accent-text)] border border-[var(--nc-accent-border)]/30 hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          >
            إرسال تنبيهات سداد الفواتير
          </button>
          <button
            onClick={() => setActivePane("reconciliation")}
            className="w-full py-1.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 rounded-lg transition-all"
          >
            تشغيل مصالحة بنكية
          </button>
        </div>
      </div>
    </Card>
  );

  // Details content: Tab bar + Panes
  const detailsContent = (
    <div className="space-y-4">
      {/* ── Tab Bar ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'leases', name: '📄 العقود' },
          { id: 'invoices', name: '🧾 الفواتير' },
          { id: 'reconciliation', name: '🏦 المصالحة البنكية' },
          { id: 'settlements', name: '💰 التسويات' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => startTransition(() => setActivePane(t.id as any))}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePane === t.id
                ? 'bg-[var(--nc-accent)] text-white shadow-sm'
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
          <span className="text-xs text-[var(--nc-foreground-muted)] font-bold">جاري تحميل بيانات القسم...</span>
        </div>
      ) : (
        <div className="orca-view-enter">
          
          {/* ── Pane 1: Leases (Master-Detail) ── */}
          {activePane === 'leases' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Leases List (Master) */}
              <div className="w-full lg:w-[45%] bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden fade-in-up">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                  <span className="text-sm font-bold text-white">قائمة عقود الإيجار</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (!isAllowed('CREATE_LEASE')) {
                          alert('عذراً، لا تملك الصلاحية لإضافة عقد جديد.');
                          return;
                        }
                        setActiveModal('new_lease');
                      }}
                      className="px-3 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white text-[11px] font-black rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      عقد جديد
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-3 pt-3 border-b border-white/5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 text-[var(--nc-text-dim)]" size={13} />
                    <input 
                      type="text"
                      placeholder="بحث باسم المستأجر، العقد أو الوحدة..."
                      value={leaseSearch}
                      onChange={(e) => setLeaseSearch(e.target.value)}
                      className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl pr-8 pl-3 py-2 text-xs text-white outline-none focus:border-[var(--nc-accent-border)]"
                    />
                  </div>
                  <select
                    value={leaseStatusFilter}
                    onChange={(e) => setLeaseStatusFilter(e.target.value)}
                    className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="expired">منتهي</option>
                    <option value="terminated">ملغى</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--nc-surface-solid)] border-y border-white/5 text-[var(--nc-text-dim)] text-[11px] font-bold">
                        <th className="py-3 px-3">رقم العقد</th>
                        <th className="py-3 px-3">الوحدة</th>
                        <th className="py-3 px-3">المستأجر</th>
                        <th className="py-3 px-3">الحالة</th>
                        <th className="py-3 px-3 text-left">الإيجار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.map(l => (
                        <tr 
                           key={l.id}
                           onClick={() => {
                             setSelectedLeaseId(l.id);
                             setDetailActiveTab('summary');
                             addTelemetryEvent('lease.opened', { contractId: l.id, status: l.status });
                           }}
                           className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                             selectedLeaseId === l.id ? 'bg-[#8EB1D1]/10 border-r-4 border-[#8EB1D1]' : ''
                           }`}
                        >
                          <td className="py-3.5 px-2 font-bold text-white">{l.id}</td>
                          <td className="py-3.5 px-2 text-[var(--nc-text-dim)] font-mono">{l.unit}</td>
                          <td className="py-3.5 px-2 text-[var(--nc-text-dim)]">{l.tenant}</td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                              l.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : l.status === 'expired'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-[var(--nc-surface)] text-[var(--nc-text-dim)] border border-slate-500/30'
                            }`}>
                              {l.status === 'active' ? 'نشط' : l.status === 'expired' ? 'منتهي' : 'ملغى'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-left text-white font-bold">{l.rent.toLocaleString()} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lease Detail Panel (Detail) */}
              <div className="flex-1 w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-2xl overflow-hidden min-h-[460px] fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="p-6">
                {!selectedLease ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--nc-text-dim)] text-xs py-20">
                    <Landmark size={48} className="text-slate-700 mb-3" />
                    <span>الرجاء تحديد عقد إيجاري من القائمة اليسرى لعرض تفاصيله وملخصات السداد</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Detail Panel Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          {selectedLease.id}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            selectedLease.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {selectedLease.status === 'active' ? 'عقد نشط' : 'عقد منتهي'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-[var(--nc-text-dim)] mt-1">الوحدة: {selectedLease.unit} | المستأجر: {selectedLease.tenant}</p>
                      </div>

                      {/* Contextual Actions (only inside detail panel!) */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            if (!isAllowed('CREATE_INVOICE')) {
                              alert('لا تملك صلاحية إصدار فواتير.');
                              return;
                            }
                            setPrefilledContractId(selectedLease.id);
                            setInvoiceAmount(selectedLease.rent);
                            setActiveModal('create_invoice');
                          }}
                          className="px-3 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white text-[11px] font-black rounded-lg transition-all border border-white/10"
                        >
                          إصدار فاتورة للعقد
                        </button>

                        {selectedLease.status === 'expired' && !selectedLease.financialRef && (
                          <button
                            onClick={() => handleRequestSettlement(selectedLease.id, selectedLease.rent * 12)}
                            className="px-3 py-1.5 bg-[#0081a7] hover:bg-[#007090] text-white text-[11px] font-black rounded-lg transition-all border border-white/10"
                          >
                            طلب تسوية المالك Payout
                          </button>
                        )}
                        <button
                          onClick={() => {
                            addTelemetryEvent('lease.reminder_sent', { contractId: selectedLease.id });
                            alert('تم إرسال تذكير سياقي آلي للمستأجر بنجاح.');
                          }}
                          className="px-3 py-1.5 bg-[var(--nc-surface)] border border-white/10 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] text-[11px] font-black rounded-lg transition-all"
                        >
                          إرسال تذكير
                        </button>
                      </div>
                    </div>

                    {/* Sub-tabs list */}
                    <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2.5">
                      {[
                        { id: 'summary', name: 'الملخص' },
                        { id: 'invoices', name: 'الفواتير' },
                        { id: 'payments', name: 'الدفعات' },
                        { id: 'docs', name: 'المستندات' },
                        { id: 'settlements', name: 'التسويات' },
                        { id: 'events', name: 'سجل الأحداث' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setDetailActiveTab(tab.id)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            detailActiveTab === tab.id 
                              ? 'bg-[#8EB1D1] text-white shadow-sm' 
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
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">تاريخ صلاحية العقد</span>
                              <span className="font-bold text-white mt-1.5 block">
                                {formatDateToDDMMYYYY(selectedLease.start)} — {formatDateToDDMMYYYY(selectedLease.end)}
                              </span>
                            </div>
                            <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/10">
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">القيمة الإيجارية الدورية</span>
                              <span className="font-bold text-white mt-1.5 block">{selectedLease.rent.toLocaleString()} {selectedLease.currency}</span>
                            </div>
                            <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/10">
                              <span className="text-[10px] text-[var(--nc-text-dim)] font-bold block">تأمين مسترد Locked</span>
                              <span className="font-bold text-white mt-1.5 block">{selectedLease.deposit.toLocaleString()} {selectedLease.currency}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-[var(--nc-text-dim)] flex items-center gap-1 pt-2 font-mono">
                            <span>المرجع المالي للتسوية:</span>
                            <span className="text-cyan-400 font-bold">{selectedLease.financialRef || 'N/A — لا توجد تسويات جارية للعقود النشطة'}</span>
                          </div>
                        </div>
                      )}

                      {/* Invoices Tab */}
                      {detailActiveTab === 'invoices' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">رقم الفاتورة</th>
                                <th className="pb-2">تاريخ الاستحقاق</th>
                                <th className="pb-2">المبلغ المطلوب</th>
                                <th className="pb-2">الحالة</th>
                                <th className="pb-2 text-left">إجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoices.filter(i => i.contractId === selectedLease.id).map(inv => (
                                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-bold text-white">{inv.id}</td>
                                  <td className="py-2.5 font-mono text-[var(--nc-text-dim)]">{formatDateToDDMMYYYY(inv.due)}</td>
                                  <td className="py-2.5 font-bold text-white">{inv.amount.toLocaleString()} ر.س</td>
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      inv.status === 'paid' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : inv.status === 'overdue'
                                          ? 'bg-rose-500/20 text-rose-400'
                                          : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                      {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة عن الدفع' : 'غير مدفوعة'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-left space-x-2">
                                    {inv.status !== 'paid' && (
                                      <button
                                        onClick={() => {
                                          setSelectedInvoice(inv);
                                          setPayDate(new Date().toISOString().split('T')[0]);
                                          setActiveModal('register_payment');
                                        }}
                                        className="px-2 py-0.5 bg-[var(--nc-surface)] border border-white/5 border border-[#8EB1D1]/20 hover:border-[#8EB1D1]/40 text-[#8EB1D1] rounded text-[10px] font-bold transition-all"
                                      >
                                        سداد الفاتورة
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        addTelemetryEvent('invoice.reminder_sent', { invoiceId: inv.id, contractId: inv.contractId });
                                        alert(`تم إرسال تذكير سداد للفاتورة ${inv.id}.`);
                                      }}
                                      className="px-2 py-0.5 bg-[var(--nc-surface)] border border-white/5 border border-slate-700 hover:border-slate-500 text-[var(--nc-text-dim)] hover:text-white rounded text-[10px] font-bold transition-all ml-1"
                                    >
                                      تذكير
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {invoices.filter(i => i.contractId === selectedLease.id).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-[var(--nc-text-dim)]">لا توجد فواتير مرتبطة بهذا العقد حالياً.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Payments Tab */}
                      {detailActiveTab === 'payments' && (
                        <div className="overflow-x-auto space-y-4">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">معرف الدفعة</th>
                                <th className="pb-2">رقم الفاتورة</th>
                                <th className="pb-2">تاريخ الاستلام</th>
                                <th className="pb-2">قناة الدفع</th>
                                <th className="pb-2 text-left">المبلغ المحصل</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.filter(p => invoices.some(i => i.id === p.invoiceId && i.contractId === selectedLease.id)).map(pay => (
                                <tr key={pay.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-bold text-white">{pay.id}</td>
                                  <td className="py-2.5 font-mono text-cyan-400">{pay.invoiceId}</td>
                                  <td className="py-2.5 font-mono text-[var(--nc-text-dim)]">{formatDateToDDMMYYYY(pay.date)}</td>
                                  <td className="py-2.5 text-[var(--nc-text-dim)]">{pay.method === 'bank' ? 'تحويل بنكي' : pay.method === 'card' ? 'بطاقة ائتمانية' : 'نقدي'}</td>
                                  <td className="py-2.5 text-left text-white font-bold">{pay.amount.toLocaleString()} ر.س</td>
                                </tr>
                              ))}
                              {payments.filter(p => invoices.some(i => i.id === p.invoiceId && i.contractId === selectedLease.id)).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-[var(--nc-text-dim)]">لا توجد دفعات محصلة بعد.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Documents Tab */}
                      {detailActiveTab === 'docs' && (
                        <div className="space-y-4">
                          <div className="bg-[var(--nc-surface)] dark:bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                            <span className="text-[11px] text-[var(--nc-text-dim)]">إضافة مستند أو ملف عقد مصدق:</span>
                            <div className="flex gap-2">
                              <input
                            type="file"
                            className="text-[10px] text-[var(--nc-text-dim)]"
                            onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] || null)}
                          />
                              <button 
                                onClick={handleLeaseDocumentUpload}
                                className="px-3 py-1 bg-[var(--nc-surface-strong)] border border-white/10 hover:bg-white/5 rounded text-[10px] text-white"
                              >
                                رفع الملف
                              </button>
                            </div>
                          </div>

                          <ul className="space-y-2 pr-2 list-disc list-inside">
                            <li>
                              <button
                                onClick={() => handleDownloadLeaseAgreement(selectedLease.id)}
                                className="text-cyan-400 hover:underline text-left"
                              >
                                عقد_إيجار_موحد_{selectedLease.id}.txt
                              </button>
                              <span className="text-[9px] text-[var(--nc-text-dim)] font-mono ml-2">(حجم: 1.2 MB)</span>
                            </li>
                          </ul>
                        </div>
                      )}

                      {/* Settlements Tab */}
                      {detailActiveTab === 'settlements' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-[var(--nc-text-dim)] font-bold">
                                <th className="pb-2">معرف التسوية</th>
                                <th className="pb-2">المبلغ الإجمالي</th>
                                <th className="pb-2">الخصوم والضرائب</th>
                                <th className="pb-2">الصافي للمالك</th>
                                <th className="pb-2 text-left">الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {settlements.filter(s => s.contractId === selectedLease.id).map(settle => (
                                <tr key={settle.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 font-bold text-white">{settle.id}</td>
                                  <td className="py-2.5 text-[var(--nc-text-dim)]">{settle.gross.toLocaleString()} SAR</td>
                                  <td className="py-2.5 text-rose-400 font-mono">-{settle.deductions.toLocaleString()} SAR</td>
                                  <td className="py-2.5 text-emerald-400 font-bold">{settle.net.toLocaleString()} SAR</td>
                                  <td className="py-2.5 text-left">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      settle.status === 'completed' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                      {settle.status === 'completed' ? 'تم الدفع والتحويل' : 'قيد المعالجة'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {settlements.filter(s => s.contractId === selectedLease.id).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-[var(--nc-text-dim)]">لا توجد تسويات مالية مرتبطة بهذا العقد.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Events Tab */}
                      {detailActiveTab === 'events' && (
                        <div className="space-y-4">
                          <div className="border-r-2 border-white/5 pr-4 space-y-3">
                            {events.filter(e => e.contractId === selectedLease.id).map(evt => (
                              <div key={evt.id} className="relative">
                                <div className="absolute right-[-21px] top-1 w-2 h-2 rounded-full bg-[#8EB1D1]"></div>
                                <div className="flex justify-between items-center text-[10px] text-[var(--nc-text-dim)]">
                                  <span className="font-bold text-slate-200">[{evt.type}]</span>
                                  <span className="font-mono">{evt.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{evt.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
              </div>

            </div>
          )}

          {/* ── Pane 2: Invoices ── */}
          {activePane === 'invoices' && (
            <div className="bg-[var(--nc-surface-strong)] border border-white/5 rounded-2xl overflow-hidden fade-in-up">
              <div className="p-4 border-b border-white/5 bg-[var(--nc-surface-solid)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">جدول الفواتير الصادرة</h3>
                  <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">تصفية ومتابعة الفواتير المحصلة والمعلقة</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-2 text-[var(--nc-text-dim)]" size={13} />
                    <input 
                      type="text"
                      placeholder="بحث برقم الفاتورة أو العقد..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white outline-none w-52 focus:border-[#8EB1D1]/40"
                    />
                  </div>
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="">كل الحالات</option>
                    <option value="unpaid">غير مدفوعة</option>
                    <option value="paid">مدفوعة</option>
                    <option value="overdue">متأخرة</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--nc-surface-solid)] border-y border-white/5 text-[var(--nc-text-dim)] text-[11px] font-bold">
                      <th className="py-3 px-4">رقم الفاتورة</th>
                      <th className="py-3 px-4">العقد المرتبط</th>
                      <th className="py-3 px-4">تاريخ الاستحقاق</th>
                      <th className="py-3 px-4">المبلغ</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{inv.id}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">{inv.contractId}</td>
                        <td className="py-3.5 px-4 font-mono text-[var(--nc-text-dim)]">{formatDateToDDMMYYYY(inv.due)}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{inv.amount.toLocaleString()} ر.س</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            inv.status === 'paid' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : inv.status === 'overdue'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة عن الدفع' : 'غير مدفوعة'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center space-x-2">
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPayDate(new Date().toISOString().split('T')[0]);
                                setActiveModal('register_payment');
                              }}
                              className="px-2.5 py-1 bg-[var(--nc-surface)] border border-white/5 border border-[#8EB1D1]/20 hover:border-[#8EB1D1]/40 text-[#8EB1D1] rounded text-[10px] font-bold transition-all"
                            >
                              سداد
                            </button>
                          )}
                          <button
                            onClick={() => {
                              addTelemetryEvent('invoice.reminder_sent', { invoiceId: inv.id, contractId: inv.contractId });
                              alert(`تم إرسال تذكير سداد للفاتورة ${inv.id}.`);
                            }}
                            className="px-2.5 py-1 bg-[var(--nc-surface)] border border-white/5 border border-slate-700 hover:border-slate-500 text-[var(--nc-text-dim)] hover:text-white rounded text-[10px] font-bold transition-all ml-1"
                          >
                            تذكير
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pane 3: Reconciliation (المصالحة البنكية) ── */}
          {activePane === 'reconciliation' && (
            <div className="bg-[var(--nc-surface-strong)] border border-white/5 rounded-2xl overflow-hidden fade-in-up">
              <div className="p-4 border-b border-white/5 bg-[var(--nc-surface-solid)]">
                <h3 className="text-sm font-bold text-white">أداة المصالحة البنكية الفورية</h3>
                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">تطابق وتدقيق الحسابات البنكية مع فواتير الإيجارات</p>
              </div>
              <div className="p-6 space-y-6">

              {/* Upload file area */}
              <div className="border border-dashed border-white/10 p-8 rounded-2xl text-center space-y-3 bg-[var(--nc-surface)] dark:bg-white/5">
                <CloudUpload className="mx-auto text-[#8EB1D1]/70" size={32} />
                <div className="text-xs text-[var(--nc-text-dim)]">قم برفع ملف الحساب البنكي (.csv / .xls) للمطابقة</div>
                <input 
                  type="file" 
                  onChange={handleBankFileUpload}
                  className="mx-auto block text-xs text-[var(--nc-text-dim)] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[var(--nc-surface)] border border-white/5 file:text-[var(--nc-text-dim)] file:cursor-pointer"
                />
              </div>

              {bankFileLoaded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  
                  {/* Matches Proposals */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      المطابقات المقترحة (Match Recommendations)
                    </h4>

                    {reconcileMatches.map((match, idx) => (
                      <div key={idx} className="bg-[var(--nc-surface)] dark:bg-white/5 border border-white/5 p-4 rounded-xl border border-emerald-500/20 space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-white">
                          <span>رقم المعاملة: {match.transactionId}</span>
                          <span className="text-emerald-400">{match.amount.toLocaleString()} SAR</span>
                        </div>
                        <p className="text-[var(--nc-text-dim)] text-[11px]">{match.note}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <span className="text-[10px] text-[var(--nc-text-dim)]">الفاتورة المقترحة: {match.invoiceId}</span>
                          <button
                            onClick={() => handleConfirmReconcileMatch(match)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition-all"
                          >
                            تأكيد وتسوية المطابقة
                          </button>
                        </div>
                      </div>
                    ))}
                    {reconcileMatches.length === 0 && <p className="text-[11px] text-[var(--nc-text-dim)]">لا توجد مطابقات مقترحة معلقة.</p>}
                  </div>

                  {/* Exceptions List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      قائمة الاستثناءات والعمليات غير المعرفة
                    </h4>

                    {reconcileExceptions.map((ex, idx) => (
                      <div key={idx} className="bg-[var(--nc-surface)] dark:bg-white/5 border border-white/5 p-4 rounded-xl border border-rose-500/20 space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-white">
                          <span>رقم المعاملة: {ex.transactionId}</span>
                          <span className="text-rose-400">{ex.amount.toLocaleString()} SAR</span>
                        </div>
                        <p className="text-[var(--nc-text-dim)] text-[11px]">{ex.note}</p>
                        <div className="flex justify-end pt-2 border-t border-slate-900">
                          <button
                            onClick={() => {
                              alert('تحويل المعاملة للفحص اليدوي من قبل قسم المالية.');
                              addTelemetryEvent('reconciliation.exception_checked', { transactionId: ex.transactionId });
                            }}
                            className="px-2.5 py-1 bg-[var(--nc-surface)] border border-white/5 border border-slate-700 hover:border-slate-500 text-[var(--nc-text-dim)] rounded text-[10px] font-bold transition-all"
                          >
                            تحديد يدوي / فحص
                          </button>
                        </div>
                      </div>
                    ))}
                    {reconcileExceptions.length === 0 && <p className="text-[11px] text-[var(--nc-text-dim)]">قائمة الاستثناءات فارغة.</p>}
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
                <h3 className="text-sm font-bold text-white">سجل تسويات إيرادات الملاك</h3>
                <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">تتبع الحوالات الموجهة لحسابات الملاك بعد استقطاع الرسوم</p>
              </div>
              <div className="p-6 space-y-4">

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--nc-surface-solid)] border-y border-white/5 text-[var(--nc-text-dim)] text-[11px] font-bold">
                      <th className="py-3 px-4">رقم التسوية</th>
                      <th className="py-3 px-4">رقم العقد</th>
                      <th className="py-3 px-4">المبلغ الإجمالي</th>
                      <th className="py-3 px-4">خصومات إدارية (10%)</th>
                      <th className="py-3 px-4">صافي المالك</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map(s => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{s.id}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">{s.contractId}</td>
                        <td className="py-3.5 px-4 text-[var(--nc-text-dim)]">{s.gross.toLocaleString()} SAR</td>
                        <td className="py-3.5 px-4 text-rose-400 font-mono">-{s.deductions.toLocaleString()} SAR</td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">{s.net.toLocaleString()} SAR</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            s.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {s.status === 'completed' ? 'مكتمل ومرحل للدفتر العام' : 'قيد التحويل والتسوية'}
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

          {/* ── Telemetry Event Bus Logger Console ── */}
          <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-3xl p-5 shadow-2xl flex flex-col max-h-[400px] space-y-3 mt-6 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <Bot size={15} />
                سجل تتبع أحداث العقود والمدفوعات الفورية (Telemetry Event Bus Logs)
              </h4>
              <button 
                onClick={() => setTelemetryLogs([])}
                className="text-[10px] text-[var(--nc-text-dim)] hover:text-[var(--nc-text-dim)] border border-white/5 px-2 py-0.5 rounded"
              >
                مسح السجل
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed max-h-[300px]">
              {telemetryLogs.length === 0 ? (
                <div className="text-center text-[var(--nc-text-dim)] py-8 text-[11px]">لا توجد أحداث مسجلة حالياً</div>
              ) : (
                telemetryLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-[var(--nc-surface)] dark:bg-white/5 border border-white/5 rounded-xl space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-[#8EB1D1] font-bold">[{log.type.toUpperCase()}]</span>
                      <span className="text-[var(--nc-text-dim)]">{log.timestamp}</span>
                    </div>
                    <pre className="text-[9px] text-[var(--nc-text-dim)] bg-[var(--nc-surface)] border border-white/5 p-1.5 rounded overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );

  if (!mounted) return <div className="p-10 text-[var(--nc-foreground)]">جاري التهيئة...</div>;

  return (
    <div className="nc-page nc-stack" dir="rtl">

      {/* Header */}
      <PageHeader
        title="نظام العقود والمدفوعات والتسويات"
        description="إدارة عقود الإيجار، الفواتير، تحصيل المدفوعات والتسوية المالية مع خدمة المحاسبة."
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-accent)] text-xs font-semibold">
          <i className="ph-bold ph-file-text"></i>
          {isLoading ? 'جاري التحميل...' : `${leases.length} عقد نشط`}
        </div>
      </PageHeader>

      <LayoutContainer
        kpis={kpisContent}
        actions={actionsContent}
        insights={insightsContent}
        details={detailsContent}
      />

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
              إضافة عقد إيجار جديد
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">رقم أو رمز الوحدة العقارية:</label>
              <input 
                type="text"
                required
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="مثال: A-101"
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">اسم المستأجر:</label>
              <input 
                type="text"
                required
                value={newTenant}
                onChange={(e) => setNewTenant(e.target.value)}
                placeholder="الاسم الكامل للمستأجر..."
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <DateField 
                  value={newStart}
                  onChange={(val) => setNewStart(val)}
                  label="بداية العقد (DateField)"
                />
              </div>
              <div className="space-y-1">
                <DateField 
                  value={newEnd}
                  onChange={(val) => setNewEnd(val)}
                  label="نهاية العقد (DateField)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">قيمة الإيجار الدوري (SAR):</label>
                <input 
                  type="number"
                  required
                  value={newRent}
                  onChange={(e) => setNewRent(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">قيمة التأمين Locked (SAR):</label>
                <input 
                  type="number"
                  required
                  value={newDeposit}
                  onChange={(e) => setNewDeposit(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
              >
                تأكيد وتسجيل العقد
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal 2: Create Invoice Form (Prefilled contractId support) ── */}
      {activeModal === 'create_invoice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateInvoice}
            className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-white/5 pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              إصدار فاتورة إيجارية
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">رقم العقد (Contract ID):</label>
              <input 
                type="text"
                required
                disabled={!!prefilledContractId}
                value={prefilledContractId || invoiceContractId}
                onChange={(e) => setInvoiceContractId(e.target.value)}
                placeholder="مثال: L-1001"
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1] disabled:opacity-50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">قيمة الفاتورة المفوترة (SAR):</label>
              <input 
                type="number"
                required
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <DateField 
                value={invoiceDue}
                onChange={(val) => setInvoiceDue(val)}
                label="تاريخ الاستحقاق النهائي (DateField)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
              >
                إصدار الفاتورة وتنبيه العميل
              </button>
              <button 
                type="button"
                onClick={() => {
                  setPrefilledContractId('');
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                إلغاء
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
              تسجيل تحصيل سداد الفاتورة
            </h3>
            
            <div className="space-y-2 bg-[var(--nc-surface)] border border-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-[var(--nc-text-dim)]">رقم الفاتورة:</span>
                <span className="text-white font-bold">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--nc-text-dim)]">القيمة الإجمالية المطلوبة:</span>
                <span className="text-emerald-400 font-bold">{selectedInvoice.amount.toLocaleString()} ر.س</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">طريقة التحصيل:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                >
                  <option value="bank">تحويل بنكي مباشر</option>
                  <option value="card">بطاقة مدى / ائتمانية</option>
                  <option value="cash">نقدي</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] block">رقم المرجع (Transaction Ref):</label>
                <input 
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="رقم الحوالة البنكية..."
                  className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <DateField 
                value={payDate}
                onChange={(val) => setPayDate(val)}
                label="تاريخ الاستلام والتحصيل (DateField)"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] block">مفتاح تفادي التكرار (Idempotency Key):</label>
              <input 
                type="text"
                disabled
                value={payIdempotencyKey}
                className="w-full bg-[var(--nc-surface-strong)] border border-white/10 rounded-xl p-2.5 text-[var(--nc-text-dim)] outline-none font-mono text-[10px]"
              />
              <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">يمنع هذا المفتاح تكرار تسجيل عمليات السداد عند الضغط المتكرر.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
              >
                تأكيد التحصيل والتسوية
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}




