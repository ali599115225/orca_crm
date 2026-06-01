// app/operations/agents/AgentsHudView.tsx
// 🖥️ لوحة HUD التفاعلية للوكلاء الذكيين
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  createAgentSlotAction,
  deactivateAgentSlotAction,
} from "@/app/actions/agentSlots";
import { runSystemDiagnosticsAction } from "@/app/actions/sentinel";
import { checkAndSuspendExpiredTenantsAction } from "@/app/actions/billingAgent";

interface AgentSlot {
  id: string;
  slotNumber: number;
  agentType: string;
  isActive: boolean;
  createdAt: Date;
  usageMeter?: {
    metricType: string;
    usageValue: number;
    limitValue: number;
  } | null;
}

interface UsageMeter {
  id: string;
  metricType: string;
  usageValue: number;
  limitValue: number;
  agentSlot?: { agentType: string; slotNumber: number } | null;
}

interface Props {
  slots: AgentSlot[];
  meters: UsageMeter[];
  maxSlots: number;
  activeCount: number;
  isAtCap: boolean;
  plan: string;
  tenant: { companyName: string; subscriptionPlan: string; extraAgents: number };
}

const PLAN_LABELS: Record<string, string> = {
  basic: "الأساسية",
  silver: "الفضية",
  gold: "الذهبية",
  platinum: "البلاتينية",
  professional: "الاحترافية",
  diamond: "الماسية",
};

const AGENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  SAHER: { label: "ساهر الصيانة", icon: "🤖", color: "#f59e0b" },
  SANAD: { label: "سند الفوترة", icon: "🤖", color: "#10b981" },
  CHAT_BOT: { label: "وكيل المحادثة", icon: "💬", color: "#6366f1" },
};

