// app/admin/command-center/page.tsx
'use client';
import { displayUiAlias } from "@/lib/display/uiAliases";

import { useState, useEffect, useRef } from 'react';
import { SmartCard } from '@/components/ui/SmartCard';

interface SentinelData {
  status: string;
  isActive: boolean;
  delegationLevel: string;
  fallbackPlanActive: boolean;
  deepRepairWaitMinutes: number;
  openTasks: number;
  pendingApprovals: number;
  openIncidents: number;
  data: {
    config: any;
    openTasks: any[];
    pendingApprovals: any[];
    auditEvents: any[];
    incidents: any[];
    chatMessages: any[];
  };
}

const DELEGATION_LEVELS = [
  { key: 'MONITORING_ONLY', label: 'مراقبة فقط', desc: 'يراقب الأعطال والتذاكر والدفع والواتساب وأداء الوكلاء وأخطاء النظام. لا ينفذ أي إصلاح.' },
  { key: 'MAINTENANCE_MONITORING', label: 'صيانة ومراقبة', desc: 'يفتح البلاغات التشغيلية ويصنفها، يرسل تنبيهات، يوجه مهام للفريق الخارجي، ويفعّل رسائل الاستجابة البديلة.' },
  { key: 'SIMPLE_REPAIRS', label: 'إصلاحات بسيطة', desc: 'يعطل ردودًا آلية مكسورة، يفعّل رسائل الصيانة، يعيد محاولة المهام الفاشلة، ويغيّر حالات الخدمات.' },
  { key: 'CONDITIONAL_DEEP_REPAIR', label: 'إصلاح عميق مشروط', desc: 'يعمل فقط في الحالات الحرجة بعد انتظار المالك، ضمن دليل إجراءات معتمد مسبقًا.' },
];

const WAIT_OPTIONS = [15, 30, 60, 180, 360];

