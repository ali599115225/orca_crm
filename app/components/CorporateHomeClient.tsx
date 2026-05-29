// app/components/CorporateHomeClient.tsx
"use client";

import React from "react";
import PricingGrid from "./PricingGrid";
import { createLeadAction } from "@/app/actions/leads";
import { useApp } from "@/app/context/AppContext";

interface CorporateHomeClientProps {
  host: string;
  companyName: string;
}

export default function CorporateHomeClient({ host, companyName }: CorporateHomeClientProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();

  return (
    <div
      className={`min-h-screen antialiased transition-colors duration-500 selection:bg-emerald-500/20 selection:text-emerald-500 ${
        theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-[#f9f9fb] text-[#0b0f19]"
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* تعميم خط Calibri وتأثيرات الألوان المخصصة */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Calibri', sans-serif !important;
        }
        /* خلفية الشبكة الهندسية المخصصة */
        .blueprint-grid {
          background-image: 
            linear-gradient(to right, ${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(11,15,25,0.03)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(11,15,25,0.03)"} 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .hero-headline, .hero-headline * {
            letter-spacing: normal !important;
        }
        .hero-headline ::selection {
            background-color: rgba(115, 83, 52, 0.15); /* Elegant light bronze tint for selection */
            color: #0b0f19; /* Sharp charcoal text color during selection */
            text-shadow: none !important;
            display: inline; /* Prevents inline-block element wrapping bugs during selection */
        }
      `}} />

      {/* هيدر الموقع الرسمي الزجاجي الفخم */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-500 h-16 flex items-center justify-between px-6 md:px-12 ${
          theme === "dark" ? "bg-[#0b0f19]/80 border-white/5" : "bg-[#f9f9fb]/80 border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-reverse space-x-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[10px] font-black transition-all select-none cursor-pointer shadow-lg ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 text-slate-400 hover:border-[#e5c158]/50 hover:text-[#e5c158] shadow-[#e5c158]/5" 
              : "bg-slate-100 border-slate-300 text-slate-600 hover:border-[#e5c158] hover:text-[#e5c158] shadow-slate-200"
          }`}>
            ORCA
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
              ORCA CRM
            </span>
            <span className="text-[8px] text-[#e5c158] font-bold" dir="ltr">Luxury Edition</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-8 text-xs font-bold transition-colors">
          <a 
            href="#features" 
            className={`transition-colors ${theme === "dark" ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-[#0b0f19]"}`}
          >
            بنية النظام الذكي
          </a>
          <a 
            href="#workflow" 
            className={`transition-colors ${theme === "dark" ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-[#0b0f19]"}`}
          >
            الوكلاء والمحاكاة للباقات الاستثمارية
          </a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          {/* Language Toggle Placeholder */}
          <button 
            onClick={toggleLang}
            className={`h-8 px-2.5 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
              theme === "dark" 
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#e5c158]/50 hover:text-[#e5c158]" 
                : "bg-white border-slate-300 text-slate-700 hover:border-[#e5c158] hover:text-[#e5c158] shadow-sm"
            }`}
          >
            🌐 {lang === "AR" ? "EN" : "عربي"}
          </button>
          
          {/* Dark/Light Mode Toggle */}
          <button 
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${
              theme === "dark" 
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#e5c158]/50 hover:text-[#e5c158]" 
                : "bg-white border-slate-300 text-slate-700 hover:border-[#e5c158] hover:text-[#e5c158] shadow-sm"
            }`}
            title="تبديل الوضع الليلي / النهاري"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          {/* Start Free Trial Button */}
          <a 
            href="#register-interest" 
            className="bg-[#e5c158] hover:bg-[#d4af37] text-[#0b0f19] px-4 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all shadow-[0_0_15px_rgba(229,193,88,0.2)]"
          >
            ابدأ مجاناً
          </a>
        </div>
      </header>

      {/* 1. HERO SECTION (Responsive RTL Layout) */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto z-10 min-h-[85vh] flex items-center">
        {/* شبكة البلوبرنت في الخلفية */}
        <div className="absolute inset-0 blueprint-grid opacity-50 -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#e5c158]/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -z-10" />
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* العمود الأيمن: Texts & CTA */}
          <div className="space-y-8 text-right relative z-20">
            <div className="space-y-4">
              <span className={`inline-block text-[10px] font-extrabold px-4 py-1.5 rounded-full border tracking-wider transition-all duration-300 ${
                theme === "dark" 
                  ? "bg-[#e5c158]/10 text-[#e5c158] border-[#e5c158]/20 shadow-[0_0_15px_rgba(229,193,88,0.15)]" 
                  : "bg-[#735334]/10 text-[#735334] border-[#735334]/20 shadow-none"
              }`}>
                المنصة الرائدة للمطورين العقاريين في الخليج
              </span>
              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black leading-tight hero-headline ${
                theme === "dark" ? "text-white drop-shadow-lg" : "text-[#0b0f19] drop-shadow-none"
              }`}>
                الجيل الجديد من إدارة العقارات: <span className={theme === "dark" ? "text-[#E6C687] drop-shadow-[0_2px_8px_rgba(230,198,135,0.3)]" : "text-[#735334] drop-shadow-none font-bold"}>أتمتة كاملة مدفوعة بـ Orca CRM للوكلاء المستقلين ونظام الحماية السيبرانية الكاملة</span>
              </h1>
            </div>
            
            <p className={`text-sm md:text-base leading-relaxed max-w-xl font-semibold ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}>
              المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة، مدعومة بدرع سيبراني منيع يشفر عقودك ويحمي أصولك وبياناتك المالية تلقائياً.
            </p>

            <div className="pt-4">
              <a 
                href="#register-interest" 
                className="inline-block bg-[#e5c158] hover:bg-[#d4af37] text-[#0b0f19] text-sm md:text-base font-black px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(229,193,88,0.3)]"
              >
                ابدأ إدارة محفظتك الاستثمارية مجاناً
              </a>
            </div>
          </div>

          {/* العمود الأيسر: 3D Tablet Dashboard Mockup */}
          <div className="relative z-10 flex justify-center lg:justify-end perspective-[1000px]">
            {/* إطار التابلت (Tablet Frame) - Stays Dark for High-fidelity Premium Feel */}
            <div className="relative w-full max-w-[500px] aspect-[4/3] bg-slate-900 rounded-[2rem] border-[8px] border-slate-800 shadow-2xl transform lg:-rotate-y-12 lg:rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out flex flex-col overflow-hidden ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              {/* شريط المتصفح/العلوي */}
              <div className="h-6 bg-slate-950/80 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-rose-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
                </div>
                {/* خادم الرياض */}
                <div className="text-[8px] text-emerald-400 font-bold tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  خادم الرياض: آمن ١٠٠٪
                </div>
              </div>
              
              {/* واجهة الديبشورد (Dashboard UI) */}
              <div className="flex-1 bg-[#0b0f19] p-6 relative overflow-hidden flex flex-col gap-6">
                {/* شبكة داخلية */}
                <div className="absolute inset-0 blueprint-grid opacity-20" />
                
                {/* عناصر الديبشورد العلوية */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="w-24 h-4 bg-white/10 rounded-full"></div>
                  
                  {/* الدرع السيبراني نشط */}
                  <div className="flex items-center gap-1 bg-[#e5c158]/10 border border-[#e5c158]/30 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(229,193,88,0.2)]">
                    <span className="text-[8px] text-[#e5c158]">🛡️</span>
                    <span className="text-[8px] text-[#e5c158] font-bold">الدرع السيبراني: نشط</span>
                  </div>
                </div>

                {/* المخطط الدائري الهندسي (Pie Chart) والمؤشرات مع الأرقام الشرقية */}
                <div className="flex-1 flex items-center justify-center relative z-10 gap-8">
                  {/* الدائرة البيانية */}
                  <div className="relative w-40 h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    {/* محاكاة نسب المبيعات */}
                    <div className="absolute inset-0 bg-[#10b981]" style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 70%)" }}></div>
                    <div className="absolute inset-0 bg-[#3b82f6]" style={{ clipPath: "polygon(50% 50%, 0 70%, 0 0, 30% 0)" }}></div>
                    <div className="absolute inset-0 bg-[#e5c158]" style={{ clipPath: "polygon(50% 50%, 30% 0, 100% 0)" }}></div>
                    <div className="w-24 h-24 bg-[#0b0f19] rounded-full z-10 border border-white/5 flex items-center justify-center flex-col shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                      <span className="text-xl font-black text-white">٨٥٪</span>
                      <span className="text-[8px] text-slate-400 font-bold">من المحفظة</span>
                    </div>
                  </div>

                  {/* مفاتيح الدائرة */}
                  <div className="space-y-4 font-sans text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">الوحدات المباعة: ٤٢٠ وحدة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">الوحدات المتاحة: ١٥٠ وحدة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#e5c158] shadow-[0_0_10px_rgba(229,193,88,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">الوحدات المحجوزة: ٨٥ وحدة</span>
                    </div>
                  </div>
                </div>
                
                {/* رسم بياني خطي سفلي فاخر */}
                <div className="h-12 w-full bg-white/5 rounded-lg border border-white/5 relative z-10 overflow-hidden flex items-end">
                  <div className="absolute top-1 left-2 text-[8px] text-[#e5c158] font-bold z-20">
                    التدفقات النقدية المحصنة: ٤٢,٥٠٠,٠٠٠ ر.س
                  </div>
                  <div className="w-full h-8 bg-gradient-to-t from-[#e5c158]/10 to-transparent relative">
                    <svg className="absolute bottom-0 w-full h-full text-[#e5c158]" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none">
                      <path d="M0 100 L20 60 L40 80 L60 30 L80 50 L100 10" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* توهج إضافي خلف الجهاز */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#e5c158]/5 blur-[80px] -z-10 rounded-full"></div>
          </div>

        </div>
      </section>

      {/* 2. AI WORKFLOW INFOGRAPHIC (Saher & Sanad) */}
      <section id="workflow" className={`py-20 border-t transition-colors duration-500 px-6 md:px-12 max-w-7xl mx-auto`}>
        <div className="text-center space-y-3 mb-16">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider transition-all duration-300 ${
            theme === "dark" 
              ? "bg-[#e5c158]/10 text-[#e5c158] border-[#e5c158]/20" 
              : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
          }`}>
            الموظفون الرقميون
          </span>
          <h2 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
            دورة عمل ذكية خالية من التدخل البشري
          </h2>
          <p className={`text-xs max-w-lg mx-auto font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>
            منصة تعتمد بالكامل على وكلاء ذكاء اصطناعي يقودون المبيعات ويحفظون الأصول بفاعلية متناهية.
          </p>
        </div>

        {/* مسار العمليات (Flowchart) المتجاوب */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 max-w-4xl mx-auto relative">
          
          {/* مسار الإضاءة الخلفي (Desktop Line) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -z-10">
            <div className="h-full bg-gradient-to-r from-transparent via-[#e5c158] to-transparent w-full opacity-40 animate-pulse"></div>
          </div>

          {/* الخط العمودي (Mobile Line) */}
          <div className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white/5 -z-10">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-[#e5c158] to-transparent opacity-40 animate-pulse"></div>
          </div>

          {/* الوكيل ساهر */}
          <div className={`border p-6 rounded-2xl w-full md:w-1/2 z-10 relative overflow-hidden group transition-all duration-300 ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 hover:border-[#e5c158]/40 shadow-2xl shadow-[#e5c158]/5" 
              : "bg-white/70 backdrop-blur-md border-slate-200 hover:border-[#e5c158]/40 shadow-sm shadow-slate-200/50"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5c158]/5 blur-[40px] rounded-full group-hover:bg-[#e5c158]/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e5c158]/10 border border-[#e5c158]/30 flex items-center justify-center relative">
                <span className="text-xl">🤖</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <h3 className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
                  الوكيل: ساهر (Saher)
                </h3>
                <p className="text-[10px] text-[#e5c158] font-bold">وحدة فحص وفرز العملاء (Lead Capture & Qualification)</p>
              </div>
            </div>
            <ul className={`space-y-3 text-[11px] font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#e5c158] rounded-full"></div>استقبال وتصنيف العملاء من الحملات بذكاء</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#e5c158] rounded-full"></div>الرد الفوري وقياس مدى جدية الاهتمام تلقائياً</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#e5c158] rounded-full"></div>جدولة المواعيد وتوجيه المهام للفريق البشري</li>
            </ul>
          </div>

          {/* فاصل الأسهم المضيئة بين الوكيلين */}
          <div className="w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shrink-0 z-10 rotate-90 md:rotate-180 text-[#e5c158] opacity-80 font-bold">
            ➔
          </div>

          {/* الوكيل سند */}
          <div className={`border p-6 rounded-2xl w-full md:w-1/2 z-10 relative overflow-hidden group transition-all duration-300 ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 hover:border-[#e5c158]/40 shadow-2xl shadow-[#e5c158]/5" 
              : "bg-white/70 backdrop-blur-md border-slate-200 hover:border-[#e5c158]/40 shadow-sm shadow-slate-200/50"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5c158]/5 blur-[40px] rounded-full group-hover:bg-[#e5c158]/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                <span className="text-xl">💳</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <h3 className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
                  الوكيل: سند (Sanad)
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold">وحدة التحصيل والتحكم المالي (Financial Collection)</p>
              </div>
            </div>
            <ul className={`space-y-3 text-[11px] font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>متابعة وتتبع جداول الأقساط المستحقة</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>إرسال روابط دفع مشفرة وآمنة عبر الواتساب</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>تحديث السجلات المالية وإيقاف الخدمات للمتأخرين آلياً</li>
            </ul>
          </div>

        </div>
      </section>

      {/* 3. MINIMALIST FEATURE CARDS */}
      <section id="features" className="py-20 border-t px-6 md:px-12 max-w-7xl mx-auto relative overflow-hidden">
        {/* خلفية هندسية خفيفة */}
        <div className="absolute inset-0 blueprint-grid opacity-10 -z-10" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10">
          
          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 hover:border-[#e5c158]/30" 
              : "bg-white/70 backdrop-blur-md border-slate-200 shadow-sm shadow-slate-200/50 hover:border-[#e5c158]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#e5c158] transition-colors ${
              theme === "dark" ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              📊
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              theme === "dark" ? "text-white group-hover:text-[#e5c158]" : "text-[#0b0f19] group-hover:text-[#735334]"
            }`}>
              إدارة المخزون الحركي
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}>
              (Kinetic Inventory Management) نظام تتبع ديناميكي للوحدات المتاحة والمحجوزة والمباعة بتحديثات لحظية تمنع أي تعارض في الحجوزات.
            </p>
          </div>

          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 hover:border-[#e5c158]/30" 
              : "bg-white/70 backdrop-blur-md border-slate-200 shadow-sm shadow-slate-200/50 hover:border-[#e5c158]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#e5c158] transition-colors ${
              theme === "dark" ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              🤝
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              theme === "dark" ? "text-white group-hover:text-[#e5c158]" : "text-[#0b0f19] group-hover:text-[#735334]"
            }`}>
              لوحة الوسطاء الموحدة
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}>
              (Unified Broker Portal) منصة موحدة لإدارة جميع الوكالات ومسوقي العقارات، توزيع العمولات تلقائياً وحساب الإنجاز بدقة فائقة.
            </p>
          </div>

          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            theme === "dark" 
              ? "bg-white/5 border-white/10 hover:border-[#e5c158]/30" 
              : "bg-white/70 backdrop-blur-md border-slate-200 shadow-sm shadow-slate-200/50 hover:border-[#e5c158]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#e5c158] transition-colors ${
              theme === "dark" ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              🛡️
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              theme === "dark" ? "text-white group-hover:text-[#e5c158]" : "text-[#0b0f19] group-hover:text-[#735334]"
            }`}>
              درع الحماية الكاملة والتشفير السيبراني
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}>
              تشفير مصرفي متطور وعالي الكفاءة لحماية بيانات المشترين، الصكوك العقارية، وعقود الأقساط المالية دون أي ثغرات أو تدخل خارجي.
            </p>
          </div>

        </div>
      </section>

      {/* 4. 3-TIER PREMIUM PRICING GRID */}
      <section id="pricing" className="py-20 border-t px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider transition-all duration-300 ${
            theme === "dark" 
              ? "bg-[#e5c158]/10 text-[#e5c158] border-[#e5c158]/20" 
              : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
          }`}>
            الباقات الاستثمارية
          </span>
          <h2 className={`text-2xl md:text-3xl font-black pt-2 ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
            حدد قدرة وكلاء الذكاء الاصطناعي
          </h2>
          <p className={`text-xs max-w-lg mx-auto font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>
            بنية تسعير مصممة لتواكب حجم العمليات والمبيعات المستهدفة لمنشأتك العقارية.
          </p>
        </div>

        {/* Pricing Grid Component */}
        <PricingGrid theme={theme} />
      </section>

      {/* نموذج التسجيل الفاخر */}
      <section id="register-interest" className="py-20 border-t px-6 md:px-12 max-w-4xl mx-auto">
        <div className={`border rounded-3xl p-8 md:p-12 space-y-8 relative overflow-hidden shadow-2xl ${
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-200/50 border-slate-300/40"
        }`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#e5c158]/5 blur-[90px] rounded-full -z-10" />
          
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className={`text-xl md:text-2xl font-black ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
              ابدأ حقبة جديدة من الإدارة الفاخرة
            </h2>
            <p className={`text-[10px] leading-relaxed font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              سجل اهتمامك الآن ليتواصل معك مدير حسابات النخبة لتخصيص نسختك الخاصة من ORCA CRM وبدء التحول.
            </p>
          </div>

          <form action={createLeadAction} className="space-y-4 max-w-xl mx-auto font-semibold">
            <input type="hidden" name="clientHost" value={host} />
            <input type="hidden" name="city" value="الرياض" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  الاسم الكامل *
                </label>
                <input 
                  type="text" 
                  name="firstName" 
                  required 
                  placeholder="أدخل اسمك الكامل" 
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#e5c158]/50 focus:border-[#e5c158]/50 transition-colors ${
                    theme === "dark" ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                  }`} 
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  رقم الجوال النشط *
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  placeholder="05xxxxxxxx" 
                  className={`w-full border rounded-xl p-3 text-xs text-left focus:outline-none focus:ring-1 focus:ring-[#e5c158]/50 focus:border-[#e5c158]/50 transition-colors ${
                    theme === "dark" ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                  }`} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  البريد الإلكتروني *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="name@example.com" 
                  className={`w-full border rounded-xl p-3 text-xs text-left focus:outline-none focus:ring-1 focus:ring-[#e5c158]/50 focus:border-[#e5c158]/50 transition-colors ${
                    theme === "dark" ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                  }`} 
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  نوع النشاط العقاري *
                </label>
                <input 
                  type="text" 
                  name="lastName" 
                  required 
                  placeholder="مطور عقاري، وسيط مستقل..." 
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#e5c158]/50 focus:border-[#e5c158]/50 transition-colors ${
                    theme === "dark" ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                  }`} 
                />
              </div>
            </div>

            <div>
              <label className={`block text-[10px] font-bold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                الباقة المستهدفة للتشغيل *
              </label>
              <select 
                name="source" 
                required 
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#e5c158]/50 focus:border-[#e5c158]/50 transition-colors ${
                  theme === "dark" ? "bg-[#0b0f19] border-white/10 text-slate-300" : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                <option value="الباقة الأساسية">باقة النمو (Essential)</option>
                <option value="الباقة الاحترافية">الباقة الاحترافية (Elite) - الأفضل قيمة</option>
                <option value="باقة النخبة">باقة النخبة (Bespoke)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#e5c158] hover:bg-[#d4af37] text-[#0b0f19] text-sm font-black p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(229,193,88,0.2)] cursor-pointer mt-2"
            >
              طلب دعوة الانضمام المغلقة ➔
            </button>
          </form>
        </div>
      </section>

      {/* الفوتر الجمالي */}
      <footer className={`border-t py-12 px-6 md:px-12 text-right text-xs transition-colors duration-500 ${
        theme === "dark" ? "bg-[#0b0f19] border-white/5 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <h4 className={`font-extrabold text-sm ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
              📞 دعم النخبة
            </h4>
            <p className={`text-[11px] leading-relaxed font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              مدراء حسابات متوفرون على مدار الساعة لخدمة عملائنا.
            </p>
            <p className="text-[#e5c158] font-extrabold text-xs">
              واتساب التواصل: <a href="https://wa.me/966505123456" target="_blank" rel="noopener noreferrer" className="hover:underline" dir="ltr">+966 50 512 3456</a>
            </p>
          </div>
          <div className="space-y-3">
            <h4 className={`font-extrabold text-sm ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>
              💳 الأمان المالي
            </h4>
            <p className={`text-[11px] leading-relaxed font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              بوابة دفع مشفرة بالكامل.
            </p>
            <div className="flex items-center gap-3 font-extrabold text-[10px]">
              <span className={`px-2 py-1 border rounded ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>مدى</span>
              <span className={`px-2 py-1 border rounded ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>Visa</span>
              <span className={`px-2 py-1 border rounded ${theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>Mastercard</span>
            </div>
          </div>
          <div className="space-y-3 text-right md:text-left">
            <div className="flex items-center md:justify-end gap-2">
              <span className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-[#0b0f19]"}`}>ORCA CRM</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">
              جميع الحقوق محفوظة لمنصة أوركا © 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
