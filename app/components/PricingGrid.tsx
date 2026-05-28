// app/components/PricingGrid.tsx
"use client";

import React, { useState } from "react";

export default function PricingGrid() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "باقة النمو (Essential)",
      description: "المثالية للمستشارين والوسطاء المستقلين للبدء فوراً",
      monthlyPrice: 199,
      yearlyPrice: 1990,
      agentsCount: "1 وكيل ذكي (راصد جزئي)",
      features: [
        "إدارة العملاء المحتملين (Leads)",
        "حساب لـ 2 موظفين بشرين كحد أقصى",
        "لوحة تحليلات وتقارير مبسطة",
        "إسناد تلقائي وذكي للعملاء",
        "دعم فني عبر التذاكر",
        "تخزين بيانات آمن ومعزول"
      ],
      badge: "البداية السريعة",
      isPopular: false,
      style: "border-slate-700 bg-white/5 hover:border-slate-500/80" // Standard clean frosted glass
    },
    {
      name: "الباقة الاحترافية (Elite)",
      description: "الحل الأمثل للمكاتب العقارية المتوسطة لزيادة المبيعات",
      monthlyPrice: 599,
      yearlyPrice: 5990,
      agentsCount: "3 وكلاء أذكياء (راصد + سند)",
      features: [
        "كل ما تشمله باقة النمو",
        "حسابات لـ 10 موظفين بشرين كحد أقصى",
        "ربط واتساب متكامل ونشط",
        "محاكي التفاعل التلقائي بالذكاء الاصطناعي",
        "تتبع المهام وجدولة الزيارات والصفقات",
        "شراء وكلاء إضافيين متوفر"
      ],
      badge: "الأكثر شيوعاً 🔥",
      isPopular: true,
      style: "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)] bg-indigo-950/20 hover:border-indigo-400" // Royal Blue / Indigo pop
    },
    {
      name: "باقة النخبة (Bespoke)",
      description: "القوة الكاملة والتكامل الفاخر للشركات العقارية الكبرى",
      monthlyPrice: 1199,
      yearlyPrice: 11990,
      agentsCount: "قدرة وكلاء غير محدودة (Unlimited)",
      features: [
        "كل ما تشمله الباقة الاحترافية",
        "حسابات موظفين بشرين غير محدودة (لا محدود)",
        "دعم فني ممتاز على مدار الساعة 24/7",
        "تخصيص كامل لبنود السياسات والعقود",
        "تصدير وطباعة العقود السكنية رسمياً",
        "لوحة دعم سحابية خاصة للمشرفين العامين"
      ],
      badge: "الخيار المؤسسي",
      isPopular: false,
      style: "border-yellow-600/50 bg-[#070a12] shadow-xl shadow-yellow-600/5 hover:border-yellow-500" // Dark custom card with luxury gold borders
    }
  ];

  return (
    <div className="space-y-12 font-sans">
      {/* مفتاح التبديل (Pricing Switcher) */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-xs font-bold transition-colors ${!isYearly ? "text-emerald-400" : "text-slate-400"}`}>
          الدفع الشهري
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#0b0f19] ring-1 ring-white/10 transition-colors duration-200 ease-in-out focus:outline-none"
          role="switch"
          aria-checked={isYearly}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-emerald-500 shadow ring-0 transition duration-200 ease-in-out ${
              isYearly ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? "text-emerald-400" : "text-slate-400"}`}>
          الدفع السنوي
        </span>
      </div>

      {/* شبكة الباقات الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, idx) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPrice = isYearly 
            ? Math.round(plan.yearlyPrice / 12) 
            : plan.monthlyPrice;

          return (
            <div
              key={idx}
              className={`border rounded-3xl p-8 flex flex-col justify-between transition-all duration-400 hover:-translate-y-2 backdrop-blur-md ${plan.style}`}
            >
              <div className="space-y-6">
                {/* الهيدر والباقة */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                    plan.isPopular 
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                      : idx === 2 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-white/5 text-slate-300 border-white/10"
                  }`}>
                    {plan.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold tracking-wider">ORCA CRM</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white drop-shadow-sm">{plan.name}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed min-h-[36px] font-semibold">
                    {plan.description}
                  </p>
                </div>

                {/* السعر */}
                <div className="py-6 border-y border-white/5 flex items-baseline gap-1.5">
                  <span className={`text-4xl font-black ${idx === 2 ? 'text-yellow-500' : 'text-white'}`}>
                    {displayPrice.toLocaleString("ar-SA")}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">ر.س / شهر</span>
                  {isYearly && (
                    <span className="text-[9px] text-emerald-500 font-bold block mt-1 absolute -bottom-4 right-0">
                      (فاتورة سنوية: {price.toLocaleString("ar-SA")} ر.س)
                    </span>
                  )}
                </div>

                {/* الوكلاء */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${idx === 2 ? 'bg-[#0b0f19] border-yellow-600/30' : 'bg-[#0b0f19] border-white/5'}`}>
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold mb-0.5">السعة المضمنة للوكلاء الذكيين</p>
                    <p className={`text-xs font-black ${idx === 2 ? 'text-yellow-500' : idx === 1 ? 'text-indigo-400' : 'text-white'}`}>{plan.agentsCount}</p>
                  </div>
                </div>

                {/* الميزات */}
                <div className="space-y-4 pt-4">
                  <p className="text-[10px] text-slate-400 font-bold">القدرات والخصائص المضمنة:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-[11px] font-semibold text-slate-300">
                        <span className={`shrink-0 mt-0.5 text-[10px] ${idx === 2 ? 'text-yellow-500' : idx === 1 ? 'text-indigo-400' : 'text-emerald-500'}`}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* زر الطلب والاتصال */}
              <div className="pt-8">
                <a
                  href="#register-interest"
                  className={`block w-full text-center p-4 rounded-xl text-xs font-black transition-all active:scale-[0.99] ${
                    plan.isPopular
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : idx === 2
                      ? "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                      : "bg-white/10 hover:bg-white/15 text-white border border-white/5"
                  }`}
                >
                  اختيار الباقة والتفعيل ➔
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
