'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';
import { getSystemLogsAction, clearSystemLogsAction, triggerMockErrorAction } from '@/app/actions/logs';

interface SystemLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  tenantId: string;
  subdomain: string;
  userId: string;
  action: string;
  path: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
  context?: Record<string, any>;
  system: {
    memory: string;
  };
}

export default function LogsViewer() {
  const { theme, lang } = useApp();
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);
  const [triggeringError, setTriggeringError] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await getSystemLogsAction();
    setLoading(false);
    if (res.success && res.data) {
      setLogs(res.data as SystemLog[]);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!confirm(isArabic ? 'هل أنت متأكد من مسح جميع السجلات؟' : 'Are you sure you want to clear all logs?')) {
      return;
    }
    setClearingLogs(true);
    const res = await clearSystemLogsAction();
    setClearingLogs(false);
    if (res.success) {
      setLogs([]);
      setExpandedLogIdx(null);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleTriggerError = async () => {
    setTriggeringError(true);
    const res = await triggerMockErrorAction();
    setTriggeringError(false);
    if (res.success) {
      fetchLogs();
      setExpandedLogIdx(0); // Auto-expand the newly created error log
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Filtering
  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="nc-page nc-stack font-sans" dir={dir}>
      
      {/* Header card with glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#151f32] to-slate-900 border border-[var(--nc-glass-border)] p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {isArabic ? "سجل تحصين واستقرار النظام" : "System Resilience black-box Logger"}
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-wide">
              {isArabic ? "الصندوق الأسود - مراقبة الأخطاء" : "System Log Viewer"}
            </h1>
            <p className="text-xs md:text-sm text-[var(--nc-text-dim)] font-medium mt-2 font-medium">
              {isArabic 
                ? "مراقبة الاستثناءات والأخطاء التشغيلية في البيئة الحية وسرعة معالجة الاختناقات الأمنية."
                : "Real-time auditing of system exceptions, telemetry metrics, and platform bottlenecks."}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={handleTriggerError}
              disabled={triggeringError || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] text-white font-bold text-xs transition-all cursor-pointer border border-red-500/30 disabled:opacity-50"
            >
              <i className="ph-bold ph-bug text-sm animate-pulse"></i>
              <span>{isArabic ? "افتعال خطأ تجريبي 🎯" : "Simulate Real Error 🎯"}</span>
            </button>
            <button
              onClick={handleClearLogs}
              disabled={clearingLogs || loading || logs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium hover:text-white font-bold text-xs transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <i className="ph-bold ph-trash text-sm"></i>
              <span>{isArabic ? "مسح السجلات" : "Clear Log File"}</span>
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs transition-all border border-indigo-500/30 cursor-pointer"
            >
              <i className={`ph-bold ph-arrow-counter-clockwise text-sm ${loading ? 'animate-spin' : ''}`}></i>
              <span>{isArabic ? "تحديث" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* Controls & Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--nc-surface)] dark:bg-[#151f32]/40 border border-[var(--nc-glass-border)] p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 w-full md:w-auto relative">
          <i className="ph-bold ph-magnifying-glass absolute right-3 text-[var(--nc-text-dim)] font-medium text-sm"></i>
          <input
            type="text"
            placeholder={isArabic ? "ابحث بالرسالة، الساب دومين، أو الإجراء..." : "Search logs by message, subdomain, path..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 pr-9 pl-3 py-2 text-xs bg-[var(--nc-surface-solid)]/80 border border-slate-850 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-right"
            dir={dir}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[11px] text-[var(--nc-text-dim)] font-medium font-bold">
            {isArabic ? "تصفية حسب المستوى:" : "Filter Level:"}
          </span>
          <div className="flex bg-[var(--nc-surface-solid)] rounded-xl p-1 border border-slate-850">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  filterLevel === lvl 
                    ? 'bg-indigo-650 text-white shadow-md' 
                    : 'text-[var(--nc-text-dim)] font-medium hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs List Container */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--nc-surface)] dark:bg-[#151f32]/40 border border-[var(--nc-glass-border)] shadow-2xl backdrop-blur-md">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-xs text-[var(--nc-text-dim)] font-medium font-medium">
              {isArabic ? "جاري سحب السجلات من الخادم..." : "Fetching logs from system repository..."}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--nc-surface-solid)] flex items-center justify-center text-[var(--nc-text-dim)] font-medium text-lg">
              <i className="ph-bold ph-notebook"></i>
            </div>
            <h3 className="text-sm font-bold text-white">
              {isArabic ? "لا توجد سجلات مطابقة" : "No logs found"}
            </h3>
            <p className="text-xs text-[var(--nc-text-dim)] font-medium max-w-sm">
              {isArabic 
                ? "قاعدة البيانات نظيفة أو لا يوجد حالياً سجلات تطابق عوامل التصفية المدخلة."
                : "No matching records recorded in system.log or matching the active filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {filteredLogs.map((log, idx) => {
              const isExpanded = expandedLogIdx === idx;
              const dateStr = new Date(log.timestamp).toLocaleString(isArabic ? 'ar-SA' : 'en-US');
              
              // Define tag styles
              let badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              if (log.level === 'WARN') {
                badgeStyle = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
              } else if (log.level === 'ERROR') {
                badgeStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse";
              }

              return (
                <div 
                  key={idx} 
                  className={`transition-all hover:bg-[var(--nc-surface)] ${isExpanded ? 'bg-[var(--nc-surface)]' : ''}`}
                >
                  {/* Summary row */}
                  <div 
                    onClick={() => setExpandedLogIdx(isExpanded ? null : idx)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide ${badgeStyle}`}>
                        {log.level}
                      </span>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-semibold text-white truncate max-w-[250px] md:max-w-[450px]">
                            {log.message}
                          </span>
                          {log.subdomain && log.subdomain !== 'system' && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              {log.subdomain}
                            </span>
                          )}
                          {log.action && (
                            <span className="text-[9px] font-mono text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] px-1.5 py-0.5 rounded">
                              {log.action}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--nc-text-dim)] font-medium mt-1 flex items-center gap-3">
                          <span>{dateStr}</span>
                          {log.path && <span className="font-mono text-[var(--nc-text-dim)] font-medium text-[9px]">{log.path}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] px-2 py-0.5 rounded border border-slate-850">
                        {log.system?.memory || 'N/A'}
                      </span>
                      <i className={`ph-bold ph-caret-down text-[var(--nc-text-dim)] font-medium transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                  </div>

                  {/* Expanded metadata card */}
                  {isExpanded && (
                    <div className="p-4 bg-[var(--nc-surface-solid)]/80 border-t border-slate-900 font-mono text-[11px] leading-relaxed text-[var(--nc-text-dim)] font-medium space-y-4">
                      
                      {/* Grid info */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[var(--nc-surface)] p-3.5 rounded-xl border border-slate-850/50">
                        <div>
                          <div className="text-[9px] text-[var(--nc-text-dim)] font-medium uppercase tracking-wider">{isArabic ? "المعرف المشترك" : "Tenant ID"}</div>
                          <div className="text-[var(--nc-text-dim)] font-medium font-bold select-all truncate">{log.tenantId}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--nc-text-dim)] font-medium uppercase tracking-wider">{isArabic ? "النطاق الفرعي" : "Subdomain"}</div>
                          <div className="text-indigo-300 font-bold">{log.subdomain}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--nc-text-dim)] font-medium uppercase tracking-wider">{isArabic ? "معرف الموظف" : "User ID"}</div>
                          <div className="text-[var(--nc-text-dim)] font-medium select-all truncate">{log.userId}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--nc-text-dim)] font-medium uppercase tracking-wider">{isArabic ? "المسار" : "API Route"}</div>
                          <div className="text-emerald-400 select-all truncate">{log.path || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Error details (if exists) */}
                      {log.error && (
                        <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 space-y-2">
                          <div className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                            <i className="ph-bold ph-warning-octagon"></i>
                            <span>{isArabic ? "تفاصيل الخطأ الاستثنائي:" : "Exception Trace details:"}</span>
                          </div>
                          <div className="text-rose-300 font-bold">{log.error.name}: {log.error.message}</div>
                          {log.error.stack && (
                            <pre className="text-[10px] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] p-3 rounded-lg border border-slate-900 overflow-x-auto whitespace-pre leading-relaxed select-all">
                              {log.error.stack}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Context metadata (if exists) */}
                      {log.context && (
                        <div className="bg-[var(--nc-surface)] border border-slate-850 p-4 rounded-xl space-y-2">
                          <div className="text-indigo-400 font-bold text-xs">{isArabic ? "سياق العملية (Context):" : "Operation parameters context:"}</div>
                          <pre className="text-[10px] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] p-3 rounded-lg border border-slate-900 overflow-x-auto select-all">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* System stats */}
                      <div className="flex items-center gap-2 text-[var(--nc-text-dim)] font-medium text-[10px]">
                        <i className="ph-bold ph-cpu"></i>
                        <span>{isArabic ? "الذاكرة المخصصة للعملية:" : "Process heap memory allocated:"} <strong className="text-[var(--nc-text-dim)] font-medium">{log.system?.memory}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
