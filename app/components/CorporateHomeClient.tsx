// app/components/CorporateHomeClient.tsx
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
  {
    id: "luxury-project-1",
    nameAr: "مجمع ريزيدنس الفضي",
    nameEn: "Silver Residence Compound",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    minPrice: 1250000,
    status: "UNDER_CONSTRUCTION",
    layoutAr: "شقق عائلية فاخرة | ٤ غرف وصالة | دور متكرر",
    layoutEn: "Luxury Family Apartments | 4 Rooms & Salon | Standard Floor",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60"
  },
  {
    id: "luxury-project-2",
    nameAr: "فلل الياسمين الملكية",
    nameEn: "Royal Jasmine Villas",
    cityAr: "جدة",
    cityEn: "Jeddah",
    minPrice: 3400000,
    status: "COMPLETED",
    layoutAr: "قصور مستقلة | ٦ غرف وصالتين | واجهات حجرية عصرية",
    layoutEn: "Standalone Palaces | 6 Rooms & 2 Salons | Modern Stone Facades",
    thumbnail: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=60"
  },
  {
    id: "luxury-project-3",
    nameAr: "برج النخبة المالي",
    nameEn: "Elite Financial Tower",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    minPrice: 950000,
    status: "PLANNING",
    layoutAr: "مكاتب ذكية وشقق بنتهاوس فاخرة",
    layoutEn: "Smart Offices & Luxury Penthouse Suites",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60"
  }
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
    saherBullets: [
      "استقبل وتصنيف العملاء من الحملات بذكاء",
      "الرد الفوري وقياس مدى جدية الاهتمام تلقائياً",
      "جدولة المواعيد وتوجيه المهام للفريق البشري"
    ],
    agentSanad: "الوكيل: سند (Sanad)",
    sanadRole: "وحدة التحصيل والتحكم المالي (Financial Collection)",
    sanadBullets: [
      "متابعة وتتبع جداول الأقساط المستحقة",
      "إرسال روابط دفع مشفرة وآمنة عبر الواتساب",
      "تحديث السجلات المالية وإيقاف الخدمات للمتأخرين آلياً"
    ],
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
    landing: {
      heroTitle: "الجيل الجديد من إدارة العقارات: أتمتة كاملة مدفوعة بـ Orca CRM للوكلاء ونظام الحماية السيبرانية"
    },
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
    saherBullets: [
      "Intelligently captures and segments campaign leads",
      "Immediate automated response and qualification screening",
      "Schedules onsite visits and routes leads to agents"
    ],
    agentSanad: "Agent: Sanad",
    sanadRole: "Financial Collection Module",
    sanadBullets: [
      "Monitors installment milestones and schedules",
      "Dispatches secure encrypted payment links via WhatsApp",
      "Automatically updates ledgers and suspends overdue accounts"
    ],
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
    landing: {
      heroTitle: "Next-Gen Real Estate: 100% Automations Powered by Orca CRM and Cyber Security Protection"
    },
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

  // إدارة تقديم النموذج المباشر لساهر
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ success: boolean; message: string } | null>(null);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
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
      setFormStatus({
        success: true,
        message: lang === 'AR'
          ? "تم توثيق اهتمامك بنجاح. سيقوم المساعد الرقمي ساهر بتحليل ملاءتك الائتمانية وإسناد الطلب لمدير المبيعات فوراً."
          : "Your investment intent has been captured. Agent Saher is running automatic solvency assessments."
      });
      (e.target as HTMLFormElement).reset();
    } else {
      setFormStatus({
        success: false,
        message: res.error || (lang === 'AR' ? "حدث خطأ أثناء إرسال الطلب، يرجى التحقق." : "An error occurred, please try again.")
      });
    }
  };

  // إعداد بيانات الأصول للعرض (دمج مشاريع المنشأة مع المشاريع الافتراضية)
  const displayProjects = initialProjects && initialProjects.length > 0
    ? initialProjects.map((p, idx) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        minPrice: p.minPrice || 1200000,
        status: p.status,
        layout: lang === 'AR' ? 'شقة استثمارية فاخرة | ٤ غرف وصالة' : 'Luxury Residential Unit | 4 Rooms & Salon',
        thumbnail: FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length]
      }))
    : DEFAULT_LUXURY_PROJECTS.map(p => ({
        id: p.id,
        name: lang === 'AR' ? p.nameAr : p.nameEn,
        city: lang === 'AR' ? p.cityAr : p.cityEn,
        minPrice: p.minPrice,
        status: p.status,
        layout: lang === 'AR' ? p.layoutAr : p.layoutEn,
        thumbnail: p.thumbnail
      }));

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "PLANNING": return t.statusPlanning;
      case "UNDER_CONSTRUCTION": return t.statusUnderConstruction;
      case "COMPLETED": return t.statusCompleted;
      case "SOLD_OUT": return t.statusSoldOut;
      default: return status;
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen antialiased transition-colors duration-500 selection:bg-emerald-500/20 selection:text-emerald-500 calibri-strictly ${
        isDark ? "bg-[#0b0f19] text-white dark-canvas" : "bg-[#f9f9fb] text-[#0b0f19] light-canvas"
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* تعميم خط Calibri وتأثيرات الألوان المخصصة */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Calibri', sans-serif !important;
          letter-spacing: normal !important;
        }
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Calibri', sans-serif !important;
          letter-spacing: normal !important;
        }
        /* خلفية الشبكة الهندسية المخصصة */
        .blueprint-grid {
          background-image: 
            linear-gradient(to right, ${isDark ? "rgba(255,255,255,0.03)" : "rgba(11,15,25,0.03)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDark ? "rgba(255,255,255,0.03)" : "rgba(11,15,25,0.03)"} 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.65) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
      `}} />

      {/* هيدر الموقع الرسمي الزجاجي الفخم */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-500 h-16 flex items-center justify-between px-6 md:px-12 ${
          isDark ? "bg-[#0b0f19]/80 border-white/5" : "bg-[#f9f9fb]/80 border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-reverse space-x-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[10px] font-black transition-all select-none cursor-pointer shadow-lg ${
            isDark 
              ? "bg-white/5 border-white/10 text-slate-400 hover:border-[#735334]/50 hover:text-[#E6C687] shadow-[#735334]/5" 
              : "bg-slate-100 border-slate-300 text-slate-600 hover:border-[#735334] hover:text-[#735334] shadow-slate-200"
          }`}>
            ORCA
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-black tracking-wider ${isDark ? "text-white" : "text-[#735334] font-bold"}`}>
              ORCA CRM
            </span>
            <span className="text-[8px] text-[#735334] font-bold" dir="ltr">Luxury Edition</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-8 text-xs font-bold transition-colors">
          <a href="#features" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>
            {t.navFeatures}
          </a>
          <a href="#workflow" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>
            {t.navWorkflow}
          </a>
          <a href="#properties" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>
            {t.navProperties}
          </a>
          <a href="#pricing" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>
            {t.navPricing}
          </a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          {/* تبديل اللغة */}
          <button 
            onClick={toggleLang}
            className={`h-8 px-2.5 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
              isDark 
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#735334]/50 hover:text-[#E6C687]" 
                : "bg-white border-slate-300 text-slate-700 hover:border-[#735334] hover:text-[#735334] shadow-sm"
            }`}
          >
            🌐 {lang === "AR" ? "EN" : "عربي"}
          </button>
          
          {/* تبديل السمة */}
          <button 
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${
              isDark 
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#735334]/50 hover:text-[#E6C687]" 
                : "bg-white border-slate-300 text-slate-700 hover:border-[#735334] hover:text-[#735334] shadow-sm"
            }`}
            title="تبديل الوضع الليلي / النهاري"
          >
            {isDark ? "☀" : "☾"}
          </button>

          <a 
            href="/operations" 
            className={`px-3 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all border ${
              isDark 
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#735334]/50 hover:text-[#E6C687]" 
                : "bg-white border-[#735334]/20 text-[#735334] hover:border-[#735334]"
            }`}
          >
            {lang === "AR" ? "بوابة الإدارة الفوقية" : "Admin Gateway"}
          </a>

          <a 
            href="#register-interest" 
            className="bg-[#735334] hover:bg-[#5f4229] text-white px-4 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all shadow-[0_0_15px_rgba(115,83,52,0.2)]"
          >
            {t.startFree}
          </a>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto z-10 min-h-[85vh] flex items-center">
        <div className="absolute inset-0 blueprint-grid opacity-50 -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#735334]/5 blur-[120px] rounded-full -z-10" />
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* الجانب الأيمن */}
          <div className="space-y-8 text-right relative z-20">
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`inline-block text-[10px] font-extrabold px-4 py-1.5 rounded-full border tracking-wider transition-all duration-300 ${
                  isDark 
                    ? "bg-[#735334]/15 text-[#E6C687] border-[#735334]/35 shadow-[0_0_15px_rgba(115,83,52,0.15)]" 
                    : "bg-[#735334]/10 text-[#735334] border-[#735334]/20 shadow-none"
                }`}>
                  {t.heroBadge}
                </span>

                {/* شارة الاتصال السحابي التفاعلية المطلوبة */}
                <span className={`inline-block text-[10px] font-extrabold px-4 py-1.5 rounded-full border tracking-wider transition-all duration-300 cursor-help hover:scale-105 ${
                  isDark
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-none"
                }`}>
                  🟢 {t.cloudStatus}
                </span>
              </div>

              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black leading-tight hero-headline ${
                isDark ? "text-white" : "text-[#735334]"
              }`}>
                {t.landing.heroTitle}
              </h1>
            </div>
            
            <p className={`text-sm md:text-base leading-relaxed max-w-xl font-semibold ${
              isDark ? "text-slate-400" : "text-slate-700"
            }`}>
              {t.heroSub}
            </p>

            <div className="pt-4">
              <a 
                href="#register-interest" 
                className="inline-block bg-[#735334] hover:bg-[#5f4229] text-white text-sm md:text-base font-black px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(115,83,52,0.3)]"
              >
                {t.heroCTA}
              </a>
            </div>
          </div>

          {/* الجانب الأيسر */}
          <div className="relative z-10 flex justify-center lg:justify-end perspective-[1000px]">
            <div className="relative w-full max-w-[500px] aspect-[4/3] bg-slate-900 rounded-[2rem] border-[8px] border-slate-800 shadow-2xl transform lg:-rotate-y-12 lg:rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out flex flex-col overflow-hidden ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              <div className="h-6 bg-slate-950/80 border-b border-white/5 flex items-center px-4 justify-between shrink-0">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-rose-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="text-[8px] text-emerald-400 font-bold tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t.serverRiyadh}
                </div>
              </div>
              
              <div className="flex-1 bg-[#0b0f19] p-6 relative overflow-hidden flex flex-col gap-6">
                <div className="absolute inset-0 blueprint-grid opacity-20" />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="w-24 h-4 bg-white/10 rounded-full"></div>
                  <div className="flex items-center gap-1 bg-[#735334]/20 border border-[#735334]/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(115,83,52,0.2)]">
                    <span className="text-[8px] text-[#E6C687]">🛡️</span>
                    <span className="text-[8px] text-[#E6C687] font-bold">{t.cyberShield}</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative z-10 gap-8">
                  <div className="relative w-40 h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    <div className="absolute inset-0 bg-[#10b981]" style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 70%)" }}></div>
                    <div className="absolute inset-0 bg-[#3b82f6]" style={{ clipPath: "polygon(50% 50%, 0 70%, 0 0, 30% 0)" }}></div>
                    <div className="absolute inset-0 bg-[#735334]" style={{ clipPath: "polygon(50% 50%, 30% 0, 100% 0)" }}></div>
                    <div className="w-24 h-24 bg-[#0b0f19] rounded-full z-10 border border-white/5 flex items-center justify-center flex-col shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                      <span className="text-xl font-black text-white">{toArabicNumerals("85")}%</span>
                      <span className="text-[8px] text-slate-400 font-bold">{t.fromPortfolio}</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-right text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">{toArabicNumerals(t.soldUnits)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">{toArabicNumerals(t.availUnits)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#735334] shadow-[0_0_10px_rgba(115,83,52,0.4)]"></div>
                      <span className="text-[10px] text-slate-300 font-bold">{toArabicNumerals(t.bookedUnits)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-12 w-full bg-white/5 rounded-lg border border-white/5 relative z-10 overflow-hidden flex items-end">
                  <div className="absolute top-1 left-2 text-[8px] text-[#E6C687] font-bold z-20">
                    {toArabicNumerals(t.netFlows)}
                  </div>
                  <div className="w-full h-8 bg-gradient-to-t from-[#735334]/10 to-transparent relative">
                    <svg className="absolute bottom-0 w-full h-full text-[#735334]" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none">
                      <path d="M0 100 L20 60 L40 80 L60 30 L80 50 L100 10" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#735334]/5 blur-[80px] -z-10 rounded-full"></div>
          </div>

        </div>
      </section>

      {/* 2. AI WORKFLOW INFOGRAPHIC */}
      <section id="workflow" className={`py-20 border-t transition-colors duration-500 px-6 md:px-12 max-w-7xl mx-auto`}>
        <div className="text-center space-y-3 mb-16">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider transition-all duration-300 ${
            isDark ? "bg-[#735334]/15 text-[#E6C687] border-[#735334]/30" : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
          }`}>
            {t.digitalEmployees}
          </span>
          <h2 className={`text-2xl md:text-3xl font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
            {t.workflowTitle}
          </h2>
          <p className={`text-xs max-w-lg mx-auto font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
            {t.workflowSub}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 max-w-4xl mx-auto relative">
          
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -z-10">
            <div className="h-full bg-gradient-to-r from-transparent via-[#735334] to-transparent w-full opacity-40 animate-pulse"></div>
          </div>

          <div className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white/5 -z-10">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-[#735334] to-transparent opacity-40 animate-pulse"></div>
          </div>

          {/* ساهر */}
          <div className={`border p-6 rounded-2xl w-full md:w-1/2 z-10 relative overflow-hidden group transition-all duration-300 ${
            isDark 
              ? "bg-white/5 border-[#735334]/30 frosted-glass-dark hover:border-[#735334]/60" 
              : "bg-white/70 backdrop-blur-md border-slate-200 milky-glass-light hover:border-[#735334]/50 shadow-sm"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#735334]/5 blur-[40px] rounded-full group-hover:bg-[#735334]/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#735334]/10 border border-[#735334]/30 flex items-center justify-center relative">
                <span className="text-xl">🤖</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-pulse"></span>
              </div>
              <div>
                <h3 className={`text-sm font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
                  {t.agentSaher}
                </h3>
                <p className="text-[9px] text-[#735334] font-bold">{t.saherRole}</p>
              </div>
            </div>
            <ul className={`space-y-3 text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.saherBullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#735334] rounded-full"></div>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shrink-0 z-10 rotate-90 md:rotate-180 text-[#735334] opacity-80 font-bold">
            ➔
          </div>

          {/* سند */}
          <div className={`border p-6 rounded-2xl w-full md:w-1/2 z-10 relative overflow-hidden group transition-all duration-300 ${
            isDark 
              ? "bg-white/5 border-[#735334]/30 frosted-glass-dark hover:border-[#735334]/60" 
              : "bg-white/70 backdrop-blur-md border-slate-200 milky-glass-light hover:border-[#735334]/50 shadow-sm"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#735334]/5 blur-[40px] rounded-full group-hover:bg-[#735334]/10 transition-all"></div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                <span className="text-xl">💳</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0f19] animate-pulse"></span>
              </div>
              <div>
                <h3 className={`text-sm font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
                  {t.agentSanad}
                </h3>
                <p className="text-[9px] text-emerald-400 font-bold">{t.sanadRole}</p>
              </div>
            </div>
            <ul className={`space-y-3 text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.sanadBullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* 3. FEATURE CARDS */}
      <section id="features" className="py-20 border-t px-6 md:px-12 max-w-7xl mx-auto relative overflow-hidden">
        <div className="absolute inset-0 blueprint-grid opacity-10 -z-10" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10">
          
          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            isDark ? "frosted-glass-dark hover:border-[#735334]/60" : "milky-glass-light hover:border-[#735334]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#735334] transition-colors ${
              isDark ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              📊
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              isDark ? "text-white group-hover:text-[#E6C687]" : "text-[#735334] group-hover:opacity-80"
            }`}>
              {t.feature1Title}
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.feature1Desc}
            </p>
          </div>

          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            isDark ? "frosted-glass-dark hover:border-[#735334]/60" : "milky-glass-light hover:border-[#735334]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#735334] transition-colors ${
              isDark ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              🤝
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              isDark ? "text-white group-hover:text-[#E6C687]" : "text-[#735334] group-hover:opacity-80"
            }`}>
              {t.feature2Title}
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.feature2Desc}
            </p>
          </div>

          <div className={`border p-8 rounded-3xl space-y-4 transition-all duration-300 hover:scale-[1.02] group ${
            isDark ? "frosted-glass-dark hover:border-[#735334]/60" : "milky-glass-light hover:border-[#735334]/50"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[#735334] transition-colors ${
              isDark ? "bg-[#0b0f19] border border-white/10" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              🛡️
            </div>
            <h3 className={`font-extrabold text-sm transition-colors ${
              isDark ? "text-white group-hover:text-[#E6C687]" : "text-[#735334] group-hover:opacity-80"
            }`}>
              {t.feature3Title}
            </h3>
            <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.feature3Desc}
            </p>
          </div>

        </div>
      </section>

      {/* معرض الأصول الفاخرة (Property Grid View Showcase) */}
      <section id="properties" className="py-20 border-t px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider transition-all duration-300 ${
            isDark ? "bg-[#735334]/15 text-[#E6C687] border-[#735334]/30" : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
          }`}>
            {lang === 'AR' ? 'محفظة المشاريع والوحدات' : 'Asset & Project Portfolio'}
          </span>
          <h2 className={`text-2xl md:text-3xl font-black pt-2 ${isDark ? "text-white" : "text-[#735334]"}`}>
            {t.galleryTitle}
          </h2>
          <p className={`text-xs max-w-lg mx-auto font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
            {t.gallerySubtitle}
          </p>
        </div>

        {/* شبكة الأصول والممتلكات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayProjects.map((project) => (
            <div 
              key={project.id}
              className={`border rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 shadow-lg group ${
                isDark ? "frosted-glass-dark border-[#735334]/30" : "milky-glass-light border-slate-200"
              }`}
            >
              {/* صورة الأصل مع تأثير زووم عند الحوم */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img 
                  src={project.thumbnail} 
                  alt={project.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* شارة المدينة الفاخرة */}
                <span className="absolute top-4 right-4 bg-[#735334] text-white text-[9px] font-bold px-3 py-1 rounded-full border border-[#E6C687]/30 shadow-md">
                  📍 {project.city}
                </span>
                
                {/* شارة حالة المشروع */}
                <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-[#E6C687] text-[8px] font-extrabold px-2.5 py-1 rounded-md border border-white/10">
                  {getStatusLabel(project.status)}
                </span>
              </div>

              {/* تفاصيل العقار */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className={`font-black text-sm transition-colors ${isDark ? "text-white" : "text-[#735334]"}`}>
                    {project.name}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    🏡 {project.layout}
                  </p>
                </div>

                <div className={`pt-4 border-t flex justify-between items-center ${isDark ? "border-white/5" : "border-slate-200"}`}>
                  <span className="text-[9px] text-slate-500 font-bold">
                    {t.pricingStarts}
                  </span>
                  <span className={`text-xs font-black ${isDark ? "text-[#E6C687]" : "text-[#735334]"}`}>
                    {formatPrice(project.minPrice)} {t.saudiRiyal}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRICING GRID */}
      <section id="pricing" className="py-20 border-t px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-16">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider transition-all duration-300 ${
            isDark ? "bg-[#735334]/15 text-[#E6C687] border-[#735334]/30" : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
          }`}>
            {t.navPricing}
          </span>
          <h2 className={`text-2xl md:text-3xl font-black pt-2 ${isDark ? "text-white" : "text-[#735334]"}`}>
            {t.pricingTitle}
          </h2>
          <p className={`text-xs max-w-lg mx-auto font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
            {t.pricingSub}
          </p>
        </div>

        <PricingGrid theme={theme} />
      </section>

      {/* نموذج الاقتناص الاستثماري المباشر (High-Conversion Investor Capture Node) */}
      <section id="register-interest" className="py-20 border-t px-6 md:px-12 max-w-4xl mx-auto">
        <div className={`border rounded-3xl p-8 md:p-12 space-y-8 relative overflow-hidden shadow-2xl ${
          isDark ? "frosted-glass-dark border-[#735334]/30" : "milky-glass-light border-slate-200"
        }`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#735334]/5 blur-[90px] rounded-full -z-10" />
          
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className={`text-xl md:text-2xl font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
              {t.investorTitle}
            </h2>
            <p className={`text-[10px] leading-relaxed font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t.investorSubtitle}
            </p>
          </div>

          {formStatus && (
            <div className={`p-4 rounded-xl text-xs font-bold text-center border ${
              formStatus.success 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}>
              {formStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto font-semibold text-right">
            <input type="hidden" name="clientHost" value={host} />
            <input type="hidden" name="city" value="الرياض" />
            <input type="hidden" name="source" value="الموقع الإلكتروني الرسمي" />
            
            {/* الاسم الثنائي للمستثمر */}
            <div>
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {t.investorNameLabel}
              </label>
              <input 
                type="text" 
                name="investorName" 
                required 
                placeholder={t.investorNamePlaceholder} 
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#735334]/50 focus:border-[#735334]/50 transition-colors ${
                  isDark ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                }`} 
              />
            </div>

            {/* رقم الجوال الموثق */}
            <div>
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {t.phoneLabel}
              </label>
              <input 
                type="tel" 
                name="phone" 
                required 
                placeholder={t.phonePlaceholder} 
                className={`w-full border rounded-xl p-3 text-xs text-left focus:outline-none focus:ring-1 focus:ring-[#735334]/50 focus:border-[#735334]/50 transition-colors ${
                  isDark ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"
                }`} 
              />
            </div>

            {/* المشروع العقاري المستهدف */}
            <div>
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {t.projectLabel}
              </label>
              <select 
                name="projectId" 
                required 
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#735334]/50 focus:border-[#735334]/50 transition-colors ${
                  isDark ? "bg-[#0b0f19] border-white/10 text-slate-300" : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                <option value="">{t.projectPlaceholder}</option>
                {displayProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#735334] hover:bg-[#5f4229] disabled:bg-slate-700 text-white text-sm font-black p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(115,83,52,0.2)] cursor-pointer mt-2"
            >
              {isSubmitting 
                ? (lang === 'AR' ? "جاري التوثيق..." : "Qualifying...") 
                : `${t.submitBtn} ➔`
              }
            </button>
          </form>
        </div>
      </section>

      {/* الفوتر الجمالي */}
      <footer className={`border-t py-12 px-6 md:px-12 text-right text-xs transition-colors duration-500 ${
        isDark ? "bg-[#0b0f19] border-white/5 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <h4 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-[#735334]"}`}>
              {t.supportTitle}
            </h4>
            <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t.supportDesc}
            </p>
            <p className="text-[#735334] font-extrabold text-xs">
              {toArabicNumerals(t.whatsappContact)}
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-[#735334]"}`}>
              {t.financialSecurity}
            </h4>
            <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t.securityDesc}
            </p>
            <div className="flex items-center gap-3 font-extrabold text-[10px]">
              <span className={`px-2 py-1 border rounded ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>مدى</span>
              <span className={`px-2 py-1 border rounded ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>Visa</span>
              <span className={`px-2 py-1 border rounded ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-[#0b0f19]"}`}>Mastercard</span>
            </div>
          </div>
          
          <div className="space-y-3 text-right md:text-left">
            <div className="flex items-center md:justify-end gap-2">
              <span className={`text-sm font-black ${isDark ? "text-white" : "text-[#735334]"}`}>ORCA CRM</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">
              {toArabicNumerals(t.allRights)}
            </p>
            <div className="pt-2">
              <a 
                href="/admin" 
                className={`text-[9px] font-bold transition-opacity hover:opacity-80 ${isDark ? "text-slate-600" : "text-[#735334]/70"}`}
              >
                {lang === "AR" ? "🔒 بوابة التحكم الإشرافي" : "🔒 Administrative Access Portal"}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
