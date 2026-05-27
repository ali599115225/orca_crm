import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import { createLeadAction } from "@/app/actions/leads";
import PricingGrid from "./components/PricingGrid";

export const metadata = {
  title: "أوركا العقارية — النظام التشغيلي وإدارة المبيعات السحابية ORCA CRM",
  description: "المنصة السحابية الأولى لإدارة المبيعات والتطوير العقاري بالمملكة بمشرفين ووكلاء أذكياء",
};

export default async function CorporateHomePage() {
  let companyName = "شركة العلي العقارية";
  let host = "";
  
  try {
    const headersList = await headers();
    host = headersList.get("host") || "";
    const tenant = await getActiveTenant(host);
    companyName = tenant.companyName || "شركة العلي العقارية";
  } catch (e) {
    // خطوة أمان بديلة
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans text-right antialiased selection:bg-yellow-500/20 selection:text-yellow-500" dir="rtl">
      
      {/* هيدر الموقع الرسمي الزجاجي الفخم */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-reverse space-x-3">
          {/* شعار ali.orca الجديد المحدث */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-yellow-500/30 shadow-md shadow-yellow-500/10 overflow-hidden">
            <img src="/logo.png" alt="ali.orca logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white">{companyName}</span>
            <span className="text-[8px] text-yellow-500 font-bold" dir="ltr">ORCA CRM by ali.orca</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-6 text-xs font-bold text-slate-400">
          <a href="#pricing" className="hover:text-white transition-colors">الباقات والأسعار</a>
          <a href="#login-proposals" className="hover:text-white transition-colors">بوابات دخول المستشارين</a>
          <a href="#register-interest" className="hover:text-white transition-colors">سجل اهتمامك</a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          <a href="/login" className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-yellow-500/50 text-yellow-500 text-xs font-black px-4 py-2 rounded-xl transition-all duration-300 hover:scale-[1.03]">
            🔐 بوابة دخول المستشارين
          </a>
        </div>
      </header>

      {/* قسم البطل الفخم (Hero Section) للمطور العقاري */}
      <section className="relative overflow-hidden py-24 px-6 md:px-12 text-center max-w-5xl mx-auto space-y-6 z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 blur-[130px] rounded-full -z-10" />
        
        <span className="inline-block text-[10px] bg-yellow-500/10 text-yellow-500 font-extrabold px-4 py-1.5 rounded-full border border-yellow-500/20 tracking-wider">
          مطور عقاري وطني معتمد ومرخص من الهيئة العامة للعقار 🇸🇦
        </span>
        
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-white max-w-4xl mx-auto">
          نصنع جودة الحياة الفاخرة بـ <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">تطوير عقاري مستدام ومبتكر</span>
        </h1>
        
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          مرحباً بك في {companyName}. نحن نلتزم بتطوير أرقى المجمعات والأبراج والوحدات السكنية في أرجاء المملكة العربية السعودية، مصممة بأعلى معايير جودة الحياة المعمارية وأحدث التقنيات السكنية والتمويلية المتوافقة مع البنوك المحلية.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
          <a href="#register-interest" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-slate-950 text-xs font-black px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-xl shadow-yellow-500/10">
            ✉ سجل اهتمامك بالباقات العقارية
          </a>
          <a href="#pricing" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold px-8 py-3.5 rounded-xl transition-all duration-300">
            الباقات وأسعار الاشتراكات
          </a>
        </div>
      </section>

      {/* قسم باقات السحابة وأسعار الاشتراكات */}
      <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className="text-[10px] bg-yellow-500/10 text-yellow-500 font-extrabold px-3 py-1 rounded-full border border-yellow-500/20 uppercase tracking-wider">
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
            <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center text-lg font-bold">1</div>
            <h3 className="font-extrabold text-sm text-white">البوابة الموحدة (SSO Hub)</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              تسجيل الدخول المركزي من النطاق الرئيسي للمنصة، ثم يقوم النظام بنقلك وتوجيهك تلقائياً وبأمان إلى النطاق الفرعي الخاص بشركتك.
            </p>
          </div>

          {/* الخيار الثاني */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center text-lg font-bold">2</div>
            <h3 className="font-extrabold text-sm text-white">البوابات الخاصة (Company Portals)</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              بوابات دخول مخصصة يتم توفيرها على النطاق الفرعي لكل شركة (مثل saleh.orca.pro/login)، لتوفر خصوصية تامة وشعوراً بالأمان لمستشاري المبيعات.
            </p>
          </div>

          {/* الخيار الثالث */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center text-lg font-bold">3</div>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-yellow-500/5 blur-[90px] rounded-full -z-10" />
          
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-white">سجّل اهتمامك بالمنصة السحابية</h2>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              اختر الباقة المناسبة وسجل بياناتك الآن، وسيتواصل معك مستشارك التقني فوراً عبر الواتساب لتفعيل نسختك السحابية وتزويدك بتفاصيل الخدمة.
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-left text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الباقة المطلوبة *</label>
                <select 
                  name="source" 
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="باقة تجريبية مجانية">الباقة الأساسية (مجاناً - 1 وكيل)</option>
                  <option value="طلب الباقة الفضية">الباقة الفضية (3 وكلاء)</option>
                  <option value="طلب الباقة الذهبية">الباقة الذهبية (5 وكلاء)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">المدينة *</label>
                <input 
                  type="text" 
                  name="city" 
                  required
                  placeholder="الرياض"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 text-xs font-black p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-yellow-500/10 cursor-pointer"
            >
              إرسال طلب الاهتمام وتأكيد الاشتراك ➔
            </button>
          </form>
        </div>
      </section>

      {/* الفوتر الجمالي لشركة أوركا */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6 md:px-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-reverse space-x-3">
            <img src="/logo.png" alt="ali.orca logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-black text-white">{companyName}</span>
            <span>-</span>
            <span>جميع الحقوق محفوظة للمطور العقاري © 2026</span>
          </div>
          <div className="flex items-center space-x-reverse space-x-2 text-[9px] text-slate-600">
            <span>مدعوم بالكامل بواسطة</span>
            <span className="font-extrabold text-yellow-500/80">ali.orca</span>
          </div>
        </div>
      </footer>

    </div>
  );
}