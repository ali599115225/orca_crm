"use client";

import React, { useState } from "react";
import PricingGrid from "./PricingGrid";
import { createLeadAction } from "@/app/actions/leads";
import { useApp } from "@/app/context/AppContext";

interface Project {
  id: string;
  name: string;
  city: string;
  status: string;
  unitsTotal: number;
  unitsSold: number;
  unitsBooked: number;
  minPrice: number | null;
  maxPrice: number | null;
}

interface CorporateHomeClientProps {
  host: string;
  companyName: string;
  initialProjects?: Project[];
}

const DEFAULT_LUXURY_PROJECTS = [
  { id: "luxury-project-1", nameAr: "مجمع ريزيدنس الفضي", nameEn: "Silver Residence Compound", cityAr: "الرياض", cityEn: "Riyadh", minPrice: 1250000, status: "UNDER_CONSTRUCTION", layoutAr: "شقق عائلية فاخرة | ٤ غرف وصالة | دور متكرر", layoutEn: "Luxury Family Apartments | 4 Rooms & Salon | Standard Floor", thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60" },
  { id: "luxury-project-2", nameAr: "فلل الياسمين الملكية", nameEn: "Royal Jasmine Villas", cityAr: "جدة", cityEn: "Jeddah", minPrice: 3400000, status: "COMPLETED", layoutAr: "قصور مستقلة | ٦ غرف وصالتين | واجهات حجرية عصرية", layoutEn: "Standalone Palaces | 6 Rooms & 2 Salons | Modern Stone Facades", thumbnail: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=60" },
  { id: "luxury-project-3", nameAr: "برج النخبة المالي", nameEn: "Elite Financial Tower", cityAr: "الرياض", cityEn: "Riyadh", minPrice: 950000, status: "PLANNING", layoutAr: "مكاتب ذكية وشقق بنتهاوس فاخرة", layoutEn: "Smart Offices & Luxury Penthouse Suites", thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60" }
];

const FALLBACK_THUMBNAILS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=60"
];

const TRANSLATIONS = {
  AR: {
    navFeatures: "بنية النظام الذكي",
    navWorkflow: "الوكلاء الرقميون",
    navProperties: "الأصول الفاخرة",
    navPricing: "الباقات الاستثمارية",
    startFree: "ابدأ مجاناً",
    heroBadge: "المنصة الرائدة للمطورين العقاريين في الخليج",
    heroSub: "المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة، مدعومة بدرع سيبراني منيع يشفر عقودك ويحمي أصولك وبياناتك المالية تلقائياً.",
    heroCTA: "ابدأ إدارة محفظتك الاستثمارية مجاناً",
    serverRiyadh: "خادم الرياض: آمن ١٠٠٪",
    cyberShield: "الدرع السيبراني: نشط",
    soldUnits: "الوحدات المباعة: ٤٢٠ وحدة",
    availUnits: "الوحدات المتاحة: ١٥٠ وحدة",
    bookedUnits: "الوحدات المحجوزة: ٨٥ وحدة",
    netFlows: "التدفقات النقدية المحصنة: ٤٢,٥٠٠,٠٠٠ ر.س",
    fromPortfolio: "من المحفظة",
    digitalEmployees: "الموظفون الرقميون",
    workflowTitle: "دورة عمل ذكية خالية من التدخل البشري",
    workflowSub: "منصة تعتمد بالكامل على وكلاء ذكاء اصطناعي يقودون المبيعات ويحفظون الأصول بفاعلية متناهية.",
    agentSaher: "الوكيل: ساهر (Saher)",
    saherRole: "وحدة فحص وفرز العملاء (Lead Capture & Qualification)",
    saherBullets: ["استقبل وتصنيف العملاء من الحملات بذكاء", "الرد الفوري وقياس مدى جدية الاهتمام تلقائياً", "جدولة المواعيد وتوجيه المهام للفريق البشري"],
    agentSanad: "الوكيل: سند (Sanad)",
    sanadRole: "وحدة التحصيل والتحكم المالي (Financial Collection)",
    sanadBullets: ["متابعة وتتبع جداول الأقساط المستحقة", "إرسال روابط دفع مشفرة وآمنة عبر الواتساب", "تحديث السجلات المالية وإيقاف الخدمات للمتأخرين آلياً"],
    feature1Title: "إدارة المخزون الحركي",
    feature1Desc: "(Kinetic Inventory Management) نظام تتبع ديناميكي للوحدات المتاحة والمحجوزة والمباعة بتحديثات لحظية تمنع أي تعارض في الحجوزات.",
    feature2Title: "لوحة الوسطاء الموحدة",
    feature2Desc: "(Unified Broker Portal) منصة موحدة لإدارة جميع الوكالات ومسوقي العقارات، توزيع العمولات تلقائياً وحساب الإنجاز بدقة فائقة.",
    feature3Title: "درع الحماية الكاملة والتشفير السيبراني",
    feature3Desc: "تشفير مصرفي متطور وعالي الكفاءة لحماية بيانات المشترين، الصكوك العقارية، وعقود الأقساط المالية دون أي ثغرات أو تدخل خارجي.",
    pricingTitle: "حدد قدرة وكلاء الذكاء الاصطناعي",
    pricingSub: "بنية تسعير مصممة لتواكب حجم العمليات والمبيعات المستهدفة لمنشأتك العقارية.",
    supportTitle: "📞 دعم النخبة",
    supportDesc: "مدراء حسابات متوفرون على مدار الساعة لخدمة عملائنا.",
    whatsappContact: "واتساب التواصل: +٩٦٦ ٥٠ ٥١٢ ٣٤٥٦",
    financialSecurity: "💳 الأمان المالي",
    securityDesc: "بوابة دفع مشفرة بالكامل.",
    allRights: "جميع الحقوق محفوظة لمنصة أوركا © ٢٠٢٦",
    landing: { heroTitle: "الجيل الجديد من إدارة العقارات: أتمتة كاملة مدفوعة بـ Orca CRM للوكلاء ونظام الحماية السيبرانية" },
    cloudStatus: "حالة الاتصال السحابي: مشفر وآمن ١٠٠٪",
    investorTitle: "نموذج الاقتناص الاستثماري المباشر",
    investorSubtitle: "وثّق اهتمامك الاستثماري فوريّاً ليتم تأهيل وفحص الملاءة المالية تلقائياً بواسطة ساهر",
    investorNameLabel: "الاسم الثنائي للمستثمر *",
    investorNamePlaceholder: "الاسم الأول والاسم الأخير",
    phoneLabel: "رقم الجوال الموثق *",
    phonePlaceholder: "٠٥xxxxxxxx",
    projectLabel: "المشروع العقاري المستهدف *",
    projectPlaceholder: "اختر المشروع السكني المستهدف",
    submitBtn: "توثيق الاهتمام وتأهيل الطلب فوريّاً",
    galleryTitle: "معرض الأصول العقارية الفاخرة",
    gallerySubtitle: "استعرض الأصول العقارية المتاحة والمدرجة حالياً في المحفظة الاستثمارية للشركة",
    pricingStarts: "تبدأ الأسعار من:",
    unitLayout: "٤ غرف وصالة | دور متكرر",
    saudiRiyal: "ر.س",
    statusPlanning: "قيد التخطيط",
    statusUnderConstruction: "تحت الإنشاء",
    statusCompleted: "مكتمل التطوير",
    statusSoldOut: "مباع بالكامل"
  },
  EN: {
    navFeatures: "Smart Architecture",
    navWorkflow: "Digital Agents",
    navProperties: "Luxury Assets",
    navPricing: "Investment Tiers",
    startFree: "Start Free",
    heroBadge: "The Leading Platform for Gulf Real Estate Developers",
    heroSub: "An innovative cloud platform running 24/7 autonomous digital staff to manage sales and collection, backed by a robust cyber-defense shield protecting your contracts and financial assets.",
    heroCTA: "Start Managing Your Portfolio Free",
    serverRiyadh: "Riyadh Server: 100% Secure",
    cyberShield: "Cyber Shield: Active",
    soldUnits: "Sold Units: 420 Units",
    availUnits: "Available Units: 150 Units",
    bookedUnits: "Reserved Units: 85 Units",
    netFlows: "Secured Cash Flows: 42,500,000 SAR",
    fromPortfolio: "of Portfolio",
    digitalEmployees: "Digital Staff",
    workflowTitle: "Autonomous Touchless Workflows",
    workflowSub: "A platform driven entirely by AI agents that accelerate sales and secure financial collection with supreme efficiency.",
    agentSaher: "Agent: Saher",
    saherRole: "Lead Qualification Module",
    saherBullets: ["Intelligently captures and segments campaign leads", "Immediate automated response and qualification screening", "Schedules onsite visits and routes leads to agents"],
    agentSanad: "Agent: Sanad",
    sanadRole: "Financial Collection Module",
    sanadBullets: ["Monitors installment milestones and schedules", "Dispatches secure encrypted payment links via WhatsApp", "Automatically updates ledgers and suspends overdue accounts"],
    feature1Title: "Kinetic Inventory Management",
    feature1Desc: "A dynamic real-time tracking engine for available, reserved, and sold units preventing double bookings.",
    feature2Title: "Unified Broker Portal",
    feature2Desc: "A centralized platform to coordinate broker channels, automate split commission payouts, and trace agency KPIs.",
    feature3Title: "Cyber Shield Protection",
    feature3Desc: "Bank-grade high-security encryption wrapping buyer accounts, title deeds, and installment transactions securely.",
    pricingTitle: "Empower Your Digital Agents",
    pricingSub: "Customizable subscription plans built to scale with your property transaction volumes.",
    supportTitle: "⚡ Elite Support",
    supportDesc: "Dedicated account executives available 24/7 to handle configuration support.",
    whatsappContact: "WhatsApp Contact: +966 50 512 3456",
    financialSecurity: "💳 Secure Payments",
    securityDesc: "100% encrypted bank-grade checkout endpoints.",
    allRights: "All rights reserved to Orca CRM © 2026",
    landing: { heroTitle: "Next-Gen Real Estate: 100% Automations Powered by Orca CRM and Cyber Security Protection" },
    cloudStatus: "Cloud Sync Status: 100% Encrypted & Secure",
    investorTitle: "Direct Investor Capture Node",
    investorSubtitle: "Log your investment intent now to initiate automatic solvency qualification by Agent Saher",
    investorNameLabel: "Two-Word Investor Name *",
    investorNamePlaceholder: "First and Last Name",
    phoneLabel: "Verified Mobile Number *",
    phonePlaceholder: "05xxxxxxxx",
    projectLabel: "Target Investment Asset *",
    projectPlaceholder: "Select target residential project",
    submitBtn: "Submit Intent & Fast-Track Qualification",
    galleryTitle: "Luxury Estate & Asset Portfolio Showcase",
    gallerySubtitle: "Browse current active residential and commercial properties in our investment pool",
    pricingStarts: "Pricing Starts From:",
    unitLayout: "4 Rooms & Salon | Standard Floor",
    saudiRiyal: "SAR",
    statusPlanning: "Planning Phase",
    statusUnderConstruction: "Under Construction",
    statusCompleted: "Fully Developed",
    statusSoldOut: "Sold Out"
  }
};

export default function CorporateHomeClient({ host, companyName, initialProjects = [] }: CorporateHomeClientProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ success: boolean; message: string } | null>(null);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str.replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]).replace(/%/g, "٪");
  };

  const formatPrice = (price: number): string => {
    const formatted = price.toLocaleString('en-US');
    if (lang === 'EN') return formatted;
    return toArabicNumerals(formatted);
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus(null);
    const formData = new FormData(e.currentTarget);
    const res = await createLeadAction(formData);
    setIsSubmitting(false);
    if (res.success) {
      setFormStatus({ success: true, message: lang === 'AR' ? "تم توثيق اهتمامك بنجاح. ساهر سيقوم بتحليل الطلب فوراً." : "Your intent has been captured." });
      (e.target as HTMLFormElement).reset();
    } else {
      setFormStatus({ success: false, message: res.error || "حدث خطأ." });
    }
  };

  const displayProjects = initialProjects && initialProjects.length > 0
    ? initialProjects.map((p, idx) => ({ ...p, thumbnail: FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length] }))
    : DEFAULT_LUXURY_PROJECTS.map(p => ({
        ...p, name: lang === 'AR' ? p.nameAr : p.nameEn, city: lang === 'AR' ? p.cityAr : p.cityEn, layout: lang === 'AR' ? p.layoutAr : p.layoutEn
      }));

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen transition-colors ${isDark ? "bg-[#0b0f19] text-white" : "bg-[#f9f9fb] text-[#0b0f19]"} ${lang === 'AR' ? 'text-right' : 'text-left'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* الهيدر */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b p-6 flex justify-between items-center ${isDark ? "bg-[#0b0f19]/80 border-white/5" : "bg-[#f9f9fb]/80 border-slate-200"}`}>
        <div className="text-sm font-black tracking-wider text-[#735334]">ORCA CRM</div>
        <div className="flex gap-4">
          <button onClick={toggleLang} className="text-xs font-bold">🌐 {lang === "AR" ? "EN" : "عربي"}</button>
          <a href="#register-interest" className="bg-[#735334] text-white px-4 py-2 rounded-lg text-[10px] font-black">{t.startFree}</a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-black mb-6">{t.landing.heroTitle}</h1>
        <p className="text-sm font-semibold opacity-80 mb-10">{t.heroSub}</p>
        <a href="#register-interest" className="bg-[#735334] text-white px-8 py-4 rounded-xl font-black">{t.heroCTA}</a>
      </section>

      {/* Property Grid */}
      <section id="properties" className="py-20 border-t px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-16">{t.galleryTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayProjects.map((p) => (
            <div key={p.id} className="border rounded-3xl overflow-hidden shadow-sm">
              <img src={p.thumbnail} alt={p.name} className="w-full h-48 object-cover" />
              <div className="p-6">
                <h3 className="font-black text-sm">{p.name}</h3>
                <p className="text-[10px] opacity-70 mt-2">{p.city}</p>
                <div className="mt-4 pt-4 border-t font-black text-[#735334]">
                   {formatPrice(p.minPrice || 0)} {t.saudiRiyal}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t px-6">
        <PricingGrid theme={theme} />
      </section>

      {/* نموذج الاقتناص */}
      <section id="register-interest" className="py-20 border-t px-6 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="investorName" placeholder={t.investorNamePlaceholder} className="w-full p-4 rounded-xl border bg-transparent" required />
          <input type="tel" name="phone" placeholder={t.phonePlaceholder} className="w-full p-4 rounded-xl border bg-transparent" required />
          <button type="submit" className="w-full bg-[#735334] text-white p-4 rounded-xl font-black">{t.submitBtn}</button>
        </form>
      </section>
    </div>
  );
}
