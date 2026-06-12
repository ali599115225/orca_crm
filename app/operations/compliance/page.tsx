'use client';

import { useEffect, useState } from 'react';

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'queue' | 'devices'>('dashboard');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [dashRes, activityRes, queueRes, deviceRes] = await Promise.all([
        fetch('/api/v1/zatca/dashboard'),
        fetch('/api/v1/zatca/activity'),
        fetch('/api/v1/zatca/queue'),
        fetch('/api/v1/zatca/device'),
      ]);
      const dash = await dashRes.json();
      const act = await activityRes.json();
      const q = await queueRes.json();
      const dev = await deviceRes.json();

      if (dash.success) setDashboard(dash.dashboard);
      if (act.success) setActivity(act.activity);
      if (q.success) setQueue(q.queue);
      if (dev.success) setDevices(dev.devices);
    } catch (e) {
      console.error('Failed to load compliance data', e);
    }
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-600', ISSUED: 'bg-blue-500', REPORTED: 'bg-teal-500',
    CLEARED: 'bg-emerald-500', REJECTED: 'bg-rose-500', ERROR: 'bg-red-600',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <p className="text-[var(--text-dim)] text-lg">Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] p-6" style={{ '--nc-text-dim': '#8B8B8B', '--nc-border': '#2A2A2A' } as any}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight">ZATCA Compliance Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ⚠️ بنية ZATCA موجودة — لم يتم اختبار الربط بعد
            </span>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm rounded-lg transition-all">
            Refresh
          </button>
        </div>

        {dashboard && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className={`rounded-xl p-4 ${color}/10 border border-[var(--nc-border)]`}>
                  <p className="text-xs font-medium text-[var(--nc-text-dim)] mb-1">{status}</p>
                  <p className={`text-3xl font-black ${color.replace('bg-', 'text-')}`}>
                    {(dashboard.invoiceStatuses as any)[status] || 0}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mb-8">
              <div className="flex-1 rounded-xl p-4 bg-[#1A1A1A] border border-[var(--nc-border)]">
                <p className="text-xs font-medium text-[var(--nc-text-dim)] mb-1">Active Devices</p>
                <p className="text-3xl font-black text-white">{dashboard.activeDevices}</p>
              </div>
              <div className="flex-1 rounded-xl p-4 bg-[#1A1A1A] border border-[var(--nc-border)]">
                <p className="text-xs font-medium text-[var(--nc-text-dim)] mb-1">Total Invoices</p>
                <p className="text-3xl font-black text-white">{dashboard.totalInvoices}</p>
              </div>
            </div>

            {dashboard.queueStatuses && (
              <div className="rounded-xl p-4 bg-[#1A1A1A] border border-[var(--nc-border)] mb-8">
                <h3 className="text-sm font-bold text-white mb-3">Queue Status</h3>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(dashboard.queueStatuses).map(([status, count]: any) => (
                    <div key={status} className="text-center">
                      <p className={`text-xl font-black ${status === 'FAILED' ? 'text-rose-500' : status === 'COMPLETED' ? 'text-emerald-500' : 'text-gray-400'}`}>{count}</p>
                      <p className="text-[10px] text-[var(--nc-text-dim)]">{status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mb-6 border-b border-[var(--nc-border)] pb-2">
          {(['dashboard', 'activity', 'queue', 'devices'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-[#8EB1D1] text-black' : 'text-[var(--nc-text-dim)] hover:text-white'}`}>
              {tab === 'dashboard' ? 'Summary' : tab === 'activity' ? 'Activity' : tab === 'queue' ? 'Queue' : 'Devices'}
            </button>
          ))}
        </div>

        {activeTab === 'activity' && (
          <div className="space-y-2">
            {activity.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[var(--nc-border)]">
                <div>
                  <p className="text-sm font-bold text-white">{item.invoicePrefix}-{new Date().getFullYear()}-{String(item.invoiceNumber).padStart(6, '0')}</p>
                  <p className="text-[11px] text-[var(--nc-text-dim)]">{item.lease?.tenantName} – {item.lease?.unitName}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded ${statusColors[item.zatcaStatus] || 'bg-gray-600'} text-white`}>{item.zatcaStatus}</span>
                  {item.zatcaError && <p className="text-[10px] text-rose-400 mt-1">{item.zatcaError.substring(0, 60)}</p>}
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-[var(--nc-text-dim)] text-sm">No ZATCA activity yet</p>}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-2">
            {queue.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[var(--nc-border)]">
                <div>
                  <p className="text-sm font-bold text-white">{item.action} – Invoice #{item.invoice?.invoiceNumber}</p>
                  <p className="text-[11px] text-[var(--nc-text-dim)]">Retry: {item.retryCount}/{item.maxRetries}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 text-[10px] font-black rounded bg-gray-600 text-white">{item.status}</span>
                  {item.lastError && <p className="text-[10px] text-rose-400 mt-1">{item.lastError.substring(0, 60)}</p>}
                </div>
              </div>
            ))}
            {queue.length === 0 && <p className="text-[var(--nc-text-dim)] text-sm">No queue items</p>}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-2">
            {devices.map((dev: any) => (
              <div key={dev.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[var(--nc-border)]">
                <div>
                  <p className="text-sm font-bold text-white">{dev.deviceName}</p>
                  <p className="text-[11px] text-[var(--nc-text-dim)]">{dev.deviceType}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded ${dev.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-600'} text-white`}>{dev.status}</span>
                </div>
              </div>
            ))}
            {devices.length === 0 && <p className="text-[var(--nc-text-dim)] text-sm">No devices registered</p>}
          </div>
        )}
      </div>
    </div>
  );
}
