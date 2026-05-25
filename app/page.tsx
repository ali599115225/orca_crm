// app/page.tsx
import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans text-right antialiased selection:bg-amber-500/20 selection:text-amber-500" dir="rtl">
      
      {/* 1. شريط التنقل العلوي (Navbar) بتأثير زجاجي شفاف */}
      <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-md border-b border-slate-900 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-reverse space-x-3">
          <span className="text-xl font-black tracking-wider text-amber-500">ORCA CRM</span>
          <span className="hidden md:inline-block bg-slate-900 text-[10px] px-2.5 py-1 rounded-md text-slate-400 font-extrabold border border-slate-800">
            شريك التطوير العقاري
          </span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-6 text-xs font-bold text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">المميزات</a>
          <a href="#pipeline" className="hover:text-white transition-colors">دورة العمليات</a>
          <a href="#pricing" className="hover:text-white transition-colors">الباقات والأسعار</a>
          <a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة</a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          <a href="/login" className="text-xs font-bold text-slate-300 hover:text-white transition-colors px-4 py-2">
            تسجيل الدخول
          </a>
          <a href="/register" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-amber-500/10">
            ابدأ مجاناً
          </a>
        </div>
      </header>

      {/* 2. قسم البطل الرئيسي (Hero Section) الفخم مع نقوش ضوئية */}
      <section className="relative overflow-hidden py-20 px-6 md:px-12 text-center max-w-5xl mx-auto space-y-6 z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full -z-10" />
        
        <span className="inline-block text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-4 py-1.5 rounded-full border border-amber-500/20 tracking-wider">
          المنصة التشغيلية الأولى لشركات التطوير العقاري بالمملكة 🇸🇦
        </span>
        
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-white max-w-4xl mx-auto">
          نظّم عمليات مبيعاتك وأغلق صفقاتك العقارية <span className="text-amber-500 bg-clip-text">بذكاء وسرعة فائقة</span>
        </h1>
        
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          ORCA هو نظام CRM تشغيلي مخصص بالكامل لقطاع التطوير العقاري السعودي. يساعدك في أتمتة حملاتك الإعلانية، ومنع تكرار العملاء، ومراقبة أداء المبيعات، ومتابعة رحلة العميل بالكامل داخل منشأتك [1, 2].
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
          <a href="/register" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-xl shadow-amber-500/10">
            ابدأ تجربتك السحابية المجانية
          </a>
          <a href="#features" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold px-8 py-3.5 rounded-xl transition-all duration-300">
            استكشف الميزات والعمليات
          </a>
        </div>
      </section>

      {/* 3. قسم المميزات الأساسية للنظام (SaaS Features) */}
      <section id="features" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white">لماذا يختار المطورون العقاريون منصة ORCA؟</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">ميزات مصممة خصيصاً لحل أعقد المشاكل التشغيلية في المبيعات العقارية بالمملكة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* الميزة 1 */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all duration-300">
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-bold mb-4">🚫</div>
            <h4 className="font-extrabold text-sm text-white">منع تكرار العملاء (Duplicate Detection)</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يقوم النظام بالتحقق الصارم والفوري من أرقام الجوال المدخلة لمنع تكرار العملاء وحل تضارب المبيعات وتوزيع العمولات بعدالة تامة.
            </p>
          </div>

          {/* الميزة 2 */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all duration-300">
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-bold mb-4">🎯</div>
            <h4 className="font-extrabold text-sm text-white">تقييم مستشاري المبيعات والـ KPIs</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              احتساب نسب تحويل المستشارين من عملاء محتملين إلى حجز وعقود، ومراقبة سرعة استجابتهم للعملاء تلقائياً لزيادة كفاءة القسم [1.2.1].
            </p>
          </div>

          {/* الميزة 3 */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all duration-300">
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-bold mb-4">🏢</div>
            <h4 className="font-extrabold text-sm text-white">إدارة المشاريع ومراقبة المخزون</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تحديث دورة حياة المشاريع السكنية، تتبع حالة الوحدات (المباعة، المحجوزة، الشاغرة)، ومطابقتها الفورية مع العملاء لسهولة اتخاذ القرار.
            </p>
          </div>
        </div>
      </section>

      {/* 4. قسم الباقات والأسعار الموحد (Pricing Section) */}
      <section id="pricing" className="py-20 bg-slate-950 border-t border-slate-900 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <h2 className="text-2xl md:text-3xl font-black text-white">خطط اشتراك مرنة تناسب حجم منشأتك</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">باقات ممتازة تدعم الدفع المحلي بـ مدى ومصممة لدعم نموك العقاري من اليوم الأول [1.2.1]</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* باقة 1 */}
          <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900/20 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">الباقة الأساسية (Basic)</h3>
              <p className="text-[10px] text-slate-400 mt-1">تأسيس ممتاز للشركات العقارية الناشئة</p>
              <div className="my-4">
                <span className="text-3xl font-black text-white">299</span>
                <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-2.5 mt-4 border-t border-slate-800 pt-4">
                <li>✔ حتى 500 عميل محتملاً</li>
                <li>✔ إدارة حتى 3 مشاريع عقارية</li>
                <li>✔ مستخدمين عدد 2 مبيعات</li>
                <li>✔ دعم فني أساسي عبر التذاكر</li>
              </ul>
            </div>
            <a href="/register?plan=basic" className="w-full mt-6 bg-slate-900 text-center text-white hover:bg-slate-800 border border-slate-800 transition-colors p-2.5 rounded-lg text-xs font-bold">
              حجز الباقة الآن
            </a>
          </div>

          {/* باقة 2 الاحترافية */}
          <div className="border border-amber-500/60 rounded-2xl p-6 bg-amber-500/5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[8px] px-3.5 py-1 rounded-bl-lg"> الباقة الأكثر طلباً </span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">الباقة الاحترافية (Professional)</h3>
              <p className="text-[10px] text-slate-400 mt-1">المحرك الأقوى لشركات التطوير والمكاتب العقارية النشطة</p>
              <div className="my-4">
                <span className="text-3xl font-black text-white">599</span>
                <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
              </div>
              <ul className="text-[10px] text-slate-300 space-y-2.5 mt-4 border-t border-amber-500/10 pt-4">
                <li>✔ عملاء محتملين غير محدودين</li>
                <li>✔ مشاريع عقارية غير محدودة</li>
                <li>✔ حتى 10 مستشاري مبيعات وعزل كامل</li>
                <li>✔ ميزة منع التكرار والتحقق الصارم</li>
                <li>✔ ربط منصات Snapchat و Meta Ads</li>
              </ul>
            </div>
            <a href="/register?plan=professional" className="w-full mt-6 bg-amber-500 text-center text-slate-950 hover:bg-amber-600 transition-colors p-2.5 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/10">
              حجز الباقة الآن (مدى / فيزا)
            </a>
          </div>

          {/* باقة 3 */}
          <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900/20 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">باقة الشركات الكبرى (Enterprise)</h3>
              <p className="text-[10px] text-slate-400 mt-1">تكامل تقني مخصص لشركات الاستثمار الكبرى</p>
              <div className="my-4">
                <span className="text-3xl font-black text-white">1,299</span>
                <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-2.5 mt-4 border-t border-slate-800 pt-4">
                <li>✔ جميع ميزات الباقة الاحترافية</li>
                <li>✔ مستخدمين ومبيعات غير محدودين</li>
                <li>✔ ربط مباشر بنظام التنبيهات والـ WhatsApp</li>
                <li>✔ تخصيص البوابة التعاونية وعزل السيرفر</li>
                <li>✔ دعم فني مخصص للشركات 24/7</li>
              </ul>
            </div>
            <a href="/register?plan=enterprise" className="w-full mt-6 bg-slate-900 text-center text-white hover:bg-slate-800 border border-slate-800 transition-colors p-2.5 rounded-lg text-xs font-bold">
              تواصل معنا للتعاقد
            </a>
          </div>
        </div>
      </section>

      {/* 5. فوتر الموقع الجمالي */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6 md:px-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-reverse space-x-3">
            <span className="text-sm font-black text-white">ORCA CRM</span>
            <span>-</span>
            <span>جميع الحقوق محفوظة لوكالة ORCA الرقمية © 2026</span>
          </div>
          <p className="text-[10px] text-slate-600">رقم الإصدار MVP 1.0 - مصمم ومطور بفخر لدعم قطاع التطوير العقاري بالمملكة</p>
        </div>
      </footer>

    </div>
  );
}