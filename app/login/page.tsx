// app/login/page.tsx
import React from "react";
import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "بوابة دخول المستشار العقاري - أوركا CRM",
};

export default async function LoginPage() {
  let tenantName = "منصة ORCA العقارية";
  let host = "";
  
  try {
    const headersList = await headers();
    host = headersList.get("host") || "";
    
    const domainParts = host.split(".");
    let currentSubdomain = "orca";
    const isVercelDomain = host.endsWith(".vercel.app");

    if (domainParts.length > 2 && !isVercelDomain) {
      currentSubdomain = domainParts[0];
    }

    const isMainDomain = currentSubdomain === "orca" || currentSubdomain === "www" || currentSubdomain === "dar-al-amar" || currentSubdomain === "orca-crm";

    if (!isMainDomain) {
      const tenant = await getActiveTenant(host);
      tenantName = tenant.companyName || "منصة ORCA العقارية";
    }
  } catch (e) {
    // قيمة بديلة في حال تعذر قراءة النطاق الفرعي
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #090d16 0%, #1e1b10 50%, #090d16 100%)',
        fontFamily: "'Calibri', sans-serif",
      }}
    >
      {/* خلفية متحركة بكرات ذهبية متوهجة */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)',
              width: `${250 + i * 120}px`,
              height: `${250 + i * 120}px`,
              top: `${15 + i * 15}%`,
              left: `${10 + i * 15}%`,
              animation: `pulse ${4 + i}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        body, html, * { font-family: 'Calibri', sans-serif !important; }
        @keyframes pulse { from { transform: scale(1) rotate(0deg); opacity: 0.6; } to { transform: scale(1.25) rotate(8deg); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .advisor-card { animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="advisor-card w-full max-w-[420px] relative z-10 space-y-8">
        {/* الهيدر */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-yellow-500/30 shadow-lg shadow-yellow-500/20 overflow-hidden">
            <img src="/logo.png" alt="ali.orca logo" className="w-12 h-12 object-contain" />
          </div>
          
          <div className="space-y-1">
            <span className="inline-block text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-black px-3.5 py-1 rounded-full tracking-wider">
              بوابة المستشار العقاري الموحدة
            </span>
            <h1 className="text-2xl font-black text-white pt-2">تسجيل الدخول للنظام</h1>
            <p className="text-xs text-slate-400">
              مرحباً بك في لوحة تحكم: <span className="font-extrabold text-yellow-500">{tenantName}</span>
            </p>
          </div>
        </div>

        {/* كرت تسجيل الدخول الزجاجي الفخم */}
        <div className="bg-slate-950/85 backdrop-blur-xl border border-yellow-500/20 rounded-[24px] p-8 shadow-2xl shadow-black/60">
          <LoginForm />

          <div className="mt-6 pt-5 border-t border-slate-900 text-center space-y-3">
            <p className="text-[10px] text-slate-500">
              🔒 نظام عزل وحماية بيانات العملاء والمطورين مفعل بنجاح
            </p>
          </div>
        </div>

        {/* رابط للعودة للصفحة الرئيسية */}
        <div className="text-center">
          <a href="/" className="text-xs text-slate-500 hover:text-yellow-500 transition-colors">
            ← العودة لبوابة الشركة العقارية الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}