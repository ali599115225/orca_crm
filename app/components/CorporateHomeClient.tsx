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
    netFlows: "التدفقات النقدية: ٤٢,٥٠٠,٠٠٠ ر.س",
    fromPortfolio: "من المحفظة",
    digitalEmployees: "الموظفون الرقميون",
    workflowTitle: "دورة عمل ذكية خالية من التدخل البشري",
    workflowSub: "منصة تعتمد بالكامل على وكلاء ذكاء اصطناعي يقودون المبيعات ويحفظون الأصول بفاعلية متناهية.",
    agentSaher: "الوكيل: ساهر (Saher)",
    saherRole: "وحدة فحص وفرز العملاء (Lead Capture & Qualification)",
    saherBullets: [
      "استقبال وتصنيف العملاء من الحملات بذكاء",
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
    feature1Desc: "نظام تتبع ديناميكي للوحدات المتاحة والمحجوزة والمباعة بتحديثات لحظية تمنع أي تعارض في الحجوزات.",
    feature2Title: "لوحة الوسطاء الموحدة",
    feature2Desc: "منصة موحدة لإدارة جميع الوكالات ومسوقي العقارات، توزيع العمولات تلقائياً وحساب الإنجاز بدقة فائقة.",
    feature3Title: "درع الحماية الكاملة والتشفير السيبراني",
    feature3Desc: "تشفير مصرفي متطور لحماية بيانات المشترين، الصكوك العقارية، وعقود الأقساط المالية دون أي ثغرات.",
    pricingTitle: "الباقات الاستثمارية",
    pricingSub: "بنية تسعير مصممة لتواكب حجم العمليات والمبيعات المستهدفة لمنشأتك العقارية.",
    supportTitle: "📞 دعم النخبة",
    supportDesc: "مدراء حسابات متوفرون على مدار الساعة.",
    whatsappContact: "واتساب التواصل: +٩٦٦ ٥٠ ٥١٢ ٣٤٥٦",
    financialSecurity: "💳 الأمان المالي",
    securityDesc: "بوابة دفع مشفرة بالكامل.",
    allRights: "جميع الحقوق محفوظة لمنصة أوركا © ٢٠٢٦",
    landing: {
      heroTitle: "الجيل الجديد من إدارة العقارات السحابية"
    },
    cloudStatus: "الاتصال السحابي: مشفر وآمن ١٠٠٪",
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
    gallerySubtitle: "استعرض الأصول العقارية المتاحة والمدرجة حالياً في المحفظة الاستثمارية",
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
    soldUnits: "Sold Units: 420",
    availUnits: "Available: 150 Units",
    bookedUnits: "Reserved: 85 Units",
    netFlows: "Cash Flows: 42,500,000 SAR",
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
    pricingTitle: "Investment Subscription Tiers",
    pricingSub: "Customizable subscription plans built to scale with your property transaction volumes.",
    supportTitle: "⚡ Elite Support",
    supportDesc: "Dedicated account executives available 24/7.",
    whatsappContact: "WhatsApp: +966 50 512 3456",
    financialSecurity: "💳 Secure Payments",
    securityDesc: "100% encrypted bank-grade checkout.",
    allRights: "All rights reserved to Orca CRM © 2026",
    landing: {
      heroTitle: "Next-Gen Cloud Real Estate Management"
    },
    cloudStatus: "Cloud Sync: 100% Encrypted & Secure",
    investorTitle: "Direct Investor Capture Node",
    investorSubtitle: "Log your investment intent now to initiate automatic solvency qualification by Agent Saher",
    investorNameLabel: "Two-Word Investor Name *",
    investorNamePlaceholder: "First and Last Name",
    phoneLabel: "Verified Mobile Number *",
    phonePlaceholder: "05xxxxxxxx",
    projectLabel: "Target Investment Asset *",
    projectPlaceholder: "Select target residential project",
    submitBtn: "Submit Intent & Fast-Track Qualification",
    galleryTitle: "Luxury Estate & Asset Portfolio",
    gallerySubtitle: "Browse current active residential and commercial properties in our investment pool",
    pricingStarts: "Starting From:",
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

  // ─── ثيم الصفحة: دائماً الوضع الداكن السيبراني ───────────────────────────
  // الخلفية: أسود فحمي داكن مائل للزرقة الخافتة (#060608)
  // التدرج الحاكم: أبيض ناصع → أخضر نيوني مطفأ (#FFFFFF → #81FF89)

  return (
    <div
      className="min-h-screen antialiased selection:bg-[#81FF89]/20 selection:text-[#81FF89]"
      style={{
        background: "#060608",
        color: "#e2e8f0",
        fontFamily: "'Cairo', 'Inter', sans-serif",
        direction: lang === 'AR' ? 'rtl' : 'ltr',
      }}
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* ─── CSS Variables + Blueprint Grid + Google Fonts ──────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

        :root {
          --bg-primary: #060608;
          --bg-secondary: #0d0f14;
          --bg-card: rgba(13, 15, 20, 0.85);
          --accent-green: #81FF89;
          --accent-green-dim: rgba(129, 255, 137, 0.12);
          --accent-green-border: rgba(129, 255, 137, 0.2);
          --border-steel: rgba(255,255,255,0.07);
          --border-hover: rgba(129, 255, 137, 0.3);
          --text-primary: #f1f5f9;
          --text-muted: #64748b;
          --text-dim: #334155;
        }

        *, *::before, *::after {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          box-sizing: border-box;
        }

        /* ─── Blueprint Grid السيبراني ──────────────────────────────────────── */
        .blueprint-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ─── تدرج العبور السيادي: أبيض → أخضر نيوني ───────────────────── */
        .auth-gradient {
          background: linear-gradient(90deg, #FFFFFF 0%, #81FF89 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ─── Frosted Glass Dark Layer ───────────────────────────────────── */
        .glass-dark {
          background: rgba(13, 15, 20, 0.75) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
        }

        .glass-dark:hover {
          border-color: rgba(129, 255, 137, 0.25) !important;
          box-shadow: 0 0 30px rgba(129, 255, 137, 0.05) !important;
        }

        /* ─── Neon Glow على الأزرار ──────────────────────────────────────── */
        .btn-neon {
          background: linear-gradient(135deg, rgba(129,255,137,0.15) 0%, rgba(129,255,137,0.08) 100%);
          border: 1px solid rgba(129,255,137,0.35);
          color: #81FF89;
          transition: all 0.25s ease;
        }

        .btn-neon:hover {
          background: rgba(129,255,137,0.2);
          border-color: rgba(129,255,137,0.6);
          box-shadow: 0 0 20px rgba(129,255,137,0.2);
          transform: translateY(-1px);
        }

        .btn-solid {
          background: #81FF89;
          color: #060608;
          font-weight: 900;
          transition: all 0.25s ease;
        }

        .btn-solid:hover {
          background: #a5f5aa;
          box-shadow: 0 0 30px rgba(129,255,137,0.35);
          transform: translateY(-1px);
        }

        /* ─── Badge النبض الأخضر ─────────────────────────────────────────── */
        .pulse-green {
          animation: pulseGreen 2s ease-in-out infinite;
        }

        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 0 0 rgba(129, 255, 137, 0.4); }
          50% { box-shadow: 0 0 0 5px rgba(129, 255, 137, 0); }
        }

        /* ─── Fade In ────────────────────────────────────────────────────── */
        .fade-up {
          animation: fadeUp 0.6s ease forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── Card Hover ─────────────────────────────────────────────────── */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-4px);
        }

        /* ─── Scrollbar Dark ─────────────────────────────────────────────── */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0d0f14; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(129,255,137,0.3); }
      `}} />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — الشريط العلوي الزجاجي
      ══════════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(6,6,8,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          {/* شعار ORCA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid rgba(129,255,137,0.25)',
              background: 'rgba(129,255,137,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: '#81FF89', letterSpacing: 1
            }}>
              ORCA
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9', letterSpacing: 1 }}>ORCA CRM</div>
              <div style={{ fontSize: 8, color: '#81FF89', fontWeight: 700 }} dir="ltr">Real Estate Cloud</div>
            </div>
          </div>

          {/* روابط التنقل */}
          <nav style={{ display: 'none', gap: 32, fontSize: 11, fontWeight: 700 }} className="md:flex">
            {[
              { href: '#features', label: t.navFeatures },
              { href: '#workflow', label: t.navWorkflow },
              { href: '#properties', label: t.navProperties },
              { href: '#pricing', label: t.navPricing },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                color: '#64748b', transition: 'color 0.2s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#81FF89')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* أدوات التحكم */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggleLang} style={{
              height: 32, padding: '0 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              🌐 {lang === 'AR' ? 'EN' : 'عربي'}
            </button>

            <button onClick={toggleTheme} style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8', fontSize: 12,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              ☀
            </button>

            <a href="/login" style={{
              height: 32, padding: '0 14px', borderRadius: 8, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', transition: 'all 0.2s',
            }}>
              {lang === 'AR' ? 'تسجيل الدخول' : 'Sign In'}
            </a>

            <a href="#register-interest" className="btn-solid" style={{
              height: 32, padding: '0 16px', borderRadius: 8, textDecoration: 'none',
              fontSize: 10, fontWeight: 900,
              display: 'flex', alignItems: 'center',
            }}>
              {t.startFree}
            </a>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          1. HERO SECTION — البطل الرئيسي
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        {/* Blueprint Grid */}
        <div className="blueprint-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, zIndex: 0 }} />

        {/* Glow Orbs */}
        <div style={{
          position: 'absolute', top: '20%', right: '15%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(129,255,137,0.06) 0%, transparent 70%)',
          borderRadius: '50%', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '10%',
          width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
          borderRadius: '50%', zIndex: 0
        }} />

        <div className="max-w-7xl mx-auto px-6 md:px-10 w-full" style={{ position: 'relative', zIndex: 10, paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}
               className="grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* ─── النص الرئيسي ─────────────────────────────────────────── */}
            <div className="fade-up" style={{ textAlign: lang === 'AR' ? 'right' : 'left', order: lang === 'AR' ? 0 : 0 }}>
              {/* شارة الحالة */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', justifyContent: lang === 'AR' ? 'flex-start' : 'flex-start' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 99,
                  border: '1px solid rgba(129,255,137,0.2)',
                  background: 'rgba(129,255,137,0.08)',
                  color: '#81FF89', fontSize: 10, fontWeight: 700
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#81FF89', display: 'inline-block'
                  }} className="pulse-green" />
                  {t.heroBadge}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#64748b', fontSize: 10, fontWeight: 700
                }}>
                  🔒 {t.cloudStatus}
                </span>
              </div>

              {/* العنوان الرئيسي — التدرج الحاكم */}
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 58px)',
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 24,
                letterSpacing: '-0.5px'
              }}>
                <span className="auth-gradient">{t.landing.heroTitle}</span>
              </h1>

              {/* الوصف */}
              <p style={{
                fontSize: 14, lineHeight: 1.85,
                color: '#64748b', fontWeight: 600,
                maxWidth: 520, marginBottom: 40,
              }}>
                {t.heroSub}
              </p>

              {/* أزرار الـ CTA */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="#register-interest" className="btn-solid" style={{
                  padding: '14px 32px', borderRadius: 12,
                  fontSize: 13, fontWeight: 900, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8
                }}>
                  {t.heroCTA} ←
                </a>
                <a href="#pricing" className="btn-neon" style={{
                  padding: '14px 24px', borderRadius: 12,
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center'
                }}>
                  {t.navPricing}
                </a>
              </div>

              {/* مؤشرات الإحصاء */}
              <div style={{
                display: 'flex', gap: 32, marginTop: 48,
                paddingTop: 32,
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                {[
                  { val: '420+', label: lang === 'AR' ? 'وحدة مباعة' : 'Units Sold' },
                  { val: '98%', label: lang === 'AR' ? 'رضا العملاء' : 'Client Satisfaction' },
                  { val: '24/7', label: lang === 'AR' ? 'وكيل ذكي نشط' : 'AI Agent Active' },
                ].map(stat => (
                  <div key={stat.val}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#81FF89', marginBottom: 4 }}>{stat.val}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── لوحة HUD التفاعلية ────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {/* نبضة خلفية */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at center, rgba(129,255,137,0.05) 0%, transparent 65%)',
                borderRadius: '50%'
              }} />

              <div style={{
                width: '100%', maxWidth: 460,
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(13,15,20,0.9)',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(129,255,137,0.05)',
              }}>
                {/* شريط المحطة */}
                <div style={{
                  height: 44, background: 'rgba(0,0,0,0.4)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 16px', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['#ff5f57','#febc2e','#28c840'].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                    ))}
                  </div>
                  <div style={{
                    fontSize: 9, color: '#22c55e', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5
                  }} dir="ltr">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    {t.serverRiyadh}
                  </div>
                </div>

                {/* المحتوى الداخلي */}
                <div style={{ padding: 24, position: 'relative' }}>
                  <div className="blueprint-grid" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />

                  <div style={{ position: 'relative', zIndex: 10 }}>
                    {/* شارة الدرع */}
                    <div style={{
                      display: 'flex', justifyContent: 'flex-end', marginBottom: 20
                    }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 99,
                        background: 'rgba(129,255,137,0.1)',
                        border: '1px solid rgba(129,255,137,0.25)',
                        color: '#81FF89', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        🛡️ {t.cyberShield}
                      </span>
                    </div>

                    {/* الدائرة الإحصائية */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 24 }}>
                      <div style={{
                        width: 130, height: 130, borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.07)',
                        background: '#0d0f14',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden',
                        boxShadow: '0 0 30px rgba(129,255,137,0.1) inset'
                      }}>
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: '#22c55e',
                          clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 70%)'
                        }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: '#3b82f6',
                          clipPath: 'polygon(50% 50%, 0 70%, 0 0, 30% 0)'
                        }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: '#81FF89',
                          clipPath: 'polygon(50% 50%, 30% 0, 100% 0)',
                          opacity: 0.7
                        }} />
                        <div style={{
                          width: 78, height: 78, background: '#0d0f14',
                          borderRadius: '50%', zIndex: 10,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9' }}>
                            {toArabicNumerals("85")}%
                          </span>
                          <span style={{ fontSize: 7, color: '#475569', fontWeight: 600, textAlign: 'center' }}>
                            {t.fromPortfolio}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { color: '#22c55e', label: t.soldUnits },
                          { color: '#3b82f6', label: t.availUnits },
                          { color: '#81FF89', label: t.bookedUnits },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{
                              width: 9, height: 9, borderRadius: '50%',
                              background: item.color,
                              boxShadow: `0 0 8px ${item.color}60`
                            }} />
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
                              {toArabicNumerals(item.label)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* شريط التدفق النقدي */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: '10px 14px',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ fontSize: 8, color: '#81FF89', fontWeight: 700, marginBottom: 6 }}>
                        {toArabicNumerals(t.netFlows)}
                      </div>
                      <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#81FF89" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
                          </linearGradient>
                        </defs>
                        <path d="M0 35 L30 25 L60 30 L90 10 L120 20 L150 5 L180 15 L200 2"
                          stroke="url(#flowGrad)" strokeWidth="2" fill="none"
                          vectorEffect="non-scaling-stroke" />
                        <path d="M0 35 L30 25 L60 30 L90 10 L120 20 L150 5 L180 15 L200 2 L200 40 L0 40 Z"
                          fill="rgba(129,255,137,0.05)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          2. AI WORKFLOW — الوكلاء الرقميون
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="workflow" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '80px 0'
      }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{
              display: 'inline-block', padding: '5px 16px', borderRadius: 99,
              border: '1px solid rgba(129,255,137,0.2)',
              background: 'rgba(129,255,137,0.07)',
              color: '#81FF89', fontSize: 10, fontWeight: 700,
              marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase'
            }}>
              {t.digitalEmployees}
            </span>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="auth-gradient">{t.workflowTitle}</span>
            </h2>
            <p style={{ fontSize: 13, color: '#475569', fontWeight: 600, maxWidth: 480, margin: '0 auto' }}>
              {t.workflowSub}
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            gap: 24, alignItems: 'center', maxWidth: 860, margin: '0 auto'
          }} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">

            {/* ساهر */}
            <div className="glass-dark card-hover" style={{ borderRadius: 20, padding: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingBottom: 18, marginBottom: 18,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(129,255,137,0.08)',
                  border: '1px solid rgba(129,255,137,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, position: 'relative'
                }}>
                  🤖
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #060608'
                  }} className="pulse-green" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9' }}>{t.agentSaher}</div>
                  <div style={{ fontSize: 9, color: '#81FF89', fontWeight: 700 }}>{t.saherRole}</div>
                </div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.saherBullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#81FF89', marginTop: 5, flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* سهم التوجيه */}
            <div style={{
              fontSize: 22, color: 'rgba(129,255,137,0.4)',
              textAlign: 'center', transform: lang === 'AR' ? 'rotate(180deg)' : 'none'
            }} className="hidden md:block">
              →
            </div>

            {/* سند */}
            <div className="glass-dark card-hover" style={{ borderRadius: 20, padding: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingBottom: 18, marginBottom: 18,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, position: 'relative'
                }}>
                  💳
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #060608'
                  }} className="pulse-green" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9' }}>{t.agentSanad}</div>
                  <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>{t.sanadRole}</div>
                </div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.sanadBullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginTop: 5, flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          3. FEATURE CARDS — بطاقات المميزات
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '80px 0', position: 'relative', overflow: 'hidden'
      }}>
        <div className="blueprint-grid" style={{ position: 'absolute', inset: 0, opacity: 0.15 }} />
        <div className="max-w-7xl mx-auto px-6 md:px-10" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, maxWidth: 900, margin: '0 auto'
          }} className="grid grid-cols-1 md:grid-cols-3">

            {[
              { icon: '📊', title: t.feature1Title, desc: t.feature1Desc, color: '#81FF89' },
              { icon: '🤝', title: t.feature2Title, desc: t.feature2Desc, color: '#818cf8' },
              { icon: '🛡️', title: t.feature3Title, desc: t.feature3Desc, color: '#f59e0b' },
            ].map((feature) => (
              <div key={feature.title} className="glass-dark card-hover" style={{
                borderRadius: 20, padding: 28,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, marginBottom: 18
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: 13, fontWeight: 900, marginBottom: 10,
                  color: feature.color
                }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.8, fontWeight: 600 }}>
                  {feature.desc}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          4. PROPERTIES — معرض الأصول
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="properties" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '80px 0'
      }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{
              display: 'inline-block', padding: '5px 16px', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              color: '#64748b', fontSize: 10, fontWeight: 700,
              marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase'
            }}>
              {lang === 'AR' ? 'محفظة المشاريع والوحدات' : 'Asset & Project Portfolio'}
            </span>
            <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="auth-gradient">{t.galleryTitle}</span>
            </h2>
            <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, maxWidth: 440, margin: '0 auto' }}>
              {t.gallerySubtitle}
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20, maxWidth: 900, margin: '0 auto'
          }} className="grid grid-cols-1 md:grid-cols-3">
            {displayProjects.map((project) => (
              <div key={project.id} className="card-hover" style={{
                borderRadius: 18, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(13,15,20,0.85)',
                backdropFilter: 'blur(12px)',
              }}>
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(8px)',
                    color: '#94a3b8', fontSize: 9, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 99,
                    border: '1px solid rgba(255,255,255,0.07)'
                  }}>
                    📍 {project.city}
                  </span>
                  <span style={{
                    position: 'absolute', bottom: 12, right: 12,
                    background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(8px)',
                    color: '#81FF89', fontSize: 8, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 8,
                    border: '1px solid rgba(129,255,137,0.15)'
                  }}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 900, color: '#f1f5f9', marginBottom: 6 }}>
                    {project.name}
                  </h3>
                  <p style={{ fontSize: 9, color: '#475569', fontWeight: 600, marginBottom: 14 }}>
                    🏡 {project.layout}
                  </p>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{ fontSize: 9, color: '#334155', fontWeight: 600 }}>
                      {t.pricingStarts}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#81FF89' }}>
                      {formatPrice(project.minPrice)} {t.saudiRiyal}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          5. PRICING — الباقات
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '80px 0', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(129,255,137,0.04) 0%, transparent 65%)',
          pointerEvents: 'none'
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-10" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{
              display: 'inline-block', padding: '5px 16px', borderRadius: 99,
              border: '1px solid rgba(129,255,137,0.2)',
              background: 'rgba(129,255,137,0.07)',
              color: '#81FF89', fontSize: 10, fontWeight: 700,
              marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase'
            }}>
              {t.navPricing}
            </span>
            <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="auth-gradient">{t.pricingTitle}</span>
            </h2>
            <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, maxWidth: 440, margin: '0 auto' }}>
              {t.pricingSub}
            </p>
          </div>

          <PricingGrid theme="dark" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          6. INVESTOR FORM — نموذج الاقتناص
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="register-interest" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '80px 0'
      }}>
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <div className="glass-dark" style={{
            borderRadius: 24, padding: '48px 56px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 60px rgba(129,255,137,0.04)'
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300, height: 300,
              background: 'radial-gradient(circle, rgba(129,255,137,0.04) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none'
            }} />

            <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
                <span className="auth-gradient">{t.investorTitle}</span>
              </h2>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, lineHeight: 1.7 }}>
                {t.investorSubtitle}
              </p>
            </div>

            {formStatus && (
              <div style={{
                marginBottom: 24, padding: '14px 20px', borderRadius: 12,
                background: formStatus.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${formStatus.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: formStatus.success ? '#22c55e' : '#ef4444',
                fontSize: 12, fontWeight: 700, textAlign: 'center',
                position: 'relative', zIndex: 10
              }}>
                {formStatus.message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid grid-cols-1 md:grid-cols-2">
                {/* الاسم */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    {t.investorNameLabel}
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder={t.investorNamePlaceholder}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9', fontSize: 12, fontWeight: 600,
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(129,255,137,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>

                {/* الجوال */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    {t.phoneLabel}
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder={t.phonePlaceholder}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9', fontSize: 12, fontWeight: 600,
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(129,255,137,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
              </div>

              {/* المشروع */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  {t.projectLabel}
                </label>
                <select
                  name="projectId"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', fontSize: 12, fontWeight: 600,
                    outline: 'none', appearance: 'none',
                  }}
                >
                  <option value="">{t.projectPlaceholder}</option>
                  {displayProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-solid"
                style={{
                  padding: '14px 24px', borderRadius: 12,
                  fontSize: 13, fontWeight: 900, border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  marginTop: 8,
                }}
              >
                {isSubmitting
                  ? (lang === 'AR' ? 'جارٍ المعالجة...' : 'Processing...')
                  : t.submitBtn
                }
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '40px 0 32px'
      }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 20
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#81FF89', marginBottom: 4 }}>ORCA CRM</div>
            <div style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>{t.allRights}</div>
          </div>

          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { icon: '📞', text: t.supportTitle, sub: t.whatsappContact },
              { icon: '💳', text: t.financialSecurity, sub: t.securityDesc },
            ].map(item => (
              <div key={item.icon} style={{ textAlign: lang === 'AR' ? 'right' : 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>{item.text}</div>
                <div style={{ fontSize: 9, color: '#334155', fontWeight: 600 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9, color: '#22c55e', fontWeight: 700
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', display: 'inline-block'
            }} className="pulse-green" />
            {t.serverRiyadh}
          </div>
        </div>
      </footer>

    </div>
  );
}
