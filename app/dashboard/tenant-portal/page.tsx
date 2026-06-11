import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'بوابة المستأجر — أوركا',
  description: 'عقد الإيجار، الفواتير، المدفوعات، طلبات الصيانة والمستندات',
};

const cardClass = "bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-2xl p-5";
const metricClass = "text-2xl font-black text-[var(--nc-text-primary)]";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1";

export default async function TenantPortalPage() {
  const tenant = await getActiveTenant();
  const session = await getSession();
  const tenantName = (session?.name || session?.email || "المستأجر") as string;
  const safeCompanyName = (tenant?.companyName || "الشركة") as string;

  const [rentalLeases, maintenanceTickets] = await Promise.all([
    prisma.rentalLease.findMany({
      where: { tenantId: tenant.id, tenantName },
      include: { invoices: { orderBy: { issueDate: 'desc' } } },
      orderBy: { startDate: 'desc' },
    }),
    prisma.maintenanceTicket.findMany({
      where: { tenantId: tenant.id, reportedBy: tenantName },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const leaseIds = rentalLeases.map(l => l.id);

  const [invoices, payments] = await Promise.all([
    leaseIds.length > 0
      ? prisma.rentalInvoice.findMany({
          where: { tenantId: tenant.id, leaseId: { in: leaseIds } },
          orderBy: { issueDate: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),
    leaseIds.length > 0
      ? prisma.paymentTransaction.findMany({
          where: { tenantId: tenant.id, invoiceId: { in: leaseIds } },
          orderBy: { paidAt: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const totalPaidInvoices = invoices.filter(i => i.status === 'paid').length;
  const totalUnpaidInvoices = invoices.filter(i => i.status === 'unpaid').length;
  const totalOverdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  const unpaidAmount = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.totalAmount), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);

  const formatDate = (d: Date | null) => d ? new Date(d).toISOString().split('T')[0] : '—';

  const statusClass = (status: string) => {
    if (status === 'active' || status === 'paid' || status === 'COMPLETED' || status === 'completed' || status === 'نشط')
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (status === 'expired' || status === 'overdue' || status === 'terminated')
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    if (status === 'unpaid' || status === 'pending' || status === 'PENDING' || status === 'in_progress')
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  };

  const statusAr = (status: string) => {
    const map: Record<string, string> = {
      active: 'نشط', expired: 'منتهي', terminated: 'ملغى',
      paid: 'مدفوعة', unpaid: 'غير مدفوعة', overdue: 'متأخرة',
      COMPLETED: 'مكتملة', PENDING: 'معلقة', pending: 'معلق',
      in_progress: 'قيد التنفيذ', completed: 'مكتمل',
    };
    return map[status] || status;
  };

  const priorityAr = (p: string) => p === 'HIGH' ? 'عاجل' : p === 'MEDIUM' ? 'متوسط' : 'منخفض';
  const categoryAr = (c: string | null) => {
    const map: Record<string, string> = { electrical: 'كهرباء', plumbing: 'سباكة', hvac: 'تكييف', structural: 'إنشائي', other: 'أخرى' };
    return map[c || 'other'] || c || 'أخرى';
  };

  return (
    <div className="min-h-screen p-6 space-y-6" dir="rtl">

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--nc-text-primary)]">بوابة المستأجر</h1>
          <p className="text-xs text-[var(--nc-text-dim)]">{tenantName} — {safeCompanyName}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass}>
          <p className={labelClass}>عقود الإيجار</p>
          <h3 className={metricClass}>{rentalLeases.length}</h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{rentalLeases.filter(l => l.status === 'active').length} نشط</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>الفواتير غير المدفوعة</p>
          <h3 className={"text-2xl font-black text-rose-400"}>{unpaidAmount.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{totalUnpaidInvoices + totalOverdueInvoices} فاتورة</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>المدفوعات المسددة</p>
          <h3 className={"text-2xl font-black text-emerald-400"}>{totalPayments.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{totalPaidInvoices} فاتورة مدفوعة</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>طلبات الصيانة</p>
          <h3 className={metricClass}>{maintenanceTickets.length}</h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{maintenanceTickets.filter(t => t.status === 'pending').length} معلق</p>
        </div>
      </div>

      {/* My Leases */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">عقود الإيجار الخاصة بي</h2>
        {rentalLeases.length === 0 ? (
          <p className="text-xs text-[var(--nc-text-dim)]">لا توجد عقود إيجار حالياً</p>
        ) : (
          <div className="space-y-3">
            {rentalLeases.map(l => {
              const leaseInvoices = invoices.filter(i => i.leaseId === l.id);
              const leasePaid = leaseInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.totalAmount), 0);
              const leaseOwed = leaseInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.totalAmount), 0);
              return (
                <div key={l.id} className="bg-[var(--nc-surface-solid)] rounded-xl p-4 border border-[var(--nc-glass-border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--nc-text-primary)]">{l.unitName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusClass(l.status)}`}>{statusAr(l.status)}</span>
                      </div>
                      <p className="text-[11px] text-[var(--nc-text-dim)] mt-1">المستأجر: {l.tenantName}</p>
                      <p className="text-[11px] text-[var(--nc-text-dim)]">{formatDate(l.startDate)} — {formatDate(l.endDate)}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[9px] text-[var(--nc-text-dim)]">الإيجار الدوري</p>
                        <p className="text-sm font-bold text-[var(--nc-text-primary)]">{Number(l.rentAmount).toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[var(--nc-text-dim)]">التأمين</p>
                        <p className="text-sm font-bold text-[var(--nc-text-primary)]">{Number(l.deposit).toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[var(--nc-text-dim)]">المدفوع</p>
                        <p className="text-sm font-bold text-emerald-400">{leasePaid.toLocaleString()} ر.س</p>
                      </div>
                    </div>
                  </div>
                  {leaseOwed > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--nc-glass-border)] flex items-center gap-2">
                      <span className="text-[10px] text-rose-400 font-bold">المتبقي: {leaseOwed.toLocaleString()} ر.س</span>
                      <div className="flex-1 bg-[var(--nc-surface)] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (leasePaid / (Number(l.rentAmount) * 12 || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices + Payments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">الفواتير ({invoices.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-bold">
                  <th className="pb-2 px-2">رقم الفاتورة</th>
                  <th className="pb-2 px-2">تاريخ الإصدار</th>
                  <th className="pb-2 px-2">تاريخ الاستحقاق</th>
                  <th className="pb-2 px-2">الإجمالي</th>
                  <th className="pb-2 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map(inv => (
                  <tr key={inv.id} className="border-b border-[var(--nc-glass-border)] hover:bg-white/5">
                    <td className="py-2.5 px-2 font-mono font-bold text-[var(--nc-text-primary)]">{inv.invoicePrefix}-{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{formatDate(inv.issueDate)}</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-2 font-bold">{Number(inv.totalAmount).toLocaleString()} ر.س</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusClass(inv.status)}`}>{statusAr(inv.status)}</span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[var(--nc-text-dim)]">لا توجد فواتير بعد</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--nc-text-dim)]">
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold">مدفوعة: {totalPaidInvoices}</span>
            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg font-bold">غير مدفوعة: {totalUnpaidInvoices}</span>
            <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg font-bold">متأخرة: {totalOverdueInvoices}</span>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">سجل المدفوعات ({payments.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-bold">
                  <th className="pb-2 px-2">تاريخ الدفع</th>
                  <th className="pb-2 px-2">المبلغ</th>
                  <th className="pb-2 px-2">الرسوم</th>
                  <th className="pb-2 px-2">الصافي</th>
                  <th className="pb-2 px-2">الطريقة</th>
                  <th className="pb-2 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map(p => (
                  <tr key={p.id} className="border-b border-[var(--nc-glass-border)] hover:bg-white/5">
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{formatDate(p.paidAt)}</td>
                    <td className="py-2.5 px-2 font-bold">{Number(p.amount).toLocaleString()} ر.س</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{Number(p.fee).toLocaleString()}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-400">{Number(p.netAmount).toLocaleString()} ر.س</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{p.method === 'bank' ? 'تحويل بنكي' : p.method === 'card' ? 'بطاقة' : p.method}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusClass(p.status)}`}>{statusAr(p.status)}</span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[var(--nc-text-dim)]">لا توجد مدفوعات بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Maintenance Requests */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">طلبات الصيانة ({maintenanceTickets.length})</h2>
        {maintenanceTickets.length === 0 ? (
          <p className="text-xs text-[var(--nc-text-dim)]">لا توجد طلبات صيانة حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-bold">
                  <th className="pb-2 px-2">العنوان</th>
                  <th className="pb-2 px-2">الفئة</th>
                  <th className="pb-2 px-2">الأولوية</th>
                  <th className="pb-2 px-2">الحالة</th>
                  <th className="pb-2 px-2">الفني</th>
                  <th className="pb-2 px-2">التكلفة التقديرية</th>
                  <th className="pb-2 px-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceTickets.map(t => (
                  <tr key={t.id} className="border-b border-[var(--nc-glass-border)] hover:bg-white/5">
                    <td className="py-2.5 px-2 font-bold text-[var(--nc-text-primary)]">{t.title}</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{categoryAr(t.category)}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : t.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {priorityAr(t.priority)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${statusClass(t.status)}`}>{statusAr(t.status)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{t.assignedTo || '—'}</td>
                    <td className="py-2.5 px-2 font-bold">{t.estimatedCost ? `${Number(t.estimatedCost).toLocaleString()} ر.س` : '—'}</td>
                    <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">المستندات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rentalLeases.slice(0, 5).map(l => (
              <a
                key={l.id}
                href={`/api/v1/contracts/${l.id}/pdf?download=1`}
                target="_blank"
                className="bg-[var(--nc-surface-solid)] rounded-xl p-3 border border-[var(--nc-glass-border)] flex items-center gap-3 hover:bg-white/5 transition-colors no-underline"
              >
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-xs font-bold text-[var(--nc-text-primary)]">عقد إيجار — {l.unitName}</p>
                  <p className="text-[10px] text-[var(--nc-text-dim)]">المستأجر: {l.tenantName}</p>
                  <p className="text-[10px] text-[var(--nc-accent)]">{formatDate(l.startDate)} — {formatDate(l.endDate)} | ⬇ تحميل</p>
                </div>
              </a>
            ))}
          {rentalLeases.length === 0 && (
            <p className="text-xs text-[var(--nc-text-dim)]">لا توجد مستندات متاحة للتحميل حالياً</p>
          )}
        </div>
        {rentalLeases.length > 5 && (
          <p className="text-[10px] text-[var(--nc-text-dim)] mt-2">+{rentalLeases.length - 5} مستندات إضافية</p>
        )}
      </div>

    </div>
  );
}
