import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import { createLeadAction } from "@/app/actions/leads";
import { LoginForm } from "@/app/login/LoginForm";
import PricingGrid from "./components/PricingGrid";

export const metadata = {
  title: "ORCA CRM — منصة إدارة العقارات الفاخرة",
  description: "منصة سحابية بصرية وفائقة التطور للمطورين العقاريين في المملكة.",
};

export default async function CorporateHomePage() {
  let companyName = "منصة ORCA العقارية";
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
      companyName = tenant.companyName || "منصة ORCA العقارية";
    }
  } catch (e) {
    // خطوة أمان بديلة
  }

  return (
    <div className="min-h-screen text-white font-sans text-right antialiased selection:bg-emerald-500/20 selection:text-emerald-500" dir="rtl" style={{ backgroundColor: '#0b0f19' }}>
      
      {/* تعميم خط Calibri للحصول على مظهر احترافي ونظيف */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Calibri', sans-serif !important;
        }
        /* خلفية الشبكة الهندسية المخصصة */
        .blueprint-grid {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}} />

      {/* هيدر الموقع الرسمي الزجاجي الفخم */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-lg border-b border-white/5 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-reverse space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-400 hover:border-emerald-500/50 hover:text-emerald-500 transition-all select-none cursor-pointer shadow-lg shadow-emerald-500/5">
            ORCA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white">ORCA CRM</span>
            <span className="text-[8px] text-emerald-500 font-bold" dir="ltr">Luxury Edition</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-8 text-xs font-bold text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">بنية النظام الذكي</a>
          <a href="#workflow" className="hover:text-white transition-colors">الوكلاء والمحاكاة</a>
          <a href="#pricing" className="hover:text-white transition-colors">الباقات الاستثمارية</a>
        </nav>

        <div>
          <a href="#register-interest" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-[10px] font-bold transition-all">
            سجل اهتمامك
          </a>
        </div>
      </header>

      {/* 1. HERO SECTION (Responsive RTL Layout) */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto z-10 min-h-[85vh] flex items-center">
        {/* شبكة البلوبرنت في الخلفية */}
        <div className="absolute inset-0 blueprint-grid opacity-50 -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -z-10" />
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* العمود الأيمن: Texts & CTA */}
          <div className="space-y-8 text-right order-2 lg:order-1 relative z-20">
            <div className="space-y-4">
              <span className="inline-block text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-4 py-1.5 rounded-full border border-emerald-500/20 tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                المنصة الرائدة للمطورين العقاريين في الخليج
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white drop-shadow-lg">
                ارتقِ بإدارتك عقاراتك إلى مستوى جديد مع <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-teal-200">CRM العقارية</span>
              </h1>
            </div>
            
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-lg font-semibold">
              منصة إدارة العقارات الذاتية الأولى التي تبيع وحداتك، وتحصل أقساطك دون أي تدخل بشري. بنية مالية متطورة، وأمان عالي المستوى.
            </p>

            <div className="pt-4">
              <a href="#register-interest" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm md:text-base font-black px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                ابدأ رحلة التحول الرقمي الفاخر ➔
              </a>
            </div>
          </div>

          {/* العمود الأيسر: 3D Tablet Dashboard Mockup */}
          <div className="order-1 lg:order-2 relative z-10 flex justify-center lg:justify-end perspective-[1000px]">
            {/* إطار التابلت (Tablet Frame) */}
            <div className="relative w-full max-w-[500px] aspect-[4/3] bg-slate-900 rounded-[2rem] border-[8px] border-slate-800 shadow-2xl transform lg:-rotate-y-12 lg:rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out flex flex-col overflow-hidden ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              {/* شريط المتصفح/العلوي */}
              <div className="h-6 bg-slate-950/80 border-b border-white/5 flex items-center px-4 gap-1.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-rose-500/80"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
              </div>
              
              {/* واجهة الديبشورد (Dashboard UI) */}
              <div className="flex-1 bg-[#0b0f19] p-6 relative overflow-hidden flex flex-col gap-6">
                {/* شبكة داخلية */}
                <div className="absolute inset-0 blueprint-grid opacity-20" />
                
                {/* عناصر الديبشورد العلوية */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="w-24 h-4 bg-white/10 rounded-full"></div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
                </div>

                {/* المخطط الدائري الهندسي (Pie Chart) والمؤشرات */}
                <div className="flex-1 flex items-center justify-center relative z-10 gap-8">
                  {/* الدائرة البيانية */}
                  <div className="relative w-40 h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    {/* محاكاة نسب المبياعت */}
                    <div className="absolute inset-0 bg-emerald-500/80" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 70%)' }}></div>
                    <div className="absolute inset-0 bg-blue-500/80" style={{ clipPath: 'polygon(50% 50%, 0 70%, 0 0, 30% 0)' }}></div>
                    <div className="absolute inset-0 bg-yellow-500/80" style={{ clipPath: 'polygon(50% 50%, 30% 0, 100% 0)' }}></div>
                    <div className="w-24 h-24 bg-[#0b0f19] rounded-full z-10 border border-white/5 flex items-center justify-center flex-col shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                      <span className="text-xl font-black text-white">85%</span>
                      <span className="text-[7px] text-slate-400">مباع بالكامل</span>
                    </div>
                  </div>

                  {/* مفاتيح الدائرة */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <div className="w-16 h-2.5 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                      <div className="w-12 h-2.5 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                      <div className="w-20 h-2.5 bg-white/10 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* رسم بياني خطي سفلي */}
                <div className="h-12 w-full bg-white/5 rounded-lg border border-white/5 relative z-10 overflow-hidden flex items-end">
                  <div className="w-full h-8 bg-gradient-to-t from-emerald-500/20 to-transparent relative">
                    <svg className="absolute bottom-0 w-full h-full text-emerald-500" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none">
                      <path d="M0 100 L20 60 L40 80 L60 30 L80 50 L100 10" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* توهج إضافي خلف الجهاز */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-emerald-500/5 blur-[80px] -z-10 rounded-full"></div>
          </div>

        </div>
      </section>

      {/* 2. AI WORKFLOW INFOGRAPHIC (Rased & Sanad) */}
      <section id="workflow" className="py-20 bg-[#0b0f19] border-t border-white/5 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
            الموظفون الرقميون
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white">دورة عمل ذكية خالية من التدخل البشري</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-semibold">
            منصة تعتمد بالكامل على وكلاء ذكاء اصطناعي يقودون المبيعات ويحفظون الأصول بفاعلية متناهية.
          </p>
        </div>

        {/* مسار العمليات (Flowchart) المتجاوب */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 max-w-4xl mx-auto relative">
          
          {/* مسار الإضاءة الخلفي (Desktop Line) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -z-10">
            <div className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent w-full opacity-50 animate-pulse"></div>
          </div>

          {/* الخط العمودي (Mobile Line) */}
          <div className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white/5 -z-10">
            <div className="w-full h-full bg-gradient-to-b from-blue-500 via-emerald-500 to-transparent opacity-50 animate-pulse"></div>
          </div>

          {/* الوكيل راصد */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full md:w-1/2 z-10 shadow-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] rounded-full group-hover:bg-blue-500/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center relative">
                <span className="text-xl">🤖</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0b0f19] animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">الوكيل: راصد (Rased)</h3>
                <p className="text-[10px] text-blue-400 font-bold">وحدة معالجة العملاء (Lead Processor)</p>
              </div>
            </div>
            <ul className="space-y-3 text-[11px] text-slate-400 font-semibold">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>استقبال العملاء من الحملات بذكاء</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>الرد الآلي على استفسارات الواتساب</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>فرز الجدية وحجز المواعيد تلقائياً</li>
            </ul>
          </div>

          {/* فاصل الأسهم المضيئة بين الوكيلين */}
          <div className="w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shrink-0 z-10 rotate-90 md:rotate-0 text-emerald-500 opacity-60">
            ➔
          </div>

          {/* الوكيل سند */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full md:w-1/2 z-10 shadow-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                <span className="text-xl">💳</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">الوكيل: سند (Sanad)</h3>
                <p className="text-[10px] text-emerald-400 font-bold">وحدة الحرس المالي (Financial Guard)</p>
              </div>
            </div>
            <ul className="space-y-3 text-[11px] text-slate-400 font-semibold">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>متابعة الدفعات والأقساط المستحقة</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>تحصيل الأموال وتحديث السجلات</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>إيقاف الخدمات للمتأخرين آلياً</li>
            </ul>
          </div>

        </div>
      </section>

      {/* 3. MINIMALIST FEATURE CARDS */}
      <section id="features" className="py-20 bg-[#0b0f19] border-t border-white/5 px-6 md:px-12 max-w-7xl mx-auto relative overflow-hidden">
        {/* خلفية هندسية خفيفة */}
        <div className="absolute inset-0 blueprint-grid opacity-10 -z-10" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10">
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group">
            <div className="w-12 h-12 bg-[#0b0f19] rounded-xl border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
              📊
            </div>
            <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">إدارة المخزون الحركي</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              (Kinetic Inventory Management) نظام تتبع ديناميكي للوحدات المتاحة والمحجوزة والمباعة بتحديثات لحظية تمنع أي تعارض في الحجوزات.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group">
            <div className="w-12 h-12 bg-[#0b0f19] rounded-xl border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
              🤝
            </div>
            <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">لوحة الوسطاء الموحدة</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              (Unified Broker Portal) منصة موحدة لإدارة جميع الوكالات ومسوقي العقارات، توزيع العمولات تلقائياً وحساب الإنجاز بدقة فائقة.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group">
            <div className="w-12 h-12 bg-[#0b0f19] rounded-xl border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
              🛡️
            </div>
            <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">درع الأمان التلقائي</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              (Secure Contract Protection) نظام متوافق تشريعياً يتكامل مع منصات الإيجار لضمان توثيق العقود وحمايتها قانونياً دون ثغرات.
            </p>
          </div>

        </div>
      </section>

      {/* 4. 3-TIER PREMIUM PRICING GRID */}
      <section id="pricing" className="py-20 bg-[#0b0f19] border-t border-white/5 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
            الباقات الاستثمارية
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white pt-2">حدد قدرة وكلاء الذكاء الاصطناعي</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-semibold">بنية تسعير مصممة لتواكب حجم العمليات والمبيعات المستهدفة لمنشأتك العقارية.</p>
        </div>

        {/* Pricing Grid Component */}
        <PricingGrid />
      </section>

      {/* نموذج التسجيل الفاخر */}
      <section id="register-interest" className="py-20 bg-[#0b0f19] border-t border-white/5 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 blur-[90px] rounded-full -z-10" />
          
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-white">ابدأ حقبة جديدة من الإدارة الفاخرة</h2>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              سجل اهتمامك الآن ليتواصل معك مدير حسابات النخبة لتخصيص نسختك الخاصة من ORCA CRM وبدء التحول.
            </p>
          </div>

          <form action={createLeadAction} className="space-y-4 max-w-xl mx-auto font-semibold">
            <input type="hidden" name="clientHost" value={host} />
            <input type="hidden" name="city" value="الرياض" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الاسم الكامل *</label>
                <input type="text" name="firstName" required placeholder="أدخل اسمك الكامل" className="w-full bg-[#0b0f19] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الجوال النشط *</label>
                <input type="tel" name="phone" required placeholder="05xxxxxxxx" className="w-full bg-[#0b0f19] border border-white/10 rounded-xl p-3 text-xs text-left text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">البريد الإلكتروني *</label>
                <input type="email" name="email" required placeholder="name@example.com" className="w-full bg-[#0b0f19] border border-white/10 rounded-xl p-3 text-xs text-left text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع النشاط العقاري *</label>
                <input type="text" name="lastName" required placeholder="مطور عقاري، وسيط مستقل..." className="w-full bg-[#0b0f19] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">الباقة المستهدفة للتشغيل *</label>
              <select name="source" required className="w-full bg-[#0b0f19] border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors">
                <option value="الباقة الأساسية">باقة النمو (Essential)</option>
                <option value="الباقة الاحترافية">الباقة الاحترافية (Elite) - الأفضل قيمة</option>
                <option value="باقة النخبة">باقة النخبة (Bespoke)</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-[#0b0f19] text-sm font-black p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer mt-2">
              طلب دعوة الانضمام المغلقة ➔
            </button>
          </form>
        </div>
      </section>

      {/* الفوتر الجمالي */}
      <footer className="bg-[#0b0f19] border-t border-white/5 py-12 px-6 md:px-12 text-right text-xs text-slate-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white">📞 دعم النخبة</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              مدراء حسابات متوفرون على مدار الساعة لخدمة عملائنا.
            </p>
            <p className="text-emerald-500 font-extrabold text-xs">
              واتساب التواصل: <a href="https://wa.me/966505123456" target="_blank" rel="noopener noreferrer" className="hover:underline" dir="ltr">+966 50 512 3456</a>
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white">💳 الأمان المالي</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              بوابة دفع مشفرة بالكامل.
            </p>
            <div className="flex items-center gap-3 text-white font-extrabold text-[10px]">
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded">مدى</span>
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded">Visa</span>
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded">Mastercard</span>
            </div>
          </div>
          <div className="space-y-3 text-right md:text-left">
            <div className="flex items-center md:justify-end gap-2">
              <span className="text-sm font-black text-white">ORCA CRM</span>
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