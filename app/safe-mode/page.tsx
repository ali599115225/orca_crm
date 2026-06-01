// app/safe-mode/page.tsx
// 🛡️ نظام الانتعاش الذكي (Edge Failover) - Safe Mode
// يُعرض عند أي فشل حرج ويحاول إعادة توجيه المستخدم تلقائياً

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── أسباب الفشل وترجماتها ──────────────────────────────────────────────────
const FAILURE_REASONS: Record<string, { ar: string; en: string; icon: string; severity: "warning" | "error" | "info" }> = {
  tenant_mismatch: {
    ar: "عدم تطابق بيانات الشركة — تم اكتشاف دخول متقاطع غير مصرح به.",
    en: "Tenant mismatch — cross-tenant access attempt detected.",
    icon: "🔒",
    severity: "error",
  },
  session_expired: {
    ar: "انتهت صلاحية جلستك — يرجى تسجيل الدخول مجدداً للمتابعة.",
    en: "Session expired — please log in again to continue.",
    icon: "⏱️",
    severity: "warning",
  },
  db_unreachable: {
    ar: "تعذّر الاتصال بقاعدة البيانات — يتم إعادة المحاولة تلقائياً.",
    en: "Database unreachable — retrying automatically.",
    icon: "🗄️",
    severity: "error",
  },
  agent_cap_exceeded: {
    ar: "تجاوز الحد الأقصى لعدد الوكلاء في باقتك الحالية.",
    en: "Agent slot cap exceeded for your current plan.",
    icon: "🤖",
    severity: "warning",
  },
  maintenance: {
    ar: "النظام في وضع الصيانة المجدولة — سيعود قريباً.",
    en: "System is under scheduled maintenance — back soon.",
    icon: "🔧",
    severity: "info",
  },
  unknown: {
    ar: "حدث خطأ غير متوقع في النظام. فريقنا التقني يعمل على الحل.",
    en: "An unexpected system error occurred. Our team is on it.",
    icon: "⚠️",
    severity: "warning",
  },
};

const SEVERITY_STYLES = {
  warning: {
    bg: "from-amber-950/90 to-orange-950/90",
    border: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    pulse: "bg-amber-500",
    btn: "bg-amber-600 hover:bg-amber-500",
  },
  error: {
    bg: "from-red-950/90 to-rose-950/90",
    border: "border-red-500/40",
    badge: "bg-red-500/20 text-red-300 border-red-500/40",
    pulse: "bg-red-500",
    btn: "bg-red-600 hover:bg-red-500",
  },
  info: {
    bg: "from-indigo-950/90 to-slate-950/90",
    border: "border-indigo-500/40",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    pulse: "bg-indigo-500",
    btn: "bg-indigo-600 hover:bg-indigo-500",
  },
};

