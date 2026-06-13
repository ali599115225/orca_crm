import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'بوابة المالك — أوركا',
  description: 'نظرة شاملة لممتلكاتك وإيراداتك وحالة الإشغال والعقود',
};

const cardClass = "bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-2xl p-5";
const metricClass = "text-2xl font-black text-[var(--nc-text-primary)]";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1";

export default async function OwnerPortalPage() {
  const tenant = await getActiveTenant();
  const session = await getSession();
  const ownerName = (session?.name || session?.email || "المالك") as string;
  const ownerUserId = session?.userId;
  const safeCompanyName = (tenant?.companyName || "الشركة") as string;

  const [contracts, units, rentalLeases, rentalInvoices, maintenanceTickets, installments] = await Promise.all([
    prisma.contract.findMany({
      where: { unit: { project: { tenantId: tenant.id } }, buyerName: ownerName },
      include: { unit: { include: { project: { select: { name: true, city: true } } } }, installments: { select: { amountSar: true, paymentStatus: true } } },
      orderBy: { signedAt: 'desc' },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenant.id },
      include: { project: { select: { name: true } }, contract: { select: { id: true, buyerName: true } } },
    }),
    prisma.rentalLease.findMany({
      where: { tenantId: tenant.id, status: 'active' },
      include: { invoices: { select: { totalAmount: true, status: true } } },
    }),
    prisma.rentalInvoice.aggregate({
      where: { tenantId: tenant.id },
      _sum: { totalAmount: true },
    }),
    prisma.maintenanceTicket.findMany({
      where: { tenantId: tenant.id, reportedBy: ownerName },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.installment.findMany({
      where: { tenantId: tenant.id, paymentStatus: 'Paid' },
      select: { amountSar: true, dueDate: true },
      orderBy: { dueDate: 'desc' },
      take: 500,
    }),
  ]);

  const ownerUnits = units.filter(u => u.contract?.buyerName === ownerName);
  const totalUnits = ownerUnits.length;
  const occupiedUnits = ownerUnits.filter(u => u.contract).length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupiedPercent = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';
  const vacantPercent = totalUnits > 0 ? ((vacantUnits / totalUnits) * 100).toFixed(1) : '0';

  const totalContractVolume = contracts.reduce((s, c) => s + Number(c.totalVolumeSar), 0);
  const activeContracts = contracts.filter(c => c.status === 'Active').length;

  const totalRentalRevenue = Number(rentalInvoices._sum.totalAmount || 0);

  const totalInstallmentsPaid = installments.reduce((s, i) => s + Number(i.amountSar), 0);

  const monthsRevenue: Record<string, number> = {};
  installments.forEach(i => {
    const d = new Date(i.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsRevenue[key] = (monthsRevenue[key] || 0) + Number(i.amountSar);
  });
  const sortedMonths = Object.entries(monthsRevenue).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  const activeRentalLeases = rentalLeases.filter(l => l.status === 'active').length;
  const overdueInstallments = contracts.reduce((s, c) => s + c.installments.filter(i => i.paymentStatus !== 'Paid').length, 0);

  const statusCounts: Record<string, number> = {};
  maintenanceTickets.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  return (
    <div className="min-h-screen p-6 space-y-6" dir="rtl">

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--nc-text-primary)]">بوابة المالك</h1>
          <p className="text-xs text-[var(--nc-text-dim)]">{ownerName} — {safeCompanyName}</p>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass}>
          <p className={labelClass}>إجمالي قيمة العقود</p>
          <h3 className={metricClass}>{totalContractVolume.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{activeContracts} عقد نشط</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>إيرادات الإيجار</p>
          <h3 className={metricClass}>{totalRentalRevenue.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{activeRentalLeases} عقد إيجار نشط</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>الأقساط المحصلة</p>
          <h3 className={"text-2xl font-black text-emerald-400"}>{totalInstallmentsPaid.toLocaleString()} <span className="text-sm font-medium">ر.س</span></h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{overdueInstallments > 0 ? `${overdueInstallments} أقساط متأخرة` : 'لا توجد أقساط متأخرة'}</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>بلاغات الصيانة</p>
          <h3 className={metricClass}>{maintenanceTickets.length}</h3>
          <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">{statusCounts['pending'] || 0} معلق | {statusCounts['in_progress'] || 0} قيد التنفيذ | {statusCounts['completed'] || 0} مكتمل</p>
        </div>
      </div>

      {/* Occupancy Dashboard */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">لوحة الإشغال</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-[var(--nc-surface-solid)] rounded-xl p-4">
            <p className="text-[10px] text-[var(--nc-text-dim)] font-bold uppercase">إجمالي الوحدات</p>
            <p className="text-2xl font-black text-[var(--nc-text-primary)] mt-1">{totalUnits}</p>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4">
            <p className="text-[10px] text-emerald-400 font-bold uppercase">وحدات مشغولة</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{occupiedUnits} <span className="text-sm">({occupiedPercent}%)</span></p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-4">
            <p className="text-[10px] text-amber-400 font-bold uppercase">وحدات شاغرة</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{vacantUnits} <span className="text-sm">({vacantPercent}%)</span></p>
          </div>
        </div>
        <div className="mt-4 w-full bg-[var(--nc-surface-solid)] rounded-full h-3 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${occupiedPercent}%` }} />
        </div>
      </div>

      {/* Revenue Monthly */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">الإيرادات الشهرية (آخر 6 أشهر)</h2>
        {sortedMonths.length === 0 ? (
          <p className="text-xs text-[var(--nc-text-dim)]">لا توجد بيانات إيرادات شهرية بعد</p>
        ) : (
          <div className="space-y-3">
            {sortedMonths.map(([month, amount]) => {
              const [y, m] = month.split('-');
              const monthAr = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][Number(m)];
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-24 text-[11px] text-[var(--nc-text-dim)] font-bold">{monthAr} {y}</span>
                  <div className="flex-1 bg-[var(--nc-surface-solid)] rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-[var(--nc-accent)] rounded-full" style={{ width: `${Math.min(100, (amount / (totalContractVolume || 1)) * 100)}%` }} />
                  </div>
                  <span className="w-28 text-left text-xs font-bold text-[var(--nc-text-primary)]">{amount.toLocaleString()} ر.س</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contracts Table + Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">العقود ({contracts.length})</h2>
          <div className="overflow-x-auto">
            <table className="nc-table text-xs">
              <thead>
                <tr>
                  <th>رقم العقد</th>
                  <th>المشتري</th>
                  <th>الوحدة</th>
                  <th>المشروع</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {contracts.slice(0, 10).map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-[var(--nc-text-dim)]">{c.id.slice(0, 8)}...</td>
                    <td className="font-bold text-[var(--nc-text-primary)]">{c.buyerName}</td>
                    <td className="text-[var(--nc-text-dim)]">{c.unit.unitNumber}</td>
                    <td className="text-[var(--nc-text-dim)]">{c.unit.project.name}</td>
                    <td className="font-bold">{Number(c.totalVolumeSar).toLocaleString()} ر.س</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {c.status === 'Active' ? 'نشط' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[var(--nc-text-dim)]">لا توجد عقود بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">الوحدات ({units.length})</h2>
          <div className="overflow-x-auto">
            <table className="nc-table text-xs">
              <thead>
                <tr>
                  <th>رقم الوحدة</th>
                  <th>المشروع</th>
                  <th>النوع</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th>المالك</th>
                </tr>
              </thead>
              <tbody>
                {ownerUnits.slice(0, 10).map(u => (
                  <tr key={u.id}>
                    <td className="font-bold text-[var(--nc-text-primary)]">{u.unitNumber}</td>
                    <td className="text-[var(--nc-text-dim)]">{u.project.name}</td>
                    <td className="text-[var(--nc-text-dim)]">{u.type || '—'}</td>
                    <td className="font-bold">{Number(u.priceSar).toLocaleString()} ر.س</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${u.contract ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {u.contract ? 'مباعة' : (u.status || 'متاحة')}
                      </span>
                    </td>
                    <td className="text-[var(--nc-text-dim)]">{u.contract?.buyerName || '—'}</td>
                  </tr>
                ))}
                {ownerUnits.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[var(--nc-text-dim)]">لا توجد وحدات بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Maintenance Status */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">حالة الصيانة ({maintenanceTickets.length})</h2>
        {maintenanceTickets.length === 0 ? (
          <p className="text-xs text-[var(--nc-text-dim)]">لا توجد بلاغات صيانة حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="nc-table text-xs">
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>الفئة</th>
                  <th>الأولوية</th>
                  <th>الحالة</th>
                  <th>الفني المعين</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceTickets.map(t => (
                  <tr key={t.id}>
                    <td className="font-bold text-[var(--nc-text-primary)]">{t.title}</td>
                    <td className="text-[var(--nc-text-dim)]">{t.category === 'electrical' ? 'كهرباء' : t.category === 'plumbing' ? 'سباكة' : t.category === 'hvac' ? 'تكييف' : t.category === 'structural' ? 'إنشائي' : 'أخرى'}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : t.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {t.priority === 'HIGH' ? 'عاجل' : t.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                      </span>
                    </td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : t.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {t.status === 'pending' ? 'معلق' : t.status === 'in_progress' ? 'قيد التنفيذ' : t.status === 'completed' ? 'مكتمل' : t.status}
                      </span>
                    </td>
                    <td className="text-[var(--nc-text-dim)]">{t.assignedTo || '—'}</td>
                    <td className="font-bold">{t.estimatedCost ? `${Number(t.estimatedCost).toLocaleString()} ر.س` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">المستندات ({contracts.length})</h2>
        {contracts.length === 0 ? (
          <p className="text-xs text-[var(--nc-text-dim)]">لا توجد مستندات متاحة للتحميل حالياً</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {contracts.slice(0, 9).map(c => (
              <a
                key={c.id}
                href={`/api/v1/contracts/${c.id}/pdf?download=1`}
                target="_blank"
                className="bg-[var(--nc-surface-solid)] rounded-xl p-3 border border-[var(--nc-glass-border)] flex items-center gap-3 hover:bg-white/5 transition-colors no-underline"
              >
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-xs font-bold text-[var(--nc-text-primary)]">عقد رقم — {c.id.slice(0, 8)}...</p>
                  <p className="text-[10px] text-[var(--nc-text-dim)]">المشتري: {c.buyerName}</p>
                  <p className="text-[10px] text-[var(--nc-accent)]">⬇ تحميل PDF</p>
                </div>
              </a>
            ))}
            {contracts.length > 9 && (
              <p className="text-[10px] text-[var(--nc-text-dim)] col-span-full">+{contracts.length - 9} مستندات إضافية</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
