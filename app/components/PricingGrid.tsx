// app/components/PricingGrid.tsx
"use client";

import React, { useState } from "react";
import { useApp } from "@/app/context/AppContext";

export default function PricingGrid({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const { lang } = useApp();
  const [isYearly, setIsYearly] = useState(false);
  
  const formatNumber = (num: number): string => {
    if (lang === 'EN') return num.toLocaleString("en-US");
    return num.toLocaleString("ar-SA");
  };

  const plans = [
    {
      name: "باقة النمو (Essential)",
      description: "المثالية للمستشارين والوسطاء المستقلين للبدء فوراً",
      monthlyPrice: 1499,
      yearlyPrice: 14990,
      subtext: "", // Removed "Elegant frosted glass" placeholder text
      agentsCount: "1 وكيل ذكي (ساهر جزئي)",
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
    },
    {
      name: "الباقة الاحترافية (Elite)",
      description: "الحل الأمثل للمكاتب العقارية المتوسطة لزيادة المبيعات",
      monthlyPrice: 4499,
      yearlyPrice: 44990,
      subtext: "الباقة الأكثر مبيعاً ونمواً",
      agentsCount: "٣ وكلاء أذكياء (ساهر + سند)", // Explicitly list the digital staff package
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
    },
    {
      name: "باقة النخبة (Bespoke)",
      description: "القوة الكاملة والتكامل الفاخر للشركات العقارية الكبرى",
      isBespoke: true,
      subtext: "دعم مؤسسي مخصص بالكامل",
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
    }
  ];

  return (
    <div className="space-y-12 font-sans">
      {/* مفتاح التبديل (Pricing Switcher) */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-xs font-bold transition-colors ${
          !isYearly 
            ? (theme === "dark" ? "text-[#e5c158]" : "text-[#735334]") 
            : (theme === "dark" ? "text-slate-400" : "text-slate-500")
        }`}>
          الدفع الشهري
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            theme === "dark" ? "bg-[#0b0f19] ring-1 ring-white/10" : "bg-slate-200 ring-1 ring-slate-300"
          }`}
          role="switch"
          aria-checked={isYearly}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#e5c158] shadow ring-0 transition duration-200 ease-in-out ${
              isYearly ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${
          isYearly 
            ? (theme === "dark" ? "text-[#e5c158]" : "text-[#735334]") 
            : (theme === "dark" ? "text-slate-400" : "text-slate-500")
        }`}>
          الدفع السنوي
        </span>
      </div>

      {/* شبكة الباقات الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch pt-4">
        {plans.map((plan, idx) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPrice = isYearly 
            ? Math.round(plan.yearlyPrice / 12) 
            : plan.monthlyPrice;

          // Determine if the card itself uses Dark Mode styling.
          // Card 3 (Bespoke) stays strictly dark onyx layout even when the site switches to light mode.
          const isCardDark = theme === "dark" || idx === 2;

          let cardStyle = "";
          if (idx === 0) {
            cardStyle = isCardDark 
              ? "border-slate-700/50 bg-white/5 hover:border-slate-500/80 text-white" 
              : "border-slate-200 bg-white/70 text-[#0b0f19] shadow-sm hover:border-[#e5c158]/50 shadow-slate-200/50";
          } else if (idx === 1) {
            cardStyle = isCardDark
              ? "border-[#cd7f32] shadow-[0_0_30px_rgba(205,127,50,0.25)] bg-[#cd7f32]/5 hover:border-[#d4af37] scale-105 text-white"
              : "border-[#cd7f32] shadow-sm shadow-[#cd7f32]/20 bg-white/70 hover:border-[#d4af37] scale-105 text-[#0b0f19]";
          } else {
            cardStyle = "border-[#e5e4e2] bg-[#070a12] text-white shadow-xl shadow-[#e5e4e2]/5 hover:border-white";
          }

          return (
            <div
              key={idx}
              className={`border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 backdrop-blur-md ${cardStyle}`}
            >
              <div className="space-y-6">
                {/* الهيدر والباقة */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                    plan.isPopular 
                      ? (isCardDark ? "bg-[#cd7f32]/10 text-[#e5c158] border-[#cd7f32]/30" : "bg-[#735334]/10 text-[#735334] border-[#735334]/20")
                      : idx === 2 ? "bg-white/5 text-[#e5e4e2] border-[#e5e4e2]/20" : (isCardDark ? "bg-white/5 text-slate-300 border-white/10" : "bg-slate-100 text-slate-600 border-slate-300")
                  }`}>
                    {plan.badge}
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider ${isCardDark ? "text-slate-500" : "text-slate-400"}`}>ORCA CRM</span>
                </div>

                <div className="space-y-2">
                  <h3 className={`text-xl font-black drop-shadow-sm ${isCardDark ? "text-white" : "text-[#0b0f19]"}`}>{plan.name}</h3>
                  <p className={`text-[11px] leading-relaxed min-h-[36px] font-semibold ${isCardDark ? "text-slate-400" : "text-slate-600"}`}>
                    {plan.description}
                  </p>
                  {plan.subtext && (
                    <p className={`text-[10px] font-bold ${
                      idx === 0 ? (isCardDark ? 'text-slate-400 italic' : 'text-slate-500 italic') 
                      : idx === 1 ? 'text-[#cd7f32]' 
                      : 'text-[#e5e4e2]'
                    }`}>
                      {plan.subtext}
                    </p>
                  )}
                </div>

                {/* السعر */}
                <div className={`py-6 border-y flex items-baseline gap-1.5 min-h-[80px] relative ${isCardDark ? "border-white/5" : "border-slate-200"}`}>
                  {plan.isBespoke ? (
                    <span className={`text-2xl font-black drop-shadow-sm ${isCardDark ? "text-[#e5e4e2]" : "text-[#0b0f19]"}`}>
                      Custom / اتصل بنا
                    </span>
                  ) : (
                    <>
                      <span className={`text-4xl font-black ${idx === 1 ? (isCardDark ? 'text-[#e5c158]' : 'text-[#735334]') : (isCardDark ? 'text-white' : 'text-[#0b0f19]')}`}>
                        {formatNumber(displayPrice)}
                      </span>
                      <span className={`text-xs font-bold ${isCardDark ? "text-slate-400" : "text-slate-600"}`}>
                        {lang === 'AR' ? 'ر.س / شهر' : 'SAR / month'}
                      </span>
                      {isYearly && price && (
                        <span className="text-[9px] text-[#e5c158] font-bold block mt-1 absolute bottom-1 right-0">
                          {lang === 'AR' ? `(فاتورة سنوية: ${formatNumber(price)} ر.س)` : `(Billed annually: ${formatNumber(price)} SAR)`}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* الوكلاء */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  idx === 2 ? 'bg-[#0b0f19] border-[#e5e4e2]/25' : (isCardDark ? 'bg-[#0b0f19] border-white/5' : 'bg-slate-50 border-slate-200')
                }`}>
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className={`text-[9px] font-bold mb-0.5 ${isCardDark ? 'text-slate-400' : 'text-slate-600'}`}>السعة المضمنة للوكلاء الذكيين</p>
                    <p className={`text-xs font-black ${idx === 2 ? 'text-[#e5e4e2]' : idx === 1 ? (isCardDark ? 'text-[#e5c158]' : 'text-[#735334]') : (isCardDark ? 'text-white' : 'text-[#0b0f19]')}`}>{plan.agentsCount}</p>
                  </div>
                </div>

                {/* الميزات */}
                <div className="space-y-4 pt-4">
                  <p className={`text-[10px] font-bold ${isCardDark ? 'text-slate-400' : 'text-slate-600'}`}>القدرات والخصائص المضمنة:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className={`flex items-start gap-2 text-[11px] font-semibold ${isCardDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className={`shrink-0 mt-0.5 text-[10px] ${idx === 2 ? 'text-[#e5e4e2]' : idx === 1 ? (isCardDark ? 'text-[#e5c158]' : 'text-[#735334]') : 'text-emerald-500'}`}>✓</span>
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
                      ? "bg-[#e5c158] hover:bg-[#d4af37] text-[#0b0f19] shadow-[0_0_20px_rgba(229,193,88,0.3)]"
                      : (isCardDark 
                          ? "bg-white/10 hover:bg-white/15 text-white border border-white/5" 
                          : "bg-slate-100 hover:bg-slate-200 text-[#0b0f19] border border-slate-200 shadow-sm")
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