export default function AgentsHudView({
  slots: initialSlots,
  meters: initialMeters,
  maxSlots,
  activeCount: initialActiveCount,
  isAtCap: initialIsAtCap,
  plan,
  tenant,
}: Props) {
  const [slots, setSlots] = useState<AgentSlot[]>(initialSlots);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [isAtCap, setIsAtCap] = useState(initialIsAtCap);
  const [newAgentType, setNewAgentType] = useState("CHAT_BOT");
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // حالات الوكيل ساهر
  const [saherStatus, setSaherStatus] = useState<"IDLE" | "RUNNING" | "DONE">("IDLE");
  const [saherOutput, setSaherOutput] = useState<any>(null);
  const [saherLogs, setSaherLogs] = useState<string[]>([]);

  // حالات الوكيل سند
  const [sanadStatus, setSanadStatus] = useState<"IDLE" | "RUNNING" | "DONE">("IDLE");
  const [sanadLogs, setSanadLogs] = useState<string[]>([]);

  const saherConsoleRef = useRef<HTMLDivElement>(null);
  const sanadConsoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saherConsoleRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [saherLogs]);

  useEffect(() => {
    sanadConsoleRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [sanadLogs]);

  // ===================================================
  // إضافة مقعد وكيل جديد
  // ===================================================
  const handleAddSlot = async () => {
    setError(null);
    setSuccess(null);
    setLoadingAdd(true);

    const result = await createAgentSlotAction(newAgentType);
    setLoadingAdd(false);

    if (result.success && result.slot) {
      setSlots((prev) => [...prev, result.slot as AgentSlot]);
      setActiveCount((c) => c + 1);
      if (activeCount + 1 >= maxSlots) setIsAtCap(true);
      setSuccess(`✅ تم إضافة مقعد الوكيل "${AGENT_TYPE_LABELS[newAgentType]?.label}" بنجاح.`);
    } else if (result.capLock) {
      setError(result.error || "🔒 قفل السعة: الحد الأقصى للمقاعد.");
    } else {
      setError(result.error || "فشل إضافة المقعد.");
    }
  };

  // ===================================================
  // تعطيل مقعد وكيل
  // ===================================================
  const handleDeactivateSlot = async (slotId: string) => {
    const result = await deactivateAgentSlotAction(slotId);
    if (result.success) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, isActive: false } : s))
      );
      setActiveCount((c) => Math.max(0, c - 1));
      setIsAtCap(false);
    }
  };

  // ===================================================
  // تشغيل الوكيل ساهر
  // ===================================================
  const handleRunSaher = async () => {
    setSaherStatus("RUNNING");
    setSaherLogs([]);
    setSaherOutput(null);

    const steps = [
      "[SAHER] جاري تهيئة محرك التشخيص...",
      "[SAHER] الاتصال بـ Neon PostgreSQL Cloud...",
      "[SAHER] قياس زمن الاستجابة (Latency)...",
      "[SAHER] فحص Vercel Deployment Status...",
      "[SAHER] فحص عدد السجلات وجداول البيانات...",
      "[SAHER] فحص DNS و SSL Certificate...",
      "[SAHER] تحليل الشذوذ والمؤشرات الحرجة...",
      "[SAHER] توليد التقرير النهائي وإرسال البريد...",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setSaherLogs((prev) => [...prev, steps[i]]);
    }

    try {
      const result = await runSystemDiagnosticsAction();
      if (result.success && result.report) {
        setSaherOutput(result.report);
        setSaherLogs((prev) => [
          ...prev,
          `[SAHER] ✅ اكتمل التشخيص في: ${result.report!.timestamp}`,
          `[SAHER] DB: ${result.report!.database.status} | Latency: ${result.report!.database.latencyMs}ms`,
          `[SAHER] Tenants: ${result.report!.database.totalRows.tenants} | Leads: ${result.report!.database.totalRows.leads}`,
        ]);
      } else {
        setSaherLogs((prev) => [...prev, `[SAHER] ❌ خطأ: ${result.error}`]);
      }
    } catch (err: any) {
      setSaherLogs((prev) => [...prev, `[SAHER] ❌ استثناء: ${err.message}`]);
    }

    setSaherStatus("DONE");
  };

  // ===================================================
  // تشغيل الوكيل سند
  // ===================================================
  const handleRunSanad = async () => {
    setSanadStatus("RUNNING");
    setSanadLogs([]);

    const steps = [
      "[SANAD] تهيئة محرك الفوترة والاشتراكات...",
      "[SANAD] جلب قائمة الشركات المشتركة...",
      "[SANAD] مقارنة تواريخ الانتهاء بالوقت الحالي...",
      "[SANAD] رصد الشركات المنتهية الاشتراك...",
      "[SANAD] تعليق الحسابات المنتهية برمجياً...",
      "[SANAD] إرسال رسائل تجديد SMS وبريد للمدراء...",
      "[SANAD] إعادة ضبط عدادات الاستخدام الشهرية...",
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 600));
      setSanadLogs((prev) => [...prev, step]);
    }

    try {
      const result = await checkAndSuspendExpiredTenantsAction();
      if (result.success) {
        setSanadLogs((prev) => [
          ...prev,
          `[SANAD] ✅ اكتمل الفحص!`,
          `[SANAD] ${result.message || `تم معالجة ${result.updatedCount ?? 0} اشتراكات منتهية`}`,
        ]);
      } else {
        setSanadLogs((prev) => [...prev, `[SANAD] ❌ خطأ: ${result.error}`]);
      }
    } catch (err: any) {
      setSanadLogs((prev) => [...prev, `[SANAD] ❌ استثناء: ${err.message}`]);
    }

    setSanadStatus("DONE");
  };

  const capPercentage = maxSlots > 900000 ? 10 : Math.min(100, (activeCount / maxSlots) * 100);

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}>

      {/* هيدر الصفحة */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold px-3 py-1.5 rounded-full border border-indigo-500/20">
            🤖 AI Agents Control Center — HUD
          </span>
          <h1 className="text-2xl font-black text-white mt-2">
            مركز تحكم الوكلاء الذكيين
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة مقاعد الوكلاء، تشغيل الصيانة الذاتية، ومراقبة مؤشرات الأداء الحقيقية
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="bg-slate-800 text-amber-400 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold">
            الباقة: {PLAN_LABELS[plan] || plan}
          </span>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${isAtCap ? "bg-rose-950/30 text-rose-400 border-rose-900" : "bg-emerald-950/30 text-emerald-400 border-emerald-900"}`}>
            {activeCount}/{maxSlots > 900000 ? "∞" : maxSlots} مقاعد
          </span>
        </div>
      </div>

      {/* التنبيهات */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-400 text-xs p-4 rounded-xl font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs p-4 rounded-xl font-bold">
          {success}
        </div>
      )}

      {/* ===== قسم مقاعد الوكلاء ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* لوحة إضافة مقعد */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-xs font-black text-white border-b border-slate-800 pb-3">
            إضافة مقعد وكيل جديد
          </h2>

          {/* شريط السعة */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>السعة المستهلكة</span>
              <span className="font-bold text-white">{activeCount} / {maxSlots > 900000 ? "∞" : maxSlots}</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isAtCap ? "bg-rose-500" : capPercentage > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${capPercentage}%` }}
              />
            </div>
            {isAtCap && (
              <p className="text-[9px] text-rose-400 font-bold">
                🔒 قفل السعة: تمت الاستفادة الكاملة من مقاعد الباقة {PLAN_LABELS[plan]}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1.5">نوع الوكيل</label>
            <select
              value={newAgentType}
              onChange={(e) => setNewAgentType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="CHAT_BOT">💬 وكيل المحادثة (Chat Bot)</option>
              <option value="SAHER">🤖 ساهر الصيانة (Sentinel)</option>
              <option value="SANAD">🤖 سند الفوترة (Billing)</option>
            </select>
          </div>

          <button
            onClick={handleAddSlot}
            disabled={loadingAdd || isAtCap}
            className={`w-full p-3 rounded-xl text-xs font-black transition-all cursor-pointer ${isAtCap ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 text-slate-950"}`}
          >
            {loadingAdd ? "جاري الإضافة..." : isAtCap ? "🔒 قفل السعة مفعّل" : "+ إضافة مقعد وكيل"}
          </button>
        </div>

        {/* قائمة المقاعد */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-xs font-black text-white">مقاعد الوكلاء المُفعَّلة</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {slots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد مقاعد وكلاء مفعّلة. أضف مقعدك الأول!
              </div>
            ) : (
              slots.map((slot) => {
                const typeInfo = AGENT_TYPE_LABELS[slot.agentType] || { label: slot.agentType, icon: "🤖", color: "#94a3b8" };
                const usage = slot.usageMeter;
                const usagePct = usage ? Math.min(100, (usage.usageValue / usage.limitValue) * 100) : 0;

                return (
                  <div key={slot.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {typeInfo.label}
                          <span className="text-[9px] text-slate-500 mr-2">#{slot.slotNumber}</span>
                        </p>
                        {usage && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usagePct > 80 ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500">
                              {usage.usageValue}/{usage.limitValue} {usage.metricType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${slot.isActive ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        {slot.isActive ? "نشط" : "معطل"}
                      </span>
                      {slot.isActive && (
                        <button
                          onClick={() => handleDeactivateSlot(slot.id)}
                          className="text-[9px] bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-900 px-2 py-1 rounded cursor-pointer transition-all"
                        >
                          تعطيل
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== وكلاء التشغيل الفعلي: ساهر وسند ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ===== الوكيل ساهر ===== */}
        <div className="bg-slate-900/60 border border-amber-900/40 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/5 blur-[60px] rounded-full pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-sm font-black text-white">ساهر — Sentinel Agent</h3>
                <p className="text-[9px] text-slate-500">فحص + صيانة ذاتية + Self-Healing</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black border ${saherStatus === "IDLE" ? "bg-slate-800 text-slate-400 border-slate-700" : saherStatus === "RUNNING" ? "bg-amber-500/10 text-amber-400 border-amber-800 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border-emerald-800"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${saherStatus === "IDLE" ? "bg-slate-500" : saherStatus === "RUNNING" ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
              {saherStatus === "IDLE" ? "IDLE" : saherStatus === "RUNNING" ? "يشغّل..." : "DONE"}
            </span>
          </div>

          {/* كونسول ساهر */}
          <div ref={saherConsoleRef} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[9px] leading-6 min-h-[200px] max-h-[280px] overflow-y-auto relative">
            <span className="absolute top-2 left-3 text-[8px] text-slate-700 select-none">sentinel.sh</span>
            {saherLogs.length === 0 ? (
              <p className="text-slate-700">&gt; Sentinel is idle. Press run to start diagnostics...</p>
            ) : (
              saherLogs.map((log, i) => (
                <p key={i} className={`${log.includes("✅") ? "text-emerald-400" : log.includes("❌") ? "text-rose-400" : "text-amber-400/90"}`}>
                  &gt; {log}
                </p>
              ))
            )}
            {saherStatus === "DONE" && saherOutput && (
              <div className="border-t border-slate-800 mt-2 pt-2 space-y-1 text-slate-300">
                <p><strong className="text-amber-400">☁️ Vercel:</strong> {saherOutput.vercel?.latestDeploymentStatus}</p>
                <p><strong className="text-amber-400">🗄️ DB:</strong> {saherOutput.database?.status} — {saherOutput.database?.latencyMs}ms</p>
                <p><strong className="text-amber-400">📊 Rows:</strong> {saherOutput.database?.totalRows?.tenants} tenants | {saherOutput.database?.totalRows?.leads} leads</p>
                <p><strong className="text-amber-400">🌍 Domain:</strong> HTTP {saherOutput.domain?.httpResponseCode}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleRunSaher}
            disabled={saherStatus === "RUNNING"}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 p-3 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            {saherStatus === "RUNNING" ? "⏳ جاري الفحص..." : "⚡ اطلب من ساهر فحص النظام كاملاً"}
          </button>
        </div>

        {/* ===== الوكيل سند ===== */}
        <div className="bg-slate-900/60 border border-emerald-900/40 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-sm font-black text-white">سند — Billing & Failover Agent</h3>
                <p className="text-[9px] text-slate-500">فحص الاشتراكات + Failover Sentinel</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black border ${sanadStatus === "IDLE" ? "bg-slate-800 text-slate-400 border-slate-700" : sanadStatus === "RUNNING" ? "bg-emerald-500/10 text-emerald-400 border-emerald-800 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border-emerald-800"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sanadStatus === "IDLE" ? "bg-slate-500" : sanadStatus === "RUNNING" ? "bg-emerald-400 animate-ping" : "bg-emerald-400"}`} />
              {sanadStatus === "IDLE" ? "IDLE" : sanadStatus === "RUNNING" ? "يشغّل..." : "DONE"}
            </span>
          </div>

          {/* كونسول سند */}
          <div ref={sanadConsoleRef} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[9px] leading-6 min-h-[200px] max-h-[280px] overflow-y-auto relative">
            <span className="absolute top-2 left-3 text-[8px] text-slate-700 select-none">billing_agent.sh</span>
            {sanadLogs.length === 0 ? (
              <p className="text-slate-700">&gt; BillingAgent (سند) idle. Waiting for execution trigger...</p>
            ) : (
              sanadLogs.map((log, i) => (
                <p key={i} className={`${log.includes("✅") ? "text-emerald-400" : log.includes("❌") ? "text-rose-400" : "text-emerald-400/80"}`}>
                  &gt; {log}
                </p>
              ))
            )}
          </div>

          <button
            onClick={handleRunSanad}
            disabled={sanadStatus === "RUNNING"}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-3 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            {sanadStatus === "RUNNING" ? "⏳ جاري المراجعة..." : "⚡ اطلب من سند مراجعة الاشتراكات كاملاً"}
          </button>
        </div>
      </div>

      {/* ===== بطاقة تهيئة قاعدة البيانات ===== */}
      <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white">🗄️ تهيئة قواعد البيانات والـ Triggers</h3>
            <p className="text-[10px] text-slate-400 mt-1">
              تشغيل SQL Triggers: Cap Lock + Round-Robin + WAF Sanitization على Neon PostgreSQL
            </p>
          </div>
          <button
            onClick={async () => {
              setSuccess(null);
              setError(null);
              try {
                const res = await fetch("/api/db-init", { method: "POST" });
                const data = await res.json();
                if (data.success) {
                  setSuccess(`✅ ${data.message}`);
                } else {
                  setError(data.error);
                }
              } catch (e: any) {
                setError(e.message);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all"
          >
            ⚡ تهيئة الـ Triggers الآن
          </button>
        </div>
      </div>

    </div>
  );
}
