'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  reportedBy: string | null;
  assignedTo: string | null;
  unitId: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  scheduledDate: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  projectName: string;
}

interface Props {
  tenantId: string;
  tickets: Ticket[];
  units: Unit[];
  stats: {
    statusCounts: { pending: number; in_progress: number; completed: number };
    totalEstimatedCost: number;
    totalActualCost: number;
  };
}

const cardClass = "bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-2xl p-5";
const inputClass = "w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]";

const statusAr = (s: string) => {
  const m: Record<string, string> = { pending: 'معلق', in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي' };
  return m[s] || s;
};
const priorityAr = (p: string) => { const m: Record<string, string> = { HIGH: 'عاجل', MEDIUM: 'متوسط', LOW: 'منخفض' }; return m[p] || p; };
const categoryAr = (c: string | null) => { const m: Record<string, string> = { electrical: 'كهرباء', plumbing: 'سباكة', hvac: 'تكييف', structural: 'إنشائي', other: 'أخرى' }; return m[c || 'other'] || c || 'أخرى'; };
const statusColor = (s: string) => {
  if (s === 'completed') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (s === 'in_progress') return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
  if (s === 'cancelled') return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
  return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
};
const priorityColor = (p: string) => {
  if (p === 'HIGH') return 'bg-rose-500/20 text-rose-400';
  if (p === 'MEDIUM') return 'bg-amber-500/20 text-amber-400';
  return 'bg-slate-500/20 text-slate-400';
};

export default function MaintenanceView({ tenantId, tickets: initialTickets, units, stats }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newUnitId, setNewUnitId] = useState('');
  const [newReportedBy, setNewReportedBy] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/maintenance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          priority: newPriority,
          unitId: newUnitId || null,
          reportedBy: newReportedBy || null,
          estimatedCost: newEstimatedCost ? parseFloat(newEstimatedCost) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTickets(prev => [{
          ...json.ticket,
          estimatedCost: json.ticket.estimatedCost ? Number(json.ticket.estimatedCost) : null,
          actualCost: json.ticket.actualCost ? Number(json.ticket.actualCost) : null,
          scheduledDate: json.ticket.scheduledDate || null,
          completedDate: json.ticket.completedDate || null,
        }, ...prev]);
        setNewTitle(''); setNewDescription(''); setNewCategory('other'); setNewPriority('MEDIUM');
        setNewUnitId(''); setNewReportedBy(''); setNewEstimatedCost('');
        setShowCreateForm(false);
      }
    } catch (err) {
      alert('خطأ في إنشاء بلاغ الصيانة');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/maintenance/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const json = await res.json();
        if (json.success) {
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
        }
      } catch (err) {
        alert('خطأ في تحديث الحالة');
      }
    });
  };

  const handleAssignTechnician = async (ticketId: string, technician: string) => {
    startTransition(async () => {
      try {
        const name = window.prompt('اسم الفني المعين:', technician || '');
        if (!name) return;
        const res = await fetch(`/api/v1/maintenance/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: name }),
        });
        const json = await res.json();
        if (json.success) {
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignedTo: name } : t));
        }
      } catch (err) {
        alert('خطأ في تعيين الفني');
      }
    });
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (searchTerm && !t.title.includes(searchTerm) && !(t.reportedBy || '').includes(searchTerm)) return false;
    return true;
  });

  const formatDate = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : '—';

  return (
    <div className="min-h-screen p-6 space-y-6" dir="rtl">

      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--nc-text-primary)]">إدارة الصيانة</h1>
            <p className="text-xs text-[var(--nc-text-dim)]">أوامر العمل — تعيين الفنيين — تتبع التكاليف</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white text-xs font-black rounded-xl transition-colors"
        >
          {showCreateForm ? 'إلغاء' : '+ بلاغ صيانة جديد'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1">المعلق</p>
          <h3 className="text-2xl font-black text-amber-400">{stats.statusCounts.pending}</h3>
        </div>
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1">قيد التنفيذ</p>
          <h3 className="text-2xl font-black text-cyan-400">{stats.statusCounts.in_progress}</h3>
        </div>
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1">مكتمل</p>
          <h3 className="text-2xl font-black text-emerald-400">{stats.statusCounts.completed}</h3>
        </div>
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1">التكلفة التقديرية</p>
          <h3 className="text-2xl font-black text-[var(--nc-text-primary)]">{stats.totalEstimatedCost.toLocaleString()} <span className="text-sm">ر.س</span></h3>
        </div>
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1">التكلفة الفعلية</p>
          <h3 className="text-2xl font-black text-emerald-400">{stats.totalActualCost.toLocaleString()} <span className="text-sm">ر.س</span></h3>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={cardClass}>
          <h2 className="text-sm font-bold text-[var(--nc-text-primary)] mb-4">بلاغ صيانة جديد</h2>
          <form onSubmit={handleCreateTicket} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">العنوان *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className={inputClass} placeholder="وصف مختصر للمشكلة" required />
              </div>
              <div>
                <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">الفئة</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={inputClass}>
                  <option value="electrical">كهرباء</option>
                  <option value="plumbing">سباكة</option>
                  <option value="hvac">تكييف</option>
                  <option value="structural">إنشائي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">الوصف</label>
              <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className={inputClass} rows={2} placeholder="تفاصيل المشكلة..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">الأولوية</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className={inputClass}>
                  <option value="LOW">منخفض</option>
                  <option value="MEDIUM">متوسط</option>
                  <option value="HIGH">عاجل</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">الوحدة</label>
                <select value={newUnitId} onChange={e => setNewUnitId(e.target.value)} className={inputClass}>
                  <option value="">— غير محدد —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unitNumber} — {u.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--nc-text-dim)] font-bold block mb-1">تكلفة تقديرية</label>
                <input value={newEstimatedCost} onChange={e => setNewEstimatedCost(e.target.value)} type="number" min="0" className={inputClass} placeholder="ر.س" />
              </div>
            </div>
            <button type="submit" disabled={isCreating} className="px-4 py-2 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white text-xs font-black rounded-xl disabled:opacity-50">
              {isCreating ? 'جاري الإنشاء...' : 'إنشاء البلاغ'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="بحث بالعنوان أو المُبلِّغ..."
          className={inputClass + " max-w-xs"}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputClass + " max-w-[160px]"}>
          <option value="">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>
        <span className="text-[10px] text-[var(--nc-text-dim)]">{filteredTickets.length} من {tickets.length} بلاغ</span>
      </div>

      {/* Tickets Table */}
      <div className={cardClass}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-bold">
                <th className="pb-2 px-2">العنوان</th>
                <th className="pb-2 px-2">الفئة</th>
                <th className="pb-2 px-2">الأولوية</th>
                <th className="pb-2 px-2">الحالة</th>
                <th className="pb-2 px-2">الفني</th>
                <th className="pb-2 px-2">تكلفة تقديرية</th>
                <th className="pb-2 px-2">تكلفة فعلية</th>
                <th className="pb-2 px-2">تاريخ</th>
                <th className="pb-2 px-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id} className="border-b border-[var(--nc-glass-border)] hover:bg-white/5">
                  <td className="py-3 px-2 font-bold text-[var(--nc-text-primary)] max-w-[200px] truncate" title={t.title}>{t.title}</td>
                  <td className="py-3 px-2 text-[var(--nc-text-dim)]">{categoryAr(t.category)}</td>
                  <td className="py-3 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${priorityColor(t.priority)}`}>{priorityAr(t.priority)}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${statusColor(t.status)}`}>{statusAr(t.status)}</span>
                  </td>
                  <td className="py-3 px-2">
                    <button onClick={() => handleAssignTechnician(t.id, t.assignedTo || '')} className="text-cyan-400 font-bold hover:underline text-[11px]">
                      {t.assignedTo || 'تعيين فني'}
                    </button>
                  </td>
                  <td className="py-3 px-2 font-bold">{t.estimatedCost ? `${t.estimatedCost.toLocaleString()} ر.س` : '—'}</td>
                  <td className="py-3 px-2 font-bold text-emerald-400">{t.actualCost ? `${t.actualCost.toLocaleString()} ر.س` : '—'}</td>
                  <td className="py-3 px-2 text-[var(--nc-text-dim)]">{formatDate(t.createdAt)}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {t.status === 'pending' && (
                        <button onClick={() => handleUpdateStatus(t.id, 'in_progress')} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg hover:bg-cyan-500/30">
                          بدء العمل
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button onClick={() => handleUpdateStatus(t.id, 'completed')} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/30">
                          إكمال
                        </button>
                      )}
                      {t.status !== 'cancelled' && t.status !== 'completed' && (
                        <button onClick={() => { if (window.confirm('هل أنت متأكد من إلغاء البلاغ؟')) handleUpdateStatus(t.id, 'cancelled'); }} className="px-2 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg hover:bg-rose-500/30">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-[var(--nc-text-dim)]">لا توجد بلاغات صيانة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
