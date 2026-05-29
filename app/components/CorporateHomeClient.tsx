"use client";

import React from "react";

const projects = [
  {
    id: "p1",
    name: "مجمع ريزيدنس النخبة",
    city: "الرياض",
    type: "شقق فاخرة",
    minPrice: "1,250,000",
    status: "تحت الإنشاء",
    thumbnail:
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "p2",
    name: "فلل الياسمين الملكية",
    city: "جدة",
    type: "فلل مستقلة",
    minPrice: "3,400,000",
    status: "مكتمل",
    thumbnail:
      "https://images.unsplash.com/photo-1617099404995-0a2b4f66f5c8?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "p3",
    name: "برج الأعمال المالي",
    city: "الرياض",
    type: "مكاتب + بنتهاوس",
    minPrice: "950,000",
    status: "قيد التخطيط",
    thumbnail:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=900&auto=format&fit=crop&q=80",
  },
];

export default function RealEstateLanding() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#050814] text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#050814]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-700" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-white/60">شركة التطوير العقاري</span>
            <span className="text-lg font-black tracking-wide">
              ORCA DEVELOPMENTS
            </span>
          </div>
        </div>

        <nav className="hidden md:flex gap-8 text-sm text-white/70">
          <a href="#projects" className="hover:text-amber-400">
            المشاريع
          </a>
          <a href="#why-us" className="hover:text-amber-400">
            لماذا نحن
          </a>
          <a href="#stats" className="hover:text-amber-400">
            الأرقام
          </a>
          <a href="#register" className="hover:text-amber-400">
            سجل اهتمامك
          </a>
        </nav>

        <a
          href="#register"
          className="bg-amber-500 hover:bg-amber-400 text-[#050814] px-5 py-2 rounded-xl font-bold text-sm"
        >
          حجز موعد استشارة
        </a>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-black/80" />
        <div className="absolute -left-40 top-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <p className="text-amber-400 text-xs font-semibold tracking-[0.3em] mb-4">
              استثمار عقاري عالي الجودة
            </p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              محفظة عقارية
              <span className="block text-amber-400">
                مصممة للمستثمر النخبوي
              </span>
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed mb-8">
              مشاريع سكنية وتجارية مختارة بعناية في أهم مواقع الرياض وجدة،
              بتصاميم عصرية، جودة تنفيذ عالية، وعوائد استثمارية مستهدفة
              تتوافق مع تطلعات المستثمرين الأفراد والمؤسسات.
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="#projects"
                className="bg-amber-500 hover:bg-amber-400 text-[#050814] px-7 py-3 rounded-2xl font-bold text-sm"
              >
                استعرض المشاريع المتاحة
              </a>
              <a
                href="#register"
                className="text-white/70 hover:text-white text-sm underline underline-offset-4"
              >
                طلب عرض استثماري مفصل
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 text-xs text-white/70">
              <div className="border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 mb-1">إجمالي قيمة المشاريع</p>
                <p className="text-lg font-bold text-amber-400">
                  + ٤٢٠ مليون ر.س
                </p>
              </div>
              <div className="border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 mb-1">نسبة الإشغال</p>
                <p className="text-lg font-bold text-emerald-400">٨٧٪</p>
              </div>
              <div className="border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 mb-1">عدد الوحدات</p>
                <p className="text-lg font-bold text-cyan-400">+١٢٠٠ وحدة</p>
              </div>
            </div>
          </div>

          {/* Hero Image / Project Visual */}
          <div className="relative">
            <div className="absolute -inset-6 bg-black/40 rounded-[2.5rem] border border-white/10 backdrop-blur-xl" />
            <div className="relative rounded-[2.2rem] overflow-hidden border border-white/10 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&auto=format&fit=crop&q=80"
                alt="Luxury Residence"
                className="h-80 w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 flex justify-between items-end">
                <div>
                  <p className="text-xs text-white/60 mb-1">
                    مشروع مميز في قلب الرياض
                  </p>
                  <p className="text-lg font-bold">مجمع ريزيدنس النخبة</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-white/60">تبدأ الأسعار من</p>
                  <p className="text-amber-400 font-bold text-base">
                    ١,٢٥٠,٠٠٠ ر.س
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section
        id="why-us"
        className="py-20 border-t border-white/10 bg-gradient-to-b from-black/40 to-black/80"
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black mb-10 text-center">
            لماذا ORCA DEVELOPMENTS؟
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-sm text-white/70">
            <div className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <h3 className="text-lg font-bold mb-3 text-amber-400">
                مواقع استراتيجية
              </h3>
              <p>
                اختيار مواقع المشاريع بعناية في أحياء واعدة وقريبة من
                الخدمات الرئيسية، بما يعزز القيمة المستقبلية للأصول.
              </p>
            </div>
            <div className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <h3 className="text-lg font-bold mb-3 text-amber-400">
                جودة تنفيذ عالية
              </h3>
              <p>
                شراكات مع مقاولين ومكاتب استشارية معتمدة لضمان جودة
                الإنشاءات والتشطيبات وفق أعلى المعايير.
              </p>
            </div>
            <div className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <h3 className="text-lg font-bold mb-3 text-amber-400">
                رؤية استثمارية واضحة
              </h3>
              <p>
                نماذج مالية مدروسة، عوائد مستهدفة، وخطط خروج واضحة
                للمستثمرين الأفراد والمؤسسات.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects" className="py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black">مختارات من محفظتنا العقارية</h2>
            <span className="text-xs text-white/50">
              مشاريع سكنية وتجارية مختارة بعناية
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col"
              >
                <div className="relative">
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-52 w-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-black/70 text-xs px-3 py-1 rounded-full">
                    {p.status}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">{p.name}</h3>
                    <span className="text-white/50 text-xs">{p.city}</span>
                  </div>
                  <p className="text-white/60 text-xs">{p.type}</p>
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/50">تبدأ من</span>
                    <span className="text-amber-400 font-bold">
                      {p.minPrice} ر.س
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section
        id="stats"
        className="py-16 border-t border-white/10 bg-black/70"
      >
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-6 text-center text-sm">
          <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
            <p className="text-white/50 mb-1">سنوات الخبرة</p>
            <p className="text-2xl font-black text-amber-400">١٢+</p>
          </div>
          <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
            <p className="text-white/50 mb-1">مشروع منجز</p>
            <p className="text-2xl font-black text-amber-400">٣٥+</p>
          </div>
          <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
            <p className="text-white/50 mb-1">مستثمر نشط</p>
            <p className="text-2xl font-black text-amber-400">٢٨٠+</p>
          </div>
          <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
            <p className="text-white/50 mb-1">نسبة رضا العملاء</p>
            <p className="text-2xl font-black text-emerald-400">٩٤٪</p>
          </div>
        </div>
      </section>

      {/* REGISTER INTEREST */}
      <section
        id="register"
        className="py-20 border-t border-white/10 bg-gradient-to-b from-black/80 to-[#050814]"
      >
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-black mb-4">
              سجّل اهتمامك واحصل على عرض استثماري مفصل
            </h2>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              اترك بياناتك ليتم التواصل معك من قبل فريق تطوير الأعمال،
              وتزويدك بملف استثماري يحتوي على تفاصيل المشاريع، العوائد
              المستهدفة، وخيارات الشراكة.
            </p>
            <ul className="text-sm text-white/70 space-y-2">
              <li>• ملخص تنفيذي للمشاريع الحالية</li>
              <li>• نماذج مالية وعوائد مستهدفة</li>
              <li>• خيارات تملك، مشاركة، أو تطوير مشترك</li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <form className="space-y-4 text-sm">
              <input
                type="text"
                placeholder="الاسم الكامل"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/20 text-sm"
              />
              <input
                type="tel"
                placeholder="رقم الجوال"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/20 text-sm"
              />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/20 text-sm"
              />
              <select className="w-full p-3 rounded-xl bg-black/40 border border-white/20 text-sm">
                <option>نوع المستثمر</option>
                <option>فرد</option>
                <option>شركة</option>
                <option>صندوق استثماري</option>
              </select>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-[#050814] p-3 rounded-xl font-bold"
              >
                إرسال الطلب
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-center text-xs text-white/40 border-t border-white/10">
        © {new Date().getFullYear()} ORCA DEVELOPMENTS – جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}