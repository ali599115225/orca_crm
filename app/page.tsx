import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { createLeadAction } from "@/app/actions/leads";
import PricingGrid from "./components/PricingGrid";

export const metadata = {
  title: "أوركا العقارية — النظام التشغيلي وإدارة المبيعات السحابية ORCA CRM",
  description: "المنصة السحابية الأولى لإدارة المبيعات والتطوير العقاري بالمملكة بمشرفين ووكلاء أذكياء",
};

export default async function CorporateHomePage() {
  let companyName = "شركة العلي العقارية";
  let projects: any[] = [];
  let host = "";
  
  try {
    const headersList = await headers();
    host = headersList.get("host") || "";
    const tenant = await getActiveTenant(host);
    companyName = tenant.companyName || "شركة العلي العقارية";
    
    projects = await prisma.project.findMany({
      where: { 
        tenantId: tenant.id,
        status: { in: ["UNDER_CONSTRUCTION", "COMPLETED"] }
      },
    });
  } catch (e) {
    // خطوة أمان بديلة
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans text-right antialiased selection:bg-amber-500/20 selection:text-amber-500" dir="rtl">
      
      {/* هيدر الموقع الرسمي الزجاجي الفخم */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-reverse space-x-3">
          {/* شعار أوركا الفاخر */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/20 text-lg">
            🐳
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white">{companyName}</span>
            <span className="text-[8px] text-amber-500 font-bold" dir="ltr">ORCA CRM by ali.orca</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-6 text-xs font-bold text-slate-400">
          <a href="#about" className="hover:text-white transition-colors">من نحن</a>
          <a href="#projects" className="hover:text-white transition-colors">مشاريعنا العقارية</a>
          <a href="#pricing" className="hover:text-white transition-colors">الباقات والأسعار</a>
          <a href="#login-proposals" className="hover:text-white transition-colors">بوابات دخول المستشارين</a>
          <a href="#register-interest" className="hover:text-white transition-colors">سجل اهتمامك</a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          <a href="/login" className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-500 text-xs font-black px-4 py-2 rounded-xl transition-all duration-300 hover:scale-[1.03]">
            🔐 بوابة دخول المستشارين
          </a>
        </div>
      </header>

      {/* قسم البطل الفخم (Hero Section) للمطور العقاري */}
      <section className="relative overflow-hidden py-24 px-6 md:px-12 text-center max-w-5xl mx-auto space-y-6 z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 blur-[130px] rounded-full -z-10" />
        
        <span className="inline-block text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-4 py-1.5 rounded-full border border-amber-500/20 tracking-wider">
          مطور عقاري وطني معتمد ومرخص من الهيئة العامة للعقار 🇸🇦
        </span>
        
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-white max-w-4xl mx-auto">
          نصنع جودة الحياة الفاخرة بـ <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">تطوير عقاري مستدام ومبتكر</span>
        </h1>
        
        <p className="text-xs md:text-sm text-slate-455 max-w-2xl mx-auto leading-relaxed">
          مرحباً بك في {companyName}. نحن نلتزم بتطوير أرقى المجمعات والأبراج والوحدات السكنية في أرجاء المملكة العربية السعودية، مصممة بأعلى معايير جودة الحياة المعمارية وأحدث التقنيات السكنية والتمويلية المتوافقة مع البنوك المحلية.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
          <a href="#register-interest" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-xl shadow-amber-500/10">
            ✉ سجل اهتمامك بالوحدات السكنية
          </a>
          <a href="#pricing" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold px-8 py-3.5 rounded-xl transition-all duration-300">
            الباقات وأسعار الاشتراكات
          </a>
        </div>
      </section>

      {/* قسم الميزات التعريفية للمنصة السحابية */}
      <section id="about" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-3">
            <span className="text-2xl">⚡</span>
            <h3 className="font-extrabold text-sm text-white">بنية سحابية ذات سرعة فائقة</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يعمل النظام على شبكة Vercel العالمية مع خوادم طرفية (Edge Network) توفر سرعة استجابة فائقة وتحميل لحظي لجميع البيانات والتقارير العقارية.
            </p>
          </div>
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-3">
            <span className="text-2xl">🔒</span>
            <h3 className="font-extrabold text-sm text-white">عزل تام وحماية البيانات</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تكامل تام مع قاعدة بيانات Neon PostgreSQL السحابية، مع عزل صارم للجلسات يضمن عدم تداخل أو تسريب بيانات العملاء بين الشركات العقارية نهائياً.
            </p>
          </div>
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-3">
            <span className="text-2xl">🤖</span>
            <h3 className="font-extrabold text-sm text-white">وكلاء مبيعات أذكياء 24/7</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تفعيل تلقائي لوكلاء الذكاء الاصطناعي لاستقبال العملاء عبر الواتساب، والرد الفوري على الاستفسارات، وجدولة المواعيد مع مستشاري المبيعات.
            </p>
          </div>
        </div>
      </section>

      {/* قسم المشاريع الحية والمعروضة للجمهور مباشرة من قاعدة بياناتك */}
      <section id="projects" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white">مشاريعنا العقارية النشطة</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">نستعرض لك مشاريعنا السكنية والتجارية الحية والمتاحة للبيع والاطلاع حالياً بمدينة الرياض وجدة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-3 bg-slate-900/20 p-12 text-center border border-slate-800/80 border-dashed rounded-2xl text-slate-400 text-xs font-bold">
              لا يوجد مشاريع سكنية نشطة معروضة للجمهور حالياً. قم بإضافة مشاريعك من لوحة تحكم الإدارة لتعرض هنا تلقائياً حياً على الإنترنت!
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      {project.status === "UNDER_CONSTRUCTION" ? "قيد الإنشاء" : "جاهز للسكن"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{project.city}</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white">{project.name}</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    مجمع سكني راقٍ يتكون من {project.unitsTotal} وحدة سكنية فاخرة، مصممة بهوية معمارية تعزز جودة الحياة وتلبي تطلعات الأسر السعودية الحديثة.
                  </p>
                </div>
                
                {project.minPrice && (
                  <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-900 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">تبدأ الأسعار من:</span>
                    <span className="text-xs font-black text-amber-500">
                      {Number(project.minPrice).toLocaleString("ar-SA")} ر.س
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* قسم باقات السحابة وأسعار الاشتراكات */}
      <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wider">
            باقات التشغيل والاشتراكات السنوية
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white pt-2">اختر الباقة المناسبة لأعمالك</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">أسعار مرنة واشتراكات شهرية وسنوية تتوافق مع نمو وسعة مشاريع المطورين العقاريين</p>
        </div>

        {/* المكون التفاعلي للأسعار والجدول */}
        <PricingGrid />
      </section>

      {/* قسم بوابات دخول المستشارين العقاريين */}
      <section id="login-proposals" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white">خيارات دخول المستشار العقاري</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">طرق دخول آمنة وسهلة تضمن خصوصية البيانات لكل مستشار ومطور عقاري</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* الخيار الأول */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-lg font-bold">1</div>
            <h3 className="font-extrabold text-sm text-white">البوابة الموحدة (SSO Hub)</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              تسجيل الدخول المركزي من النطاق الرئيسي للمنصة، ثم يقوم النظام بنقلك وتوجيهك تلقائياً وبأمان إلى النطاق الفرعي الخاص بشركتك.
            </p>
          </div>

          {/* الخيار الثاني */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-lg font-bold">2</div>
            <h3 className="font-extrabold text-sm text-white">البوابات الخاصة (Company Portals)</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              بوابات دخول مخصصة يتم توفيرها على النطاق الفرعي لكل شركة (مثل saleh.orca.pro/login)، لتوفر خصوصية تامة وشعوراً بالأمان لمستشاري المبيعات.
            </p>
          </div>

          {/* الخيار الثالث */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-lg font-bold">3</div>
            <h3 className="font-extrabold text-sm text-white">الدخول السريع (WhatsApp OTP)</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              تسجيل دخول سريع من خلال كتابة رقم الجوال واستلام رمز التحقق لمرة واحدة (OTP) مباشرة على تطبيق الواتساب، مما يلغي الحاجة لكلمات المرور.
            </p>
          </div>
        </div>
      </section>

      {/* قسم صيد واقتناص واصطياد العملاء (Lead Capture Section) */}
      <section id="register-interest" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 blur-[90px] rounded-full -z-10" />
          
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-white">سجّل اهتمامك بالوحدات العقارية</h2>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              اختر المشروع السكني المفضل لديك وسجل بياناتك الآن، وسيتواصل معك مستشارك العقاري فوراً عبر الواتساب والاتصال لتزويدك بكامل البروشورات والحسبة المالية لبنكك
            </p>
          </div>

          {/* استمارة تسجيل الاهتمام المربوطة بمحرك الـ Leads السحابي الخاص بك */}
          <form action={createLeadAction} className="space-y-4 max-w-xl mx-auto">
            <input type="hidden" name="clientHost" value={host} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الاسم الأول *</label>
                <input 
                  type="text" 
                  name="firstName" 
                  required
                  placeholder="محمد"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">العائلة / القبيلة</label>
                <input 
                  type="text" 
                  name="lastName" 
                  placeholder="الغامدي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الجوال النشط *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  required
                  placeholder="05xxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-left text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">المشروع السكني المستهدف *</label>
                <select 
                  name="projectId" 
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">-- اختر المشروع السكني --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-amber-500/10 cursor-pointer"
            >
              إرسال طلب الاهتمام وتأكيد الحجز ➔
            </button>
          </form>
        </div>
      </section>

      {/* الفوتر الجمالي لشركة أوركا */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6 md:px-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-reverse space-x-3">
            <span className="text-sm font-black text-white">{companyName}</span>
            <span>-</span>
            <span>جميع الحقوق محفوظة للمطور العقاري © 2026</span>
          </div>
          <div className="flex items-center space-x-reverse space-x-2 text-[9px] text-slate-600">
            <span>مدعوم بالكامل بواسطة</span>
            <span className="font-extrabold text-amber-500/80">ali.orca</span>
          </div>
        </div>
      </footer>

    </div>
  );
}