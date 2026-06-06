'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Calculator, Megaphone, Plus, Search, Eye,
  ShieldAlert, Landmark, ChevronRight, AlertCircle, FileCheck, ArrowRight,
  UserCheck, CloudUpload, Key, Trash2, Settings, Bot, Clock, HelpCircle, CheckCircle2
} from 'lucide-react';
import { DateField } from '@/components/ui/DateField';

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

  // RBAC checks
  const [currentUserRole, setCurrentUserRole] = useState<string>('ADMIN');

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

  useEffect(() => {
    setMounted(true);
    // Generate an idempotency key initially
    setPayIdempotencyKey('idemp-' + Math.floor(100000 + Math.random() * 900000));
  }, []);

  if (!mounted) return <div className="p-10 text-slate-900 dark:text-white">جاري التهيئة...</div>;

  const addTelemetryEvent = (type: string, payload: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      actorId: `usr_${currentUserRole.toLowerCase()}`,
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
  };

  const isAllowed = (action: string) => {
    const roles: Record<string, string[]> = {
      ADMIN:              ['VIEW', 'CREATE_LEASE', 'CREATE_INVOICE', 'PAY_INVOICE', 'MANAGE_RECONCILE', 'REQUEST_SETTLEMENT'],
      accountant:         ['VIEW', 'CREATE_INVOICE', 'PAY_INVOICE', 'MANAGE_RECONCILE'],
      rental_manager:     ['VIEW', 'CREATE_LEASE', 'CREATE_INVOICE', 'REQUEST_SETTLEMENT'],
      owner:              ['VIEW', 'REQUEST_SETTLEMENT']
    };
    return (roles[currentUserRole] || []).includes(action);
  };

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
  const handleCreateLease = (e: React.FormEvent) => {
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

    const leaseId = 'L-' + Math.floor(1004 + Math.random() * 900);
    const newL: Lease = {
      id: leaseId,
      unit: newUnit,
      tenant: newTenant,
      start: newStart,
      end: newEnd,
      rent: Number(newRent),
      currency: 'SAR',
      status: 'active',
      deposit: Number(newDeposit),
      financialRef: null
    };

    setLeases(prev => [...prev, newL]);
    
    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: leaseId,
      type: 'lease.created',
      timestamp: new Date().toISOString(),
      note: `تم إنشاء العقد بنجاح للوحدة ${newUnit}`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('lease.created', {
      contractId: leaseId,
      unit: newUnit,
      tenant: newTenant,
      start: newStart,
      end: newEnd,
      rent: newRent,
      deposit: newDeposit,
      actorId: `usr_${currentUserRole.toLowerCase()}`,
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
    setSelectedLeaseId(leaseId);
    alert(`تم تسجيل العقد الجديد ${leaseId} بنجاح!`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
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

    const isContractValid = leases.some(l => l.id === targetContractId);
    if (!isContractValid) {
      alert('معرف العقد المحدد غير موجود.');
      return;
    }

    let finalAmount = invoiceAmount;
    if (enableZakat) {
      // Add VAT 15%
      finalAmount = Math.round(invoiceAmount * 1.15);
      addTelemetryEvent('zakat.tax_calculated', { invoiceAmount, vat: Math.round(invoiceAmount * 0.15), total: finalAmount });
    }

    const invId = 'INV-' + Math.floor(9006 + Math.random() * 900);
    const newInv: Invoice = {
      id: invId,
      contractId: targetContractId,
      due: invoiceDue,
      amount: finalAmount,
      status: 'unpaid'
    };

    setInvoices(prev => [...prev, newInv]);

    const newEv: EventLog = {
      id: `ev_${Date.now()}`,
      contractId: targetContractId,
      type: 'invoice.issued',
      timestamp: new Date().toISOString(),
      note: `تم إصدار الفاتورة رقم ${invId} بمبلغ ${finalAmount.toLocaleString()} ر.س`
    };
    setEvents(prev => [...prev, newEv]);

    addTelemetryEvent('invoice.issued', {
      contractId: targetContractId,
      invoiceId: invId,
      actorId: `usr_${currentUserRole.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      status: 'unpaid',
      payload: { due: invoiceDue, amount: finalAmount, currency: 'SAR' }
    });

    setInvoiceDue('');
    setInvoiceAmount(0);
    setInvoiceContractId('');
    setPrefilledContractId('');
    setActiveModal(null);
    alert(`تم إصدار الفاتورة ${invId} بنجاح!`);
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
      actorId: `usr_${currentUserRole.toLowerCase()}`,
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
      actorId: `usr_${currentUserRole.toLowerCase()}`,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* ── Role Selector Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-[#8EB1D1] shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">التحكم بالصلاحيات والإعدادات التشغيلية</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">محاكاة قيود الصلاحيات المطبقة على العقود والمدفوعات والمصالحة</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-slate-200/50 dark:bg-white/5 p-1.5 rounded-lg border border-slate-200/50 dark:border-white/10">
            {[
              { id: 'ADMIN', name: 'مدير نظام (Admin)' },
              { id: 'accountant', name: 'المحاسب (Accountant)' },
              { id: 'rental_manager', name: 'مدير الإيجار' },
              { id: 'owner', name: 'المالك' }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => {
                  setCurrentUserRole(role.id);
                  addTelemetryEvent('system.role_changed', { newRole: role.id });
                }}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  currentUserRole === role.id 
                    ? 'bg-[#8EB1D1] text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-slate-200/50 dark:bg-white/5 p-2 rounded-lg border border-slate-200/50 dark:border-white/10">
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableZakat} 
                onChange={(e) => {
                  setEnableZakat(e.target.checked);
                  addTelemetryEvent('system.feature_flag_changed', { flag: 'enableZakat', value: e.target.checked });
                }} 
                className="rounded bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-slate-200/50 dark:border-white/10 text-[#8EB1D1]"
              />
              <span>تفعيل VAT (15%)</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350 font-bold cursor-pointer border-r border-slate-200/50 dark:border-white/10 pr-3">
              <input 
                type="checkbox" 
                checked={enableCompliance} 
                onChange={(e) => {
                  setEnableCompliance(e.target.checked);
                  addTelemetryEvent('system.feature_flag_changed', { flag: 'enableCompliance', value: e.target.checked });
                }} 
                className="rounded bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-slate-200/50 dark:border-white/10 text-[#8EB1D1]"
              />
              <span>تفعيل AML Check</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Dashboard KPIs Pane ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs text-slate-700 dark:text-slate-350 font-bold">إجمالي المستحقات المفوترة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2">{totalReceivables.toLocaleString()} SAR</span>
        </div>
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-slate-700 dark:text-slate-350 font-bold">مبالغ متأخرة عن السداد</span>
            {overdueInvoicesCount > 0 && <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black px-1.5 py-0.5 rounded-full shrink-0">تنبيه متأخرات</span>}
          </div>
          <span className="text-xl font-black text-rose-400 mt-2">{totalOverdue.toLocaleString()} SAR</span>
        </div>
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs text-slate-700 dark:text-slate-350 font-bold">دفعات محصلة هذا الشهر</span>
          <span className="text-xl font-black text-emerald-400 mt-2">{collectedThisMonth.toLocaleString()} SAR</span>
        </div>
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <span className="text-xs text-slate-700 dark:text-slate-350 font-bold">طلبات تسوية معلقة للملاك</span>
          <span className="text-xl font-black text-cyan-400 mt-2">{pendingSettlementsCount} طلبات</span>
        </div>
      </div>

      {/* ── Alerts & Intelligent Assistant ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 rounded-2xl space-y-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <AlertCircle className="text-[#8EB1D1]" size={14} />
            إشعارات وتنبيهات عاجلة
          </h4>
          <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 pr-2 list-disc list-inside">
            {overdueInvoicesCount > 0 && <li>يوجد {overdueInvoicesCount} فواتير معلقة متأخرة عن السداد تجاوزت تاريخ الاستحقاق.</li>}
            {expiredLeasesCount > 0 && <li>يوجد {expiredLeasesCount} عقود إيجارية منتهية الصلاحية معلقة وتطلب تسوية المالك أو التجديد.</li>}
            {leases.some(l => l.financialRef === null && l.status === 'expired') && <li>مطلوب تسوية مالي لعقد الإيجار المنتهي L-1002.</li>}
          </ul>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 rounded-2xl space-y-2">
          <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <Bot size={14} />
            إجراءات المحاسبة الذكية المقترحة (AI Agent)
          </h4>
          <div className="flex flex-wrap gap-2 pt-1">
            <button 
              onClick={() => {
                const overdueInvs = invoices.filter(i => i.status === 'overdue');
                if (overdueInvs.length === 0) {
                  alert('لا يوجد فواتير متأخرة لإرسال تذكيرات.');
                  return;
                }
                overdueInvs.forEach(inv => {
                  addTelemetryEvent('invoice.reminder_sent', { invoiceId: inv.id, contractId: inv.contractId });
                });
                alert(`تم إرسال رسائل تذكير عبر الواتساب والبريد الإلكتروني للـ ${overdueInvs.length} فواتير متأخرة بنجاح.`);
              }}
              className="px-2.5 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-[#8EB1D1]/20 hover:border-[#8EB1D1]/40 text-[#8EB1D1] text-[10px] font-bold rounded-lg transition-all"
            >
              إرسال تنبيهات سداد الفواتير المتأخرة
            </button>
            <button 
              onClick={() => {
                setActivePane('reconciliation');
                alert('توجيه لتبويب المصالحة البنكية.');
              }}
              className="px-2.5 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 text-[10px] font-bold rounded-lg transition-all"
            >
              تشغيل مصالحة بنكية فورية
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Controller Bar ── */}
      <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">إدارة العقود والمدفوعات (Contracts & Payments)</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">تسجيل عقود الإيجار، إصدار فواتير الدفعات الدورية، وتتبع التسويات المالية المعتمدة للملاك</p>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'leases', name: 'العقود' },
            { id: 'invoices', name: 'الفواتير' },
            { id: 'reconciliation', name: 'المصالحة البنكية' },
            { id: 'settlements', name: 'التسويات والـ Payouts' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                startTransition(() => {
                  setActivePane(t.id as any);
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePane === t.id 
                  ? 'bg-[#8EB1D1] text-slate-900 dark:text-white shadow-md' 
                  : 'bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-200/50 dark:border-white/10'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panes Render ── */}
      {isPending ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-3 border-[#8EB1D1] border-t-transparent animate-spin"></div>
          <span className="text-xs text-slate-700 dark:text-slate-350 font-bold">جاري تحميل بيانات القسم...</span>
        </div>
      ) : (
        <div className="orca-view-enter">
          
          {/* ── Pane 1: Leases (Master-Detail) ── */}
          {activePane === 'leases' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Leases List (Master) */}
              <div className="w-full lg:w-[45%] bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-white/10">
                  <span className="text-xs font-black text-slate-900 dark:text-white">قائمة عقود الإيجار</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (!isAllowed('CREATE_LEASE')) {
                          alert('عذراً، لا تملك الصلاحية لإضافة عقد جديد.');
                          return;
                        }
                        setActiveModal('new_lease');
                      }}
                      className="px-3 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-slate-900 dark:text-white text-[11px] font-black rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      عقد جديد
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 text-slate-500 dark:text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="بحث باسم المستأجر، العقد أو الوحدة..."
                      value={leaseSearch}
                      onChange={(e) => setLeaseSearch(e.target.value)}
                      className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl pr-8 pl-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <select
                    value={leaseStatusFilter}
                    onChange={(e) => setLeaseStatusFilter(e.target.value)}
                    className="bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
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
                      <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
                        <th className="pb-3 px-2">رقم العقد</th>
                        <th className="pb-3 px-2">الوحدة</th>
                        <th className="pb-3 px-2">المستأجر</th>
                        <th className="pb-3 px-2">الحالة</th>
                        <th className="pb-3 px-2 text-left">الإيجار</th>
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
                          <td className="py-3.5 px-2 font-bold text-slate-900 dark:text-white">{l.id}</td>
                          <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400 font-mono">{l.unit}</td>
                          <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400">{l.tenant}</td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                              l.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : l.status === 'expired'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/30'
                            }`}>
                              {l.status === 'active' ? 'نشط' : l.status === 'expired' ? 'منتهي' : 'ملغى'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-left text-slate-900 dark:text-white font-bold">{l.rent.toLocaleString()} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lease Detail Panel (Detail) */}
              <div className="flex-1 w-full bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-3xl shadow-xl min-h-[460px]">
                {!selectedLease ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs py-20">
                    <Landmark size={48} className="text-slate-700 mb-3" />
                    <span>الرجاء تحديد عقد إيجاري من القائمة اليسرى لعرض تفاصيله وملخصات السداد</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Detail Panel Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-white/10 pb-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          {selectedLease.id}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            selectedLease.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {selectedLease.status === 'active' ? 'عقد نشط' : 'عقد منتهي'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">الوحدة: {selectedLease.unit} | المستأجر: {selectedLease.tenant}</p>
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
                          className="px-3 py-1.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-slate-900 dark:text-white text-[11px] font-black rounded-lg transition-all"
                        >
                          إصدار فاتورة للعقد
                        </button>

                        {selectedLease.status === 'expired' && !selectedLease.financialRef && (
                          <button
                            onClick={() => handleRequestSettlement(selectedLease.id, selectedLease.rent * 12)}
                            className="px-3 py-1.5 bg-[#0081a7] hover:bg-[#007090] text-slate-900 dark:text-white text-[11px] font-black rounded-lg transition-all"
                          >
                            طلب تسوية المالك Payout
                          </button>
                        )}
                        <button
                          onClick={() => {
                            addTelemetryEvent('lease.reminder_sent', { contractId: selectedLease.id });
                            alert('تم إرسال تذكير سياقي آلي للمستأجر بنجاح.');
                          }}
                          className="px-3 py-1.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[11px] font-black rounded-lg border border-white/5 transition-all"
                        >
                          إرسال تذكير
                        </button>
                      </div>
                    </div>

                    {/* Sub-tabs list */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-200/50 dark:border-white/10 pb-2.5">
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
                              ? 'bg-[#8EB1D1] text-slate-900 dark:text-white shadow-sm' 
                              : 'bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-white/5'
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    {/* Sub-tab Panes */}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      
                      {/* Summary Tab */}
                      {detailActiveTab === 'summary' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-200/40 dark:bg-white/5 p-4 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block">تاريخ صلاحية العقد</span>
                              <span className="font-bold text-slate-900 dark:text-white mt-1.5 block">
                                {formatDateToDDMMYYYY(selectedLease.start)} — {formatDateToDDMMYYYY(selectedLease.end)}
                              </span>
                            </div>
                            <div className="bg-slate-200/40 dark:bg-white/5 p-4 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block">القيمة الإيجارية الدورية</span>
                              <span className="font-bold text-slate-900 dark:text-white mt-1.5 block">{selectedLease.rent.toLocaleString()} {selectedLease.currency}</span>
                            </div>
                            <div className="bg-slate-200/40 dark:bg-white/5 p-4 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block">تأمين مسترد Locked</span>
                              <span className="font-bold text-slate-900 dark:text-white mt-1.5 block">{selectedLease.deposit.toLocaleString()} {selectedLease.currency}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-2 font-mono">
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
                              <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
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
                                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">{inv.id}</td>
                                  <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{formatDateToDDMMYYYY(inv.due)}</td>
                                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">{inv.amount.toLocaleString()} ر.س</td>
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
                                        className="px-2 py-0.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-[#8EB1D1]/20 hover:border-[#8EB1D1]/40 text-[#8EB1D1] rounded text-[10px] font-bold transition-all"
                                      >
                                        سداد الفاتورة
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        addTelemetryEvent('invoice.reminder_sent', { invoiceId: inv.id, contractId: inv.contractId });
                                        alert(`تم إرسال تذكير سداد للفاتورة ${inv.id}.`);
                                      }}
                                      className="px-2 py-0.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-slate-700 hover:border-slate-500 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded text-[10px] font-bold transition-all ml-1"
                                    >
                                      تذكير
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {invoices.filter(i => i.contractId === selectedLease.id).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">لا توجد فواتير مرتبطة بهذا العقد حالياً.</td>
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
                              <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
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
                                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">{pay.id}</td>
                                  <td className="py-2.5 font-mono text-cyan-400">{pay.invoiceId}</td>
                                  <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{formatDateToDDMMYYYY(pay.date)}</td>
                                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{pay.method === 'bank' ? 'تحويل بنكي' : pay.method === 'card' ? 'بطاقة ائتمانية' : 'نقدي'}</td>
                                  <td className="py-2.5 text-left text-slate-900 dark:text-white font-bold">{pay.amount.toLocaleString()} ر.س</td>
                                </tr>
                              ))}
                              {payments.filter(p => invoices.some(i => i.id === p.invoiceId && i.contractId === selectedLease.id)).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">لا توجد دفعات محصلة بعد.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Documents Tab */}
                      {detailActiveTab === 'docs' && (
                        <div className="space-y-4">
                          <div className="bg-slate-200/40 dark:bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">إضافة مستند أو ملف عقد مصدق:</span>
                            <div className="flex gap-2">
                              <input type="file" className="text-[10px] text-slate-500 dark:text-slate-400" />
                              <button 
                                onClick={() => {
                                  addTelemetryEvent('document.uploaded', { contractId: selectedLease.id, docType: 'lease_agreement' });
                                  alert('تم رفع مستند العقد بنجاح.');
                                }}
                                className="px-3 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 hover:bg-white/5 rounded text-[10px] text-slate-900 dark:text-white"
                              >
                                رفع الملف
                              </button>
                            </div>
                          </div>

                          <ul className="space-y-2 pr-2 list-disc list-inside">
                            <li>
                              <a href="#" onClick={(e) => { e.preventDefault(); alert('تحميل مسودة العقد المصدق...'); }} className="text-cyan-400 hover:underline">عقد_إيجار_موحد_{selectedLease.id}.pdf</a>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono ml-2">(حجم: 1.2 MB)</span>
                            </li>
                          </ul>
                        </div>
                      )}

                      {/* Settlements Tab */}
                      {detailActiveTab === 'settlements' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
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
                                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">{settle.id}</td>
                                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{settle.gross.toLocaleString()} SAR</td>
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
                                  <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">لا توجد تسويات مالية مرتبطة بهذا العقد.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Events Tab */}
                      {detailActiveTab === 'events' && (
                        <div className="space-y-4">
                          <div className="border-r-2 border-slate-200/50 dark:border-white/10 pr-4 space-y-3">
                            {events.filter(e => e.contractId === selectedLease.id).map(evt => (
                              <div key={evt.id} className="relative">
                                <div className="absolute right-[-21px] top-1 w-2 h-2 rounded-full bg-[#8EB1D1]"></div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-bold text-slate-200">[{evt.type}]</span>
                                  <span className="font-mono">{evt.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{evt.note}</p>
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
          )}

          {/* ── Pane 2: Invoices ── */}
          {activePane === 'invoices' && (
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">جدول جميع الفواتير الصادرة</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">تصفية ومتابعة الفواتير المحصلة والمعلقة</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-2 text-slate-500 dark:text-slate-400" size={13} />
                    <input 
                      type="text"
                      placeholder="بحث برقم الفاتورة أو العقد..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none w-52 focus:border-[#8EB1D1]/40"
                    />
                  </div>
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
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
                    <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
                      <th className="pb-3 px-4">رقم الفاتورة</th>
                      <th className="pb-3 px-4">العقد المرتبط</th>
                      <th className="pb-3 px-4">تاريخ الاستحقاق</th>
                      <th className="pb-3 px-4">المبلغ المالي</th>
                      <th className="pb-3 px-4">الحالة</th>
                      <th className="pb-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{inv.id}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">{inv.contractId}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{formatDateToDDMMYYYY(inv.due)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{inv.amount.toLocaleString()} ر.س</td>
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
                              className="px-2.5 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-[#8EB1D1]/20 hover:border-[#8EB1D1]/40 text-[#8EB1D1] rounded text-[10px] font-bold transition-all"
                            >
                              سداد
                            </button>
                          )}
                          <button
                            onClick={() => {
                              addTelemetryEvent('invoice.reminder_sent', { invoiceId: inv.id, contractId: inv.contractId });
                              alert(`تم إرسال تذكير سداد للفاتورة ${inv.id}.`);
                            }}
                            className="px-2.5 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-slate-700 hover:border-slate-500 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded text-[10px] font-bold transition-all ml-1"
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
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">أداة المصالحة البنكية الفورية</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">تطابق وتدقيق الحسابات البنكية المرفوعة مع فواتير الإيجارات المستحقة</p>
              </div>

              {/* Upload file area */}
              <div className="border border-dashed border-white/10 p-8 rounded-2xl text-center space-y-3 bg-slate-200/40 dark:bg-white/5">
                <CloudUpload className="mx-auto text-[#8EB1D1]/70" size={32} />
                <div className="text-xs text-slate-500 dark:text-slate-400">قم برفع ملف الحساب البنكي (.csv / .xls) للمطابقة</div>
                <input 
                  type="file" 
                  onChange={handleBankFileUpload}
                  className="mx-auto block text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 file:text-slate-500 dark:text-slate-400 file:cursor-pointer"
                />
              </div>

              {bankFileLoaded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/50 dark:border-white/10">
                  
                  {/* Matches Proposals */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      المطابقات المقترحة (Match Recommendations)
                    </h4>

                    {reconcileMatches.map((match, idx) => (
                      <div key={idx} className="bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-4 rounded-xl border border-emerald-500/20 space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                          <span>رقم المعاملة: {match.transactionId}</span>
                          <span className="text-emerald-400">{match.amount.toLocaleString()} SAR</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{match.note}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">الفاتورة المقترحة: {match.invoiceId}</span>
                          <button
                            onClick={() => handleConfirmReconcileMatch(match)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white rounded text-[10px] font-bold transition-all"
                          >
                            تأكيد وتسوية المطابقة
                          </button>
                        </div>
                      </div>
                    ))}
                    {reconcileMatches.length === 0 && <p className="text-[11px] text-slate-500 dark:text-slate-400">لا توجد مطابقات مقترحة معلقة.</p>}
                  </div>

                  {/* Exceptions List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      قائمة الاستثناءات والعمليات غير المعرفة
                    </h4>

                    {reconcileExceptions.map((ex, idx) => (
                      <div key={idx} className="bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-4 rounded-xl border border-rose-500/20 space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                          <span>رقم المعاملة: {ex.transactionId}</span>
                          <span className="text-rose-400">{ex.amount.toLocaleString()} SAR</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{ex.note}</p>
                        <div className="flex justify-end pt-2 border-t border-slate-900">
                          <button
                            onClick={() => {
                              alert('تحويل المعاملة للفحص اليدوي من قبل قسم المالية.');
                              addTelemetryEvent('reconciliation.exception_checked', { transactionId: ex.transactionId });
                            }}
                            className="px-2.5 py-1 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-slate-700 hover:border-slate-500 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold transition-all"
                          >
                            تحديد يدوي / فحص
                          </button>
                        </div>
                      </div>
                    ))}
                    {reconcileExceptions.length === 0 && <p className="text-[11px] text-slate-500 dark:text-slate-400">قائمة الاستثناءات فارغة.</p>}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── Pane 4: Settlements (التسويات والـ Payouts) ── */}
          {activePane === 'settlements' && (
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">سجل تسويات إيرادات الملاك (General Ledger Settlements)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">تتبع الحوالات الموجهة لحسابات الملاك البنكية بعد استقطاع الرسوم</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-350 font-bold">
                      <th className="pb-3 px-4">رقم التسوية (Settlement ID)</th>
                      <th className="pb-3 px-4">رقم العقد</th>
                      <th className="pb-3 px-4">المبلغ المالي الإجمالي</th>
                      <th className="pb-3 px-4">خصومات إدارية (10%)</th>
                      <th className="pb-3 px-4">الصافي المحول للمالك</th>
                      <th className="pb-3 px-4 text-center">حالة التحويل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map(s => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{s.id}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">{s.contractId}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{s.gross.toLocaleString()} SAR</td>
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
          )}

          {/* ── Telemetry Event Bus Logger Console ── */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10/45 border border-slate-200/50 dark:border-white/10 rounded-3xl p-5 shadow-2xl space-y-3 mt-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <Bot size={15} />
                سجل تتبع أحداث العقود والمدفوعات الفورية (Telemetry Event Bus Logs)
              </h4>
              <button 
                onClick={() => setTelemetryLogs([])}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-500 dark:text-slate-400 border border-white/5 px-2 py-0.5 rounded"
              >
                مسح السجل
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed">
              {telemetryLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-[#8EB1D1] font-bold">[{log.type.toUpperCase()}]</span>
                    <span className="text-slate-500 dark:text-slate-400">{log.timestamp}</span>
                  </div>
                  <pre className="text-[9px] text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-1.5 rounded overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Modal 1: New Lease Form ── */}
      {activeModal === 'new_lease' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-inner" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateLease}
            className="relative bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-slate-200/50 dark:border-white/10 pb-2 flex items-center gap-2">
              <Plus size={18} />
              إضافة عقد إيجار جديد
            </h3>
            
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 block">رقم أو رمز الوحدة العقارية:</label>
              <input 
                type="text"
                required
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="مثال: A-101"
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 block">اسم المستأجر:</label>
              <input 
                type="text"
                required
                value={newTenant}
                onChange={(e) => setNewTenant(e.target.value)}
                placeholder="الاسم الكامل للمستأجر..."
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
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
                <label className="text-slate-500 dark:text-slate-400 block">قيمة الإيجار الدوري (SAR):</label>
                <input 
                  type="number"
                  required
                  value={newRent}
                  onChange={(e) => setNewRent(Number(e.target.value))}
                  className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 block">قيمة التأمين Locked (SAR):</label>
                <input 
                  type="number"
                  required
                  value={newDeposit}
                  onChange={(e) => setNewDeposit(Number(e.target.value))}
                  className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-slate-900 dark:text-white font-bold rounded-xl transition-all"
              >
                تأكيد وتسجيل العقد
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
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
            className="relative bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-slate-200/50 dark:border-white/10 pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              إصدار فاتورة إيجارية
            </h3>
            
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 block">رقم العقد (Contract ID):</label>
              <input 
                type="text"
                required
                disabled={!!prefilledContractId}
                value={prefilledContractId || invoiceContractId}
                onChange={(e) => setInvoiceContractId(e.target.value)}
                placeholder="مثال: L-1001"
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1] disabled:opacity-50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 block">قيمة الفاتورة المفوترة (SAR):</label>
              <input 
                type="number"
                required
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
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
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-slate-900 dark:text-white font-bold rounded-xl transition-all"
              >
                إصدار الفاتورة وتنبيه العميل
              </button>
              <button 
                type="button"
                onClick={() => {
                  setPrefilledContractId('');
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
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
            className="relative bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-slate-200/50 dark:border-white/10 pb-2 flex items-center gap-2">
              <Key size={18} />
              تسجيل تحصيل سداد الفاتورة
            </h3>
            
            <div className="space-y-2 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">رقم الفاتورة:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">القيمة الإجمالية المطلوبة:</span>
                <span className="text-emerald-400 font-bold">{selectedInvoice.amount.toLocaleString()} ر.س</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 block">طريقة التحصيل:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
                >
                  <option value="bank">تحويل بنكي مباشر</option>
                  <option value="card">بطاقة مدى / ائتمانية</option>
                  <option value="cash">نقدي</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 block">رقم المرجع (Transaction Ref):</label>
                <input 
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="رقم الحوالة البنكية..."
                  className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-[#8EB1D1]"
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
              <label className="text-slate-500 dark:text-slate-400 block">مفتاح تفادي التكرار (Idempotency Key):</label>
              <input 
                type="text"
                disabled
                value={payIdempotencyKey}
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 border border-white/10 rounded-xl p-2.5 text-slate-500 dark:text-slate-400 outline-none font-mono text-[10px]"
              />
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">يمنع هذا المفتاح تكرار تسجيل عمليات السداد عند الضغط المتكرر.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-slate-900 dark:text-white font-bold rounded-xl transition-all"
              >
                تأكيد التحصيل والتسوية
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
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