// Static class maps — Tailwind JIT requires complete class strings
const MODE_CLASSES: Record<string, { active: string; inactive: string }> = {
  NORMAL_MODE:    { active: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',     inactive: '' },
  VACATION_MODE:  { active: 'bg-amber-500/20 border-amber-500/30 text-amber-400',           inactive: '' },
  EMERGENCY_MODE: { active: 'bg-rose-500/20 border-rose-500/30 text-rose-400',               inactive: '' },
  APPROVAL_MODE:  { active: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',         inactive: '' },
};

export default function CommandCenterPage() {
  const [data, setData] = useState<SentinelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/command-center');
      if (!res.ok) {
        if (res.status === 401) throw new Error('غير مصرح — حساب مالك المنصة فقط');
        throw new Error(`HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.data?.chatMessages]);

  const postAction = async (body: Record<string, unknown>) => {
    setError(null);
    setSaving(JSON.stringify(body));
    try {
      const res = await fetch('/api/admin/command-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}`);
      }
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/command-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat-send', message: chatInput.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}`);
      }
      setChatInput('');
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSendingChat(false);
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleString('ar-SA') : '—';
  const waitLabel = (m: number) => m >= 60 ? `${m / 60} ساعات` : `${m} دقيقة`;
  const isMode = (key: string) => data?.data.config.operatingMode === key;

  return (
    <div className="p-6 pb-20 max-w-6xl mx-auto space-y-6 w-full" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--nc-foreground)]">مركز قيادة Sentinel</h1>
          <p className="text-xs text-[var(--nc-foreground-muted)] mt-1">غرفة عمليات المنصة — للاستخدام الداخلي فقط</p>
        </div>
        {data && (
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${data.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {data.isActive ? 'نشط' : 'متوقف'}
          </span>
        )}
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{error}</div>}
      {loading && !data && <div className="text-center py-12 text-[var(--nc-foreground-muted)] text-sm">جاري تحميل مركز القيادة...</div>}

      {data && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <p className="text-sm font-black text-[var(--nc-foreground)] mt-1">
                {displayUiAlias("commandMode", data.status, "ar")}
              </p>
            </SmartCard>
            <SmartCard className="p-4 text-center">
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-bold">خطة الطوارئ</p>
              <p className={`text-sm font-black mt-1 ${data.fallbackPlanActive ? 'text-amber-400' : 'text-[var(--nc-foreground-muted)]'}`}>{data.fallbackPlanActive ? 'مفعلة' : 'متوقفة'}</p>
            </SmartCard>
          </div>

          {saving && <div className="text-center text-[10px] text-amber-400 font-bold animate-pulse">جاري الحفظ...</div>}

          {/* Operating Mode */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">وضع التشغيل</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "NORMAL_MODE",
                "VACATION_MODE",
                "EMERGENCY_MODE",
                "APPROVAL_MODE",
              ].map((key) => {
                const m = {
                  key,
                  label: displayUiAlias("commandMode", key, "ar"),
                };
                const active = isMode(m.key);
                return (
                  <button key={m.key} onClick={() => postAction({ action: 'change-mode', mode: m.key })}
                    disabled={active || saving !== null}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${active ? MODE_CLASSES[m.key].active : 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'}`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </SmartCard>

          {/* Delegation Level */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">وضع تفويض Sentinel أثناء غياب المالك</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DELEGATION_LEVELS.map(dl => {
                const active = data.delegationLevel === dl.key;
                return (
                  <button key={dl.key} onClick={() => postAction({ action: 'delegation-level', level: dl.key })}
                    disabled={saving !== null}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer disabled:opacity-60 ${active ? 'border-indigo-500/40 bg-indigo-500/10 text-[var(--nc-foreground)]' : 'border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'}`}>
                    <p className="text-xs font-bold">{dl.label}</p>
                    <p className="text-[10px] mt-1 leading-relaxed">{dl.desc}</p>
                  </button>
                );
              })}
            </div>
          </SmartCard>

          {/* Deep Repair Wait + Fallback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SmartCard className="p-5">
              <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">وقت انتظار الإصلاح العميق</h3>
              <div className="flex flex-wrap gap-2">
                {WAIT_OPTIONS.map(m => {
                  const active = data.deepRepairWaitMinutes === m;
                  return (
                    <button key={m} onClick={() => postAction({ action: 'deep-repair-wait', minutes: m })}
                      disabled={active || saving !== null}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${active ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'}`}>
                      {waitLabel(m)}
                    </button>
                  );
                })}
              </div>
            </SmartCard>

            <SmartCard className="p-5">
              <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">الخطة البديلة عند الطوارئ</h3>
              <button onClick={() => postAction({ action: 'fallback-plan', active: !data.fallbackPlanActive })}
                disabled={saving !== null}
                className={`w-full py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${data.fallbackPlanActive ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'}`}>
                {data.fallbackPlanActive ? '🛡️ الخطة البديلة مفعلة — إلغاء' : 'تفعيل خطة بديلة عند الطوارئ'}
              </button>
              <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-2">عند التفعيل: Sentinel يحول الخدمة المتأثرة إلى Maintenance Mode، يظهر رسالة للمستخدمين، يوقف الميزة المكسورة فقط دون إسقاط المنصة كاملة.</p>
            </SmartCard>
          </div>

          {/* Chat */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">محادثة Sentinel</h3>
            <div className="bg-[var(--nc-surface)] rounded-xl border border-[var(--nc-border)] overflow-hidden">
              <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                {data.data.chatMessages.length === 0 && <p className="text-xs text-[var(--nc-foreground-muted)] text-center">لا توجد رسائل بعد.</p>}
                {data.data.chatMessages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'OWNER' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.sender === 'OWNER' ? 'bg-indigo-500/20 border border-indigo-500/30 text-[var(--nc-foreground)] rounded-br-sm' : 'bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground-muted)] rounded-bl-sm'}`}>
                      <p>{msg.message}</p>
                      <p className="text-[9px] mt-1 opacity-60">{msg.sender === 'SENTINEL' ? 'Sentinel' : 'المالك'} · {formatDate(msg.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-[var(--nc-border)] p-3 flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="اكتب رسالة لـ Sentinel..." disabled={sendingChat}
                  className="flex-1 rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] disabled:opacity-50" />
                <button onClick={sendChat} disabled={sendingChat || !chatInput.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[var(--nc-foreground)] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {sendingChat ? 'جاري...' : 'إرسال'}
                </button>
              </div>
            </div>
          </SmartCard>

          {/* Tasks / Approvals / Audit (unchanged) */}
          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">المهام النشطة</h3>
            {data.data.openTasks.length === 0 ? <p className="text-xs text-[var(--nc-foreground-muted)]">لا توجد مهام نشطة حالياً.</p> : (
              <div className="space-y-2">
                {data.data.openTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] text-xs">
                    <div><p className="font-bold text-[var(--nc-foreground)]">{t.title}</p><p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5">{t.assignedToType} → {t.assignedToName} · {t.priority} · {t.status}</p></div>
                    {t.approvalRequired && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">ينتظر موافقة</span>}
                  </div>
                ))}
              </div>
            )}
          </SmartCard>

          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">طلبات الموافقة المعلقة</h3>
            {data.data.pendingApprovals.length === 0 ? <p className="text-xs text-[var(--nc-foreground-muted)]">لا توجد طلبات موافقة معلقة.</p> : (
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

          <SmartCard className="p-5">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-3">آخر أحداث التدقيق</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.data.auditEvents.map((e: any) => (
                <div key={e.id} className="p-2 rounded bg-[var(--nc-surface)] text-[10px] text-[var(--nc-foreground-muted)]">
                  <span className="font-bold text-[var(--nc-text-secondary)]">{e.action}</span><span className="mx-2">·</span>{formatDate(e.createdAt)}
                </div>
              ))}
            </div>
          </SmartCard>
        </>
      )}
    </div>
  );
}