// ─── مكوّن العداد التنازلي ──────────────────────────────────────────────────
function CountdownBar({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onComplete(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const pct = ((seconds - remaining) / seconds) * 100;
  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>إعادة التوجيه التلقائي</span>
        <span>{remaining}s</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── مكوّن نبضة الحالة ──────────────────────────────────────────────────────
function StatusPulse({ color }: { color: string }) {
  return (
    <span className="relative flex h-3 w-3 mr-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

// ─── الصفحة الرئيسية ────────────────────────────────────────────────────────
function SafeModeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get("reason") || "unknown";
  const failureInfo = FAILURE_REASONS[reason] || FAILURE_REASONS.unknown;
  const style = SEVERITY_STYLES[failureInfo.severity];

  const [systemStatus, setSystemStatus] = useState<"checking" | "online" | "degraded" | "offline">("checking");
  const [checkCount, setCheckCount] = useState(0);
  const [showAutoRedirect, setShowAutoRedirect] = useState(false);

  // تحقق من حالة النظام
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/health", { cache: "no-store" });
      if (res.ok) {
        setSystemStatus("online");
        setShowAutoRedirect(true);
      } else {
        setSystemStatus("degraded");
      }
    } catch {
      setSystemStatus("offline");
    }
    setCheckCount((c) => c + 1);
  }, []);

  useEffect(() => {
    checkHealth();
    // فحص دوري كل 15 ثانية
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleGoBack = () => {
    if (reason === "session_expired" || reason === "tenant_mismatch") {
      router.push("/login");
    } else {
      router.push("/operations");
    }
  };

  const handleAutoRedirect = useCallback(() => {
    if (reason === "session_expired" || reason === "tenant_mismatch") {
      router.push("/login");
    } else {
      router.push("/operations");
    }
  }, [reason, router]);

  const statusLabels = {
    checking: { ar: "يتحقق من النظام...", color: "text-slate-400" },
    online: { ar: "النظام متاح ✓", color: "text-emerald-400" },
    degraded: { ar: "أداء منخفض ⚡", color: "text-amber-400" },
    offline: { ar: "غير متاح حالياً ✗", color: "text-red-400" },
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0f172a 60%, #020617 100%)",
        fontFamily: "'Calibri', 'Segoe UI', sans-serif",
        direction: "rtl",
      }}
    >
      {/* طبقة الضوضاء الخلفية */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }} />

      {/* البطاقة الرئيسية */}
      <div
        className={`relative w-full max-w-lg rounded-2xl border backdrop-blur-xl p-8 shadow-2xl ${style.border}`}
        style={{ background: "rgba(15, 23, 42, 0.85)" }}
      >
        {/* شعار النظام */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-xl">🐋</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">أوركا CRM</h1>
              <p className="text-indigo-400 text-xs">Safe Recovery Mode</p>
            </div>
          </div>

          {/* شارة حالة النظام */}
          <div className={`flex items-center px-3 py-1.5 rounded-full border text-xs font-medium ${style.badge}`}>
            <StatusPulse color={style.pulse} />
            <span className="mr-1">وضع الحماية</span>
          </div>
        </div>

        {/* رمز الفشل */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">{failureInfo.icon}</div>
          <h2 className="text-xl font-bold text-white mb-2">تم تفعيل وضع الحماية</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {failureInfo.ar}
          </p>
        </div>

        {/* حالة النظام */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium">حالة الخوادم الحية</span>
            <button
              onClick={checkHealth}
              className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
            >
              ↻ تحديث يدوي
            </button>
          </div>

          <div className="space-y-2 text-sm">
            {[
              { label: "الخادم الرئيسي", status: systemStatus },
              { label: "قاعدة البيانات Neon", status: systemStatus === "online" ? "online" : systemStatus },
              { label: "نظام المصادقة", status: systemStatus },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-300">{label}</span>
                <span className={statusLabels[status as keyof typeof statusLabels]?.color || "text-slate-400"}>
                  {statusLabels[status as keyof typeof statusLabels]?.ar || "..."}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-slate-500 text-center">
            عمليات الفحص: {checkCount} · آخر فحص: الآن
          </div>
        </div>

        {/* إعادة التوجيه التلقائية */}
        {showAutoRedirect && systemStatus === "online" && (
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 mb-6">
            <p className="text-emerald-300 text-sm font-medium mb-2">
              ✓ النظام متاح — إعادة التوجيه تلقائياً...
            </p>
            <CountdownBar seconds={5} onComplete={handleAutoRedirect} />
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="space-y-3">
          <button
            onClick={handleGoBack}
            className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 ${style.btn}`}
          >
            {reason === "session_expired" || reason === "tenant_mismatch"
              ? "→ العودة لتسجيل الدخول"
              : "→ العودة للوحة التحكم"}
          </button>

          <button
            onClick={() => window.location.href = "mailto:support@orca.az-ez.pro"}
            className="w-full py-3 rounded-xl text-slate-400 hover:text-white border border-slate-700 hover:border-indigo-500/50 text-sm transition-all duration-200"
          >
            ✉ التواصل مع الدعم التقني
          </button>
        </div>

        {/* الرمز التقني */}
        <div className="mt-6 text-center">
          <code className="text-xs text-slate-600 bg-slate-900/50 px-3 py-1 rounded-full font-mono">
            ERR:{reason.toUpperCase()} · orca.az-ez.pro/safe-mode
          </code>
        </div>
      </div>
    </div>
  );
}

export default function SafeModePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white font-sans">
        جاري التحميل...
      </div>
    }>
      <SafeModeContent />
    </Suspense>
  );
}
