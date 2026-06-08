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
            ? (theme === "dark" ? "text-pricing-gold-soft" : "text-pricing-bronze-soft") 
            : (theme === "dark" ? "text-[var(--nc-text-dim)] font-medium" : "text-[var(--nc-text-dim)] font-medium")
        }`}>
          الدفع الشهري
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            theme === "dark" ? "bg-[var(--nc-bg)] ring-1 ring-white/10" : "bg-[var(--nc-surface)] ring-1 ring-slate-300"
          }`}
          role="switch"
          aria-checked={isYearly}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-pricing-gold-soft shadow ring-0 transition duration-200 ease-in-out ${
              isYearly ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${
          isYearly 
            ? (theme === "dark" ? "text-pricing-gold-soft" : "text-pricing-bronze-soft") 
            : (theme === "dark" ? "text-[var(--nc-text-dim)] font-medium" : "text-[var(--nc-text-dim)] font-medium")
        }`}>
          الدفع السنوي
        </span>
      </div>

      {/* شبكة الباقات الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch pt-4">
        {plans.map((plan, idx) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPrice = isYearly 
            ? (plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : 0) 
            : (plan.monthlyPrice || 0);

          // Determine if the card itself uses Dark Mode styling.
          // Card 3 (Bespoke) stays strictly dark onyx layout even when the site switches to light mode.
          const isCardDark = theme === "dark" || idx === 2;

          let cardStyle = "";
          if (idx === 0) {
            cardStyle = isCardDark 
              ? "border-slate-700/50 bg-white/5 hover:border-slate-500/80 text-white" 
              : "border-[var(--nc-glass-border)] bg-white/70 text-[var(--nc-text-primary)] shadow-sm hover:border-pricing-gold-soft/50 shadow-slate-200/50";
          } else if (idx === 1) {
            cardStyle = isCardDark
              ? "border-pricing-bronze shadow-[0_0_30px_var(--color-pricing-bronze)] bg-pricing-bronze/5 hover:border-pricing-gold scale-105 text-white"
              : "border-pricing-bronze shadow-sm shadow-pricing-bronze/20 bg-white/70 hover:border-pricing-gold scale-105 text-[var(--nc-text-primary)]";
          } else {
            cardStyle = "border-pricing-silver bg-[var(--nc-bg)] text-white shadow-xl shadow-pricing-silver/5 hover:border-white";
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
                      ? (isCardDark ? "bg-pricing-bronze/10 text-pricing-gold-soft border-pricing-bronze/30" : "bg-pricing-bronze-soft/10 text-pricing-bronze-soft border-pricing-bronze-soft/20")
                      : idx === 2 ? "bg-white/5 text-pricing-silver border-pricing-silver/20" : (isCardDark ? "bg-white/5 text-[var(--nc-text-dim)] font-medium border-white/10" : "bg-[var(--nc-surface)] text-[var(--nc-text-dim)] font-medium border-slate-300")
                  }`}>
                    {plan.badge}
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider ${isCardDark ? "text-[var(--nc-text-dim)] font-medium" : "text-[var(--nc-text-dim)] font-medium"}`}>ORCA CRM</span>
                </div>

                <div className="space-y-2">
                  <h3 className={`text-xl font-black drop-shadow-sm ${isCardDark ? "text-white" : "text-[var(--nc-text-primary)]"}`}>{plan.name}</h3>
                  <p className={`text-[11px] leading-relaxed min-h-[36px] font-semibold ${isCardDark ? "text-[var(--nc-text-dim)] font-medium" : "text-[var(--nc-text-dim)] font-medium"}`}>
                    {plan.description}
                  </p>
                  {plan.subtext && (
                    <p className={`text-[10px] font-bold ${
                      idx === 0 ? (isCardDark ? 'text-[var(--nc-text-dim)] font-medium italic' : 'text-[var(--nc-text-dim)] font-medium italic') 
                      : idx === 1 ? 'text-pricing-bronze' 
                      : 'text-pricing-silver'
                    }`}>
                      {plan.subtext}
                    </p>
                  )}
                </div>

                {/* السعر */}
                <div className={`py-6 border-y flex items-baseline gap-1.5 min-h-[80px] relative ${isCardDark ? "border-white/5" : "border-[var(--nc-glass-border)]"}`}>
                  {plan.isBespoke ? (
                    <span className={`text-2xl font-black drop-shadow-sm ${isCardDark ? "text-pricing-silver" : "text-[var(--nc-text-primary)]"}`}>
                      Custom / اتصل بنا
                    </span>
                  ) : (
                    <>
                      <span className={`text-4xl font-black ${idx === 1 ? (isCardDark ? 'text-pricing-gold-soft' : 'text-pricing-bronze-soft') : (isCardDark ? 'text-white' : 'text-[var(--nc-text-primary)]')}`}>
                        {formatNumber(displayPrice)}
                      </span>
                      <span className={`text-xs font-bold ${isCardDark ? "text-[var(--nc-text-dim)] font-medium" : "text-[var(--nc-text-dim)] font-medium"}`}>
                        {lang === 'AR' ? 'ر.س / شهر' : 'SAR / month'}
                      </span>
                      {isYearly && price && (
                        <span className="text-[9px] text-pricing-gold-soft font-bold block mt-1 absolute bottom-1 right-0">
                          {lang === 'AR' ? `(فاتورة سنوية: ${formatNumber(price)} ر.س)` : `(Billed annually: ${formatNumber(price)} SAR)`}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* الوكلاء */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  idx === 2 ? 'bg-[var(--nc-bg)] border-pricing-silver/25' : (isCardDark ? 'bg-[var(--nc-bg)] border-white/5' : 'bg-slate-50 border-[var(--nc-glass-border)]')
                }`}>
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className={`text-[9px] font-bold mb-0.5 ${isCardDark ? 'text-[var(--nc-text-dim)] font-medium' : 'text-[var(--nc-text-dim)] font-medium'}`}>السعة المضمنة للوكلاء الذكيين</p>
                    <p className={`text-xs font-black ${idx === 2 ? 'text-pricing-silver' : idx === 1 ? (isCardDark ? 'text-pricing-gold-soft' : 'text-pricing-bronze-soft') : (isCardDark ? 'text-white' : 'text-[var(--nc-text-primary)]')}`}>{plan.agentsCount}</p>
                  </div>
                </div>

                {/* الميزات */}
                <div className="space-y-4 pt-4">
                  <p className={`text-[10px] font-bold ${isCardDark ? 'text-[var(--nc-text-dim)] font-medium' : 'text-[var(--nc-text-dim)] font-medium'}`}>القدرات والخصائص المضمنة:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className={`flex items-start gap-2 text-[11px] font-semibold ${isCardDark ? 'text-[var(--nc-text-dim)] font-medium' : 'text-slate-700'}`}>
                        <span className={`shrink-0 mt-0.5 text-[10px] ${idx === 2 ? 'text-pricing-silver' : idx === 1 ? (isCardDark ? 'text-pricing-gold-soft' : 'text-pricing-bronze-soft') : 'text-emerald-500'}`}>✓</span>
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
                      ? "bg-pricing-gold-soft hover:bg-pricing-gold text-[var(--nc-text-primary)] shadow-[0_0_20px_var(--color-pricing-gold-soft)]"
                      : (isCardDark 
                          ? "bg-white/10 hover:bg-white/15 text-white border border-white/5" 
                          : "bg-[var(--nc-surface)] hover:bg-[var(--nc-surface)] text-[var(--nc-text-primary)] border border-[var(--nc-glass-border)] shadow-sm")
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
