// app/admin/command-center/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SmartCard } from '@/components/ui/SmartCard';

interface SentinelData {
  status: string;
  isActive: boolean;
  openTasks: number;
  pendingApprovals: number;
  openIncidents: number;
  data: {
    config: { operatingMode: string; isActive: boolean; updatedAt: string };
    openTasks: any[];
    pendingApprovals: any[];
    auditEvents: any[];
    incidents: any[];
  };
}

export default function CommandCenterPage() {
  const [data, setData] = useState<SentinelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/command-center');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const changeMode = async (mode: string) => {
    try {
      const res = await fetch('/api/admin/command-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-mode', mode }),
      });
      if (res.ok) fetchData();
    } catch {}
  };

  const MODES = [
    { key: 'NORMAL_MODE', label: 'Normal', color: 'emerald' },
    { key: 'VACATION_MODE', label: 'Vacation', color: 'amber' },
    { key: 'EMERGENCY_MODE', label: 'Emergency', color: 'rose' },
    { key: 'APPROVAL_MODE', label: 'Approval', color: 'indigo' },
  ];

  const formatDate = (d?: string) => d ? new Date(d).toLocaleString('ar-SA') : '—';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--nc-foreground)]">مركز قيادة Sentinel</h1>
          <p className="text-xs text-[var(--nc-foreground-muted)] mt-1">غرفة عمليات المنصة — للاستخدام الداخلي فقط</p>
        </div>
        {data && (
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
            data.isActive
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {data.isActive ? 'نشط' : 'متوقف'}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-12 text-[var(--nc-foreground-muted)] text-sm">جاري تحميل مركز القيادة...</div>
      )}

      {data && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SmartCard className="p-4 text-center">
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-bold">المهام النشطة</p>
              <p className="text-2xl font-black text-[var(--nc-foreground)] mt-1">{data.openTasks}</p>
            </SmartCard>
            <SmartCard className="p-4 text-center">
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-bold">في انتظار الموافقة</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{data.pendingApprovals}</p>
            </SmartCard>
            <SmartCard className="p-4 text-center">
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-bold">حوادث مفتوحة</p>
              <p className="text-2xl font-black text-rose-400 mt-1">{data.openIncidents}</p>
            </SmartCard>
            <SmartCard className="p-4 text-center">
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-bold">وضع التشغيل</p>
              <p className="text-sm font-black text-[var(--nc-foreground)] mt-1">{data.status}</p>
            </SmartCard>
          </div>

          {/* Mode Selector */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">تغيير وضع التشغيل</h3>
            <div className="flex flex-wrap gap-2">
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => changeMode(m.key)}
                  disabled={data.data.config.operatingMode === m.key}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    data.data.config.operatingMode === m.key
                      ? `bg-${m.color}-500/20 border-${m.color}-500/30 text-${m.color}-400`
                      : 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </SmartCard>

          {/* Open Tasks */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">المهام النشطة</h3>
            {data.data.openTasks.length === 0 ? (
              <p className="text-xs text-[var(--nc-foreground-muted)]">لا توجد مهام نشطة حالياً.</p>
            ) : (
              <div className="space-y-2">
                {data.data.openTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] text-xs">
                    <div>
                      <p className="font-bold text-[var(--nc-foreground)]">{t.title}</p>
                      <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5">
                        {t.assignedToType} → {t.assignedToName} · {t.priority} · {t.status}
                      </p>
                    </div>
                    {t.approvalRequired && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ينتظر موافقة
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SmartCard>

          {/* Pending Approvals */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">طلبات الموافقة المعلقة</h3>
            {data.data.pendingApprovals.length === 0 ? (
              <p className="text-xs text-[var(--nc-foreground-muted)]">لا توجد طلبات موافقة معلقة.</p>
            ) : (
              <div className="space-y-2">
                {data.data.pendingApprovals.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                    <p className="font-bold text-[var(--nc-foreground)]">{t.title}</p>
                    <p className="text-[10px] text-amber-400 mt-0.5">{t.riskLevel} · {formatDate(t.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </SmartCard>

          {/* Recent Audit Events */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">آخر أحداث التدقيق</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.data.auditEvents.map((e: any) => (
                <div key={e.id} className="p-2 rounded bg-[var(--nc-surface)] text-[10px] text-[var(--nc-foreground-muted)]">
                  <span className="font-bold text-[var(--nc-text-secondary)]">{e.action}</span>
                  <span className="mx-2">·</span>
                  {formatDate(e.createdAt)}
                </div>
              ))}
            </div>
          </SmartCard>
        </>
      )}
    </div>
  );
}
