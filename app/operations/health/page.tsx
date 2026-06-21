'use client';

import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import LayoutContainer from '@/components/ui/LayoutContainer';
import { formatDisplayTime } from '@/lib/display/dateTime';

interface HealthData {
  status: string;
  timestamp: string;
  responseTime: string;
  checks: Record<string, any>;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      setHealth(data);
      setHistory(prev => [...prev.slice(-19), data]);
    } catch {
      setHealth({ status: 'unreachable', timestamp: new Date().toISOString(), responseTime: 'N/A', checks: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); const iv = setInterval(fetchHealth, 30000); return () => clearInterval(iv); }, []);

  const statusColor = (s: string) => s === 'connected' || s === 'operational' || s === 'online' ? 'text-green-400' : s === 'degraded' ? 'text-yellow-400' : 'text-red-400';

  return (
    <LayoutContainer>
      <PageHeader title="Health Monitoring" />
      <div className="space-y-4">
        {loading ? <p className="text-gray-400">جاري التحميل...</p> : null}

        {health ? (
          <div className="bg-[#1e293b] rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-2xl font-bold ${statusColor(health.status)}`}>
                {health.status === 'online' ? '🟢 النظام يعمل' : health.status === 'degraded' ? '🟡 تدهور جزئي' : '🔴 غير متاح'}
              </span>
              <span className="text-sm text-gray-400">استجابة: {health.responseTime}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(health.checks || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="bg-[#0f172a] rounded-lg p-4">
                  <h3 className="text-sm text-gray-400 mb-2 uppercase">{key}</h3>
                  {val.status ? (
                    <p className={`font-medium ${statusColor(val.status)}`}>{val.status}</p>
                  ) : null}
                  {val.latency ? <p className="text-xs text-gray-500">{val.latency}</p> : null}
                  {typeof val === 'object' && val.status === undefined ? (
                    <div className="text-xs space-y-1 text-gray-300">
                      {Object.entries(val).map(([k, v]) => <p key={k}>{k}: {String(v)}</p>)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {history.length > 1 ? (
          <div className="bg-[#1e293b] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">سجل آخر الفحوصات</h2>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {history.slice().reverse().map((h, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-400 bg-[#0f172a] px-3 py-1.5 rounded">
                  <span className={statusColor(h.status)}>{h.status}</span>
                  <span>{formatDisplayTime(h.timestamp)}</span>
                  <span>{h.responseTime}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button onClick={fetchHealth} className="px-4 py-2 bg-[#3B82F6] rounded-lg text-sm hover:bg-[#2563EB] transition-colors">
          تحديث الآن
        </button>
      </div>
    </LayoutContainer>
  );
}
