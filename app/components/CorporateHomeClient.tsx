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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ success: boolean; message: string } | null>(null);

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
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          letter-spacing: normal !important;
        }
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          letter-spacing: normal !important;
        }
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
          border: 1px solid rgba(115, 83, 52, 0.35) !important;
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

      <header
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-500 h-16 flex items-center justify-between px-6 md:px-12 ${
          isDark ? "bg-[#0b0f19]/80 border-white/5" : "bg-[#f9f9fb]/80 border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-reverse space-x-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[10px] font-black transition-all select-none cursor-pointer shadow-lg ${
            isDark 
              ? "bg-white/5 border-white/10 text-slate-400 hover:border-[#735334]/50 hover:text-[#E6C687]" 
              : "bg-slate-100 border-slate-300 text-slate-600 hover:border-[#735334] hover:text-[#735334]"
          }`}>
            ORCA
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-black tracking-wider ${isDark ? "text-white" : "text-[#735334]"}`}>
              ORCA CRM
            </span>
            <span className="text-[8px] text-[#735334] font-bold" dir="ltr">Luxury Edition</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-reverse space-x-8 text-xs font-bold transition-colors">
          <a href="#features" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>{t.navFeatures}</a>
          <a href="#workflow" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>{t.navWorkflow}</a>
          <a href="#properties" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>{t.navProperties}</a>
          <a href="#pricing" className={`transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-[#735334] hover:opacity-80"}`}>{t.navPricing}</a>
        </nav>

        <div className="flex items-center space-x-reverse space-x-3">
          <button onClick={toggleLang} className={`h-8 px-2.5 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all ${isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-300 text-slate-700"}`}>
            🌐 {lang === "AR" ? "EN" : "عربي"}
          </button>
          <button onClick={toggleTheme} className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all ${isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-300 text-slate-700"}`}>
            {isDark ? "☀" : "☾"}
          </button>
          <a href="/operations" className={`px-3 py-2 rounded-lg text-[10px] font-black tracking-wide border ${isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-[#735334]/20 text-[#735334]"}`}>
            {lang === "AR" ? "بوابة الإدارة الفوقية" : "Admin Gateway"}
          </a>
          <a href="#register-interest" className="bg-[#735334] hover:bg-[#5f4229] text-white px-4 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all shadow-[0_0_15px_rgba(115,83,52,0.2)]">
            {t.startFree}
          </a>
        </div>
      </header>

      {/* Hero Section Simplified */}
      <section className="relative overflow-hidden py-16 px-6 max-w-7xl mx-auto flex items-center min-h-[70vh]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-right">
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black leading-tight ${isDark ? "text-white" : "text-[#735334]"}`}>
              {t.landing.heroTitle}
            </h1>
            <p className={`text-sm md:text-base leading-relaxed max-w-xl font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              {t.heroSub}
            </p>
            <a href="#register-interest" className="inline-block bg-[#735334] text-white text-sm font-black px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(115,83,52,0.3)]">
              {t.heroCTA}
            </a>
          </div>
          {/* Visual Placeholder for Hero Content */}
        </div>
      </section>

      {/* Property Showcase & Workflow Placeholder */}
      <section id="properties" className="py-20 border-t px-6 max-w-7xl mx-auto">
        {/* المشاريع ستظهر هنا تلقائياً بناءً على InitialProjects */}
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t px-6 max-w-7xl mx-auto">
        <PricingGrid theme={theme} />
      </section>

      {/* Investor Capture Form */}
      <section id="register-interest" className="py-20 border-t px-6 max-w-4xl mx-auto">
        {/* نموذج تسجيل الاهتمام */}
      </section>

    </div>
  );
}
