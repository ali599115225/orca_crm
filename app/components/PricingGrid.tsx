// app/components/PricingGrid.tsx
"use client";

import React, { useState } from "react";

export default function PricingGrid() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "الباقة الأساسية",
      description: "المثالية للمستشارين والوسطاء المستقلين للبدء فوراً",
      monthlyPrice: 299,
      yearlyPrice: 2870,
      agentsCount: "1 وكيل مجاناً",
      features: [
        "إدارة العملاء المحتملين (Leads)",
        "لوحة تحليلات وتقارير مبسطة",
        "إسناد تلقائي وذكي للعملاء",
        "دعم فني عبر التذاكر",
        "تخزين بيانات آمن ومعزول"
      ],
      badge: "البداية السريعة",
      isPopular: false,
      style: "border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80"
    },
    {
      name: "الباقة الفضية",
      description: "الحل الأمثل للمكاتب العقارية المتوسطة لزيادة المبيعات",
      monthlyPrice: 699,
      yearlyPrice: 6710,
      agentsCount: "3 وكلاء أذكياء",
      features: [
        "كل ما تشمله الباقة الأساسية",
        "ربط واتساب متكامل ونشط",
        "محاكي التفاعل التلقائي بالذكاء الاصطناعي",
        "تتبع المهام وجدولة الزيارات والصفقات",
        "شراء وكلاء إضافيين متوفر"
      ],
      badge: "الأكثر شيوعاً 🔥",
      isPopular: true,
      style: "border-yellow-500/30 bg-slate-900/60 shadow-xl shadow-yellow-500/5 hover:border-yellow-500/60"
    },
    {
      name: "الباقة الذهبية",
      description: "القوة الكاملة والتكامل الفاخر للشركات العقارية الكبرى",
      monthlyPrice: 1499,
      yearlyPrice: 14390,
      agentsCount: "5 وكلاء أذكياء",
      features: [
        "كل ما تشمله الباقة الفضية",
        "دعم فني ممتاز على مدار الساعة 24/7",
        "تخصيص كامل لبنود السياسات والعقود",
        "تصدير وطباعة العقود السكنية رسمياً",
        "لوحة دعم سحابية للمشرفين العامين"
      ],
      badge: "الخيار الاحترافي",
      isPopular: false,
      style: "border-slate-800/80 bg-slate-900/40 hover:border-yellow-500/40"
    }
  ];

  return (
    <div className="space-y-12">
      {/* مفتاح التبديل (Pricing Switcher) */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-xs font-bold transition-colors ${!isYearly ? "text-yellow-500" : "text-slate-400"}`}>
          الدفع الشهري
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-800 transition-colors duration-200 ease-in-out focus:outline-none"
          role="switch"
          aria-checked={isYearly}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-yellow-500 shadow ring-0 transition duration-200 ease-in-out ${
              isYearly ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? "text-yellow-500" : "text-slate-400"}`}>
          الدفع السنوي
          <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
            خصم 20% ⚡
          </span>
        </span>
      </div>

      {/* شبكة الباقات الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPrice = isYearly 
            ? Math.round(plan.yearlyPrice / 12) 
            : plan.monthlyPrice;

          return (
            <div
              key={idx}
              className={`border rounded-3xl p-8 flex flex-col justify-between transition-all duration-400 hover:scale-[1.03] premium-card ${plan.style}`}
            >
              <div className="space-y-6">
                {/* الهيدر والباقة */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                    plan.isPopular 
                      ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/20" 
                      : "bg-slate-800 text-slate-400 border-slate-700/80"
                  }`}>
                    {plan.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">ORCA CRM</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">{plan.name}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* السعر */}
                <div className="py-4 border-y border-slate-900 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">
                    {displayPrice.toLocaleString("ar-SA")}
                  </span>
                  <span className="text-xs text-slate-400">ر.س / شهر</span>
                  {isYearly && (
                    <span className="text-[9px] text-emerald-500 font-bold block mt-1">
                      (فاتورة سنوية بقيمة {price.toLocaleString("ar-SA")} ر.س)
                    </span>
                  )}
                </div>

                {/* الوكلاء */}
                <div className="flex items-center gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold">السعة المضمنة للوكلاء</p>
                    <p className="text-xs font-black text-yellow-500">{plan.agentsCount}</p>
                  </div>
                </div>

                {/* الميزات */}
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] text-slate-400 font-bold">الميزات والخصائص المضمنة:</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-[11px] font-semibold text-slate-300">
                        <span className="text-yellow-500 shrink-0 mt-0.5">✓</span>
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
                  className={`block w-full text-center p-3.5 rounded-xl text-xs font-black transition-all active:scale-[0.99] ${
                    plan.isPopular
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 shadow-lg shadow-yellow-500/10"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-750"
                  }`}
                >
                  طلب الاشتراك وتفعيل السحابة ➔
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
