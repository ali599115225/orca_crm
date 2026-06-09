// app/components/CorporateHomeClient.tsx
"use client";

import React, { useState } from "react";
import PricingGrid from "./PricingGrid";
import { createLeadAction } from "@/app/actions/leads";
import { useApp } from "@/app/context/AppContext";

interface Project {
  id: string; name: string; city: string; status: string;
  unitsTotal: number; unitsSold: number; unitsBooked: number;
  minPrice: number | null; maxPrice: number | null;
}
interface CorporateHomeClientProps {
  host: string; companyName: string; initialProjects?: Project[];
}

const DEFAULT_PROJECTS = [
  { id: "p1", nameAr: "مجمع ريزيدنس الفضي",   nameEn: "Silver Residence Compound", cityAr: "الرياض", cityEn: "Riyadh",  minPrice: 1250000, status: "UNDER_CONSTRUCTION", layoutAr: "شقق فاخرة | ٤ غرف وصالة",       layoutEn: "Luxury Apts | 4 Rooms & Salon", thumb: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60" },
  { id: "p2", nameAr: "فلل الياسمين الملكية", nameEn: "Royal Jasmine Villas",       cityAr: "جدة",    cityEn: "Jeddah",  minPrice: 3400000, status: "COMPLETED",          layoutAr: "قصور مستقلة | ٦ غرف وصالتين", layoutEn: "Palaces | 6 Rooms & 2 Salons",  thumb: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=60" },
  { id: "p3", nameAr: "برج النخبة المالي",     nameEn: "Elite Financial Tower",      cityAr: "الرياض", cityEn: "Riyadh",  minPrice: 950000,  status: "PLANNING",          layoutAr: "مكاتب ذكية وبنتهاوس فاخرة",   layoutEn: "Smart Offices & Penthouse",     thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60" },
];
const THUMBS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=60",
];

const T = {
  AR: {
    navFeatures:"بنية النظام الذكي", navWorkflow:"الوكلاء الرقميون", navProperties:"الأصول الفاخرة", navPricing:"الباقات الاستثمارية",
    startFree:"ابدأ مجاناً", heroBadge:"المنصة الرائدة للمطورين العقاريين في الخليج",
    heroSub:"المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة، مدعومة بدرع سيبراني منيع يشفر عقودك ويحمي أصولك وبياناتك المالية تلقائياً.",
    heroCTA:"ابدأ إدارة محفظتك الاستثمارية مجاناً", heroTitle:"الجيل الجديد من إدارة العقارات السحابية",
    serverRiyadh:"خادم الرياض: آمن ١٠٠٪", cyberShield:"الدرع السيبراني: نشط",
    cloudStatus:"الاتصال السحابي: مشفر وآمن ١٠٠٪",
    soldUnits:"الوحدات المباعة", availUnits:"الوحدات المتاحة", bookedUnits:"المحجوزة",
    netFlows:"التدفقات النقدية: ٤٢,٥٠٠,٠٠٠ ر.س", fromPortfolio:"من المحفظة",
    digitalEmployees:"الموظفون الرقميون",
    workflowTitle:"دورة عمل ذكية خالية من التدخل البشري",
    workflowSub:"منصة تعتمد بالكامل على وكلاء ذكاء اصطناعي يقودون المبيعات ويحفظون الأصول بفاعلية متناهية.",
    agentSaher:"الوكيل: ساهر", saherRole:"وحدة فحص وفرز العملاء",
    saherBullets:["استقبال وتصنيف العملاء من الحملات بذكاء","الرد الفوري وقياس مدى جدية الاهتمام تلقائياً","جدولة المواعيد وتوجيه المهام للفريق البشري"],
    agentSanad:"الوكيل: سند", sanadRole:"وحدة التحصيل والتحكم المالي",
    sanadBullets:["متابعة وتتبع جداول الأقساط المستحقة","إرسال روابط دفع مشفرة وآمنة عبر الواتساب","تحديث السجلات المالية وإيقاف الخدمات للمتأخرين آلياً"],
    f1t:"إدارة المخزون الحركي", f1d:"نظام تتبع ديناميكي للوحدات المتاحة والمحجوزة والمباعة بتحديثات لحظية تمنع تعارض الحجوزات.",
    f2t:"لوحة الوسطاء الموحدة", f2d:"منصة موحدة لإدارة الوكالات ومسوقي العقارات وتوزيع العمولات تلقائياً.",
    f3t:"درع الحماية السيبرانية", f3d:"تشفير مصرفي متطور لحماية بيانات المشترين والصكوك العقارية وعقود الأقساط.",
    pricingTitle:"الباقات الاستثمارية", pricingSub:"بنية تسعير مصممة لتواكب حجم العمليات لمنشأتك العقارية.",
    supportTitle:"📞 دعم النخبة", supportDesc:"مدراء حسابات على مدار الساعة.",
    whatsapp:"+٩٦٦ ٥٠ ٥١٢ ٣٤٥٦", security:"💳 أمان المدفوعات", secDesc:"بوابة دفع مشفرة بالكامل.",
    allRights:"جميع الحقوق محفوظة لمنصة أوركا © ٢٠٢٦",
    investorTitle:"نموذج الاقتناص الاستثماري المباشر",
    investorSub:"وثّق اهتمامك الاستثماري فوريّاً ليتم تأهيل وفحص الملاءة المالية تلقائياً بواسطة ساهر",
    nameLabel:"الاسم الثنائي *", namePH:"الاسم الأول والاسم الأخير",
    phoneLabel:"رقم الجوال *", phonePH:"٠٥xxxxxxxx",
    projLabel:"المشروع المستهدف *", projPH:"اختر المشروع",
    submitBtn:"توثيق الاهتمام وتأهيل الطلب فوريّاً",
    galleryTitle:"معرض الأصول العقارية الفاخرة", gallerySub:"استعرض الأصول المتاحة في المحفظة الاستثمارية",
    pricingStarts:"تبدأ الأسعار من:", sar:"ر.س",
    sPlanning:"قيد التخطيط", sConstruction:"تحت الإنشاء", sCompleted:"مكتمل", sSoldOut:"مباع",
    login:"تسجيل الدخول",
  },
  EN: {
    navFeatures:"Smart Architecture", navWorkflow:"Digital Agents", navProperties:"Luxury Assets", navPricing:"Investment Tiers",
    startFree:"Start Free", heroBadge:"The Leading Platform for Gulf Real Estate Developers",
    heroSub:"An innovative cloud platform running 24/7 autonomous digital staff to manage sales and collection, backed by a robust cyber-defense shield protecting your contracts and financial assets.",
    heroCTA:"Start Managing Your Portfolio Free", heroTitle:"Next-Gen Cloud Real Estate Management",
    serverRiyadh:"Riyadh Server: 100% Secure", cyberShield:"Cyber Shield: Active",
    cloudStatus:"Cloud Sync: 100% Encrypted & Secure",
    soldUnits:"Units Sold", availUnits:"Available", bookedUnits:"Reserved",
    netFlows:"Cash Flows: 42,500,000 SAR", fromPortfolio:"of Portfolio",
    digitalEmployees:"Digital Staff",
    workflowTitle:"Autonomous Touchless Workflows",
    workflowSub:"A platform driven entirely by AI agents that accelerate sales and secure financial collection.",
    agentSaher:"Agent: Saher", saherRole:"Lead Qualification Module",
    saherBullets:["Intelligently captures and segments campaign leads","Immediate automated response & qualification","Schedules visits and routes leads to agents"],
    agentSanad:"Agent: Sanad", sanadRole:"Financial Collection Module",
    sanadBullets:["Monitors installment milestones and schedules","Dispatches secure encrypted payment links via WhatsApp","Automatically updates ledgers and suspends overdue accounts"],
    f1t:"Kinetic Inventory Management", f1d:"A dynamic real-time tracking engine for available, reserved, and sold units preventing double bookings.",
    f2t:"Unified Broker Portal", f2d:"A centralized platform to coordinate broker channels, automate commission payouts, and trace agency KPIs.",
    f3t:"Cyber Shield Protection", f3d:"Bank-grade encryption wrapping buyer accounts, title deeds, and installment transactions securely.",
    pricingTitle:"Investment Subscription Tiers", pricingSub:"Customizable plans built to scale with your property transaction volumes.",
    supportTitle:"⚡ Elite Support", supportDesc:"Account executives available 24/7.",
    whatsapp:"+966 50 512 3456", security:"💳 Secure Payments", secDesc:"100% encrypted checkout.",
    allRights:"All rights reserved to Orca CRM © 2026",
    investorTitle:"Direct Investor Capture Node",
    investorSub:"Log your investment intent now to initiate automatic solvency qualification by Agent Saher",
    nameLabel:"Full Name *", namePH:"First and Last Name",
    phoneLabel:"Mobile Number *", phonePH:"05xxxxxxxx",
    projLabel:"Target Project *", projPH:"Select project",
    submitBtn:"Submit Intent & Fast-Track Qualification",
    galleryTitle:"Luxury Estate & Asset Portfolio", gallerySub:"Browse current active properties in our investment pool",
    pricingStarts:"Starting From:", sar:"SAR",
    sPlanning:"Planning", sConstruction:"Under Construction", sCompleted:"Completed", sSoldOut:"Sold Out",
    login:"Sign In",
  }
};

export default function CorporateHomeClient({ host, companyName, initialProjects = [] }: CorporateHomeClientProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const t = T[lang] || T.AR;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ ok: boolean; msg: string } | null>(null);


  // ─── Helpers ───────────────────────────────────────────────────────────────
  const toAr = (n: string | number | null | undefined): string => {
    if (n === null || n === undefined) return '';
    const s = n.toString();
    if (lang === 'EN') return s;
    return s.replace(/[0-9]/g, w => '٠١٢٣٤٥٦٧٨٩'[+w]).replace(/%/g, '٪');
  };
  const fmtPrice = (p: number) => lang === 'EN' ? p.toLocaleString('en-US') : toAr(p.toLocaleString('en-US'));
  const statusLabel = (s: string) => ({ PLANNING: t.sPlanning, UNDER_CONSTRUCTION: t.sConstruction, COMPLETED: t.sCompleted, SOLD_OUT: t.sSoldOut }[s] ?? s);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsSubmitting(true); setFormStatus(null);
    const fd = new FormData(e.currentTarget);
    const res = await createLeadAction(fd);
    setIsSubmitting(false);
    if (res.success) {
      setFormStatus({ ok: true, msg: lang === 'AR' ? "تم توثيق اهتمامك بنجاح. سيقوم ساهر بتحليل ملاءتك الائتمانية فوراً." : "Intent captured. Agent Saher is running automatic solvency assessment." });
      (e.target as HTMLFormElement).reset();
    } else {
      setFormStatus({ ok: false, msg: res.error || (lang === 'AR' ? "حدث خطأ، يرجى التحقق." : "An error occurred, please try again.") });
    }
  };

  const projects = initialProjects.length > 0
    ? initialProjects.map((p, i) => ({ id: p.id, name: p.name, city: p.city, price: p.minPrice || 1200000, status: p.status, layout: lang === 'AR' ? 'شقة استثمارية فاخرة | ٤ غرف' : '4-Room Luxury Unit', thumb: THUMBS[i % THUMBS.length] }))
    : DEFAULT_PROJECTS.map(p => ({ id: p.id, name: lang === 'AR' ? p.nameAr : p.nameEn, city: lang === 'AR' ? p.cityAr : p.cityEn, price: p.minPrice, status: p.status, layout: lang === 'AR' ? p.layoutAr : p.layoutEn, thumb: p.thumb }));

  // ─── Design tokens ─────────────────────────────────────────────────────────
  // Palette: Cold Misty (sky blues) + Deep Sea (navy) + Emerald (status)
  // All colors defined via --ch-* CSS variables in .corporate-home scope

  const CSS = `
    /* ═══ Cold Misty / Deep Sea palette ══════════════════════════════════ */
    .corporate-home {
      --ch-bg: #0b1120;
      --ch-surface: #0f172a;
      --ch-surface-strong: rgba(15, 23, 42, 0.92);
      --ch-surface-card: rgba(15, 23, 42, 0.78);
      --ch-foreground: #f1f5f9;
      --ch-foreground-muted: #64748b;
      --ch-text-dim: #475569;
      --ch-accent: #0ea5e9;
      --ch-accent-strong: #0284c7;
      --ch-accent-muted: #38bdf8;
      --ch-accent-soft: rgba(14, 165, 233, 0.08);
      --ch-accent-soft-hover: rgba(14, 165, 233, 0.18);
      --ch-accent-border: rgba(14, 165, 233, 0.25);
      --ch-accent-border-hover: rgba(14, 165, 233, 0.60);
      --ch-accent-glow: rgba(14, 165, 233, 0.10);
      --ch-accent-glow-strong: rgba(14, 165, 233, 0.45);
      --ch-green: #22c55e;
      --ch-green-soft: rgba(34, 197, 94, 0.08);
      --ch-green-glow: rgba(34, 197, 94, 0.5);
      --ch-silver: #94a3b8;
      --ch-border: rgba(255, 255, 255, 0.06);
      --ch-border-light: rgba(255, 255, 255, 0.08);
      --ch-border-subtle: rgba(255, 255, 255, 0.05);
      --ch-border-input: rgba(255, 255, 255, 0.03);
      --ch-border-icon: rgba(255, 255, 255, 0.04);
      --ch-border-soft: rgba(255, 255, 255, 0.07);
      --ch-overlay: rgba(0, 0, 0, 0.5);
      --ch-overlay-strong: rgba(0, 0, 0, 0.85);
      --ch-hud-surface: rgba(10, 14, 23, 0.92);
      --ch-hud-surface-card: rgba(10, 14, 23, 0.88);
      --ch-hud-title: rgba(0, 0, 0, 0.4);
      --ch-error: #ef4444;
      --ch-error-soft: rgba(239, 68, 68, 0.08);
      --ch-error-border: rgba(239, 68, 68, 0.2);
      --ch-green-border: rgba(34, 197, 94, 0.2);
      --ch-green-bg: rgba(34, 197, 94, 0.07);
      --ch-green-msg: rgba(34, 197, 94, 0.08);
      --ch-silver-glow: rgba(192, 192, 192, 0.04);
      --ch-dot-red: #ff5f57;
      --ch-dot-yellow: #febc2e;
      --ch-dot-green: #28c840;
    }

    *, *::before, *::after {
      font-family: 'Calibri', 'Segoe UI', sans-serif !important;
      box-sizing: border-box;
    }

    /* ═══ Blueprint Grid الهندسي ═══════════════════════════════════════════ */
    .bp-grid {
      background-image:
        linear-gradient(to right,  var(--ch-border) 1px, transparent 1px),
        linear-gradient(to bottom, var(--ch-border) 1px, transparent 1px);
      background-size: 48px 48px;
    }

    /* ═══ التدرج المعدني الثلاثي: فضي → أزرق جليدي → فضي (متحرك) ════════ */
    .metal-gradient {
      background: linear-gradient(90deg, var(--ch-silver) 0%, var(--ch-accent) 50%, var(--ch-silver) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: metalFlow 5s linear infinite;
    }

    @keyframes metalFlow {
      0%   { background-position: 0%   center; }
      50%  { background-position: 100% center; }
      100% { background-position: 0%   center; }
    }

    /* ═══ Frosted Glass Dark Layer ══════════════════════════════════════════ */
    .glass {
      background: var(--ch-surface-card) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid var(--ch-border) !important;
      transition: border-color 0.25s, box-shadow 0.25s !important;
    }
    .glass:hover {
      border-color: var(--ch-accent-border) !important;
      box-shadow: 0 0 28px var(--ch-accent-glow) !important;
    }

    /* ═══ أزرار CTA الرئيسية (أزرق جليدي) ════════════════════════════════ */
    .btn-blue {
      background: linear-gradient(135deg, var(--ch-accent-strong) 0%, var(--ch-accent) 60%, var(--ch-accent-muted) 100%);
      color: var(--ch-foreground);
      font-weight: 900;
      border: none;
      transition: all 0.25s ease;
    }
    .btn-blue:hover {
      box-shadow: 0 0 32px var(--ch-accent-glow-strong);
      transform: translateY(-1px);
      filter: brightness(1.1);
    }

    /* ═══ أزرار ثانوية (حدود أزرق فاتح) ════════════════════════════════════ */
    .btn-outline {
      background: var(--ch-accent-soft);
      border: 1px solid var(--ch-accent-border);
      color: var(--ch-accent-muted);
      transition: all 0.25s ease;
    }
    .btn-outline:hover {
      background: var(--ch-accent-soft-hover);
      border-color: var(--ch-accent-border-hover);
      box-shadow: 0 0 18px var(--ch-accent-glow);
      transform: translateY(-1px);
    }

    /* ═══ نبضة الأخضر — حصرية لإشارات النظام الحي ══════════════════════════ */
    .pulse-emerald {
      animation: pulseEmerald 2s ease-in-out infinite;
    }
    @keyframes pulseEmerald {
      0%,100% { box-shadow: 0 0 0 0   var(--ch-green-glow); }
      50%      { box-shadow: 0 0 0 5px var(--ch-green-soft); }
    }

    /* ═══ Hover card lift ════════════════════════════════════════════════════ */
    .card-lift { transition: transform 0.28s cubic-bezier(.4,0,.2,1); }
    .card-lift:hover { transform: translateY(-5px); }

    /* ═══ Fade Up ════════════════════════════════════════════════════════════ */
    .fade-up { animation: fadeUp 0.65s ease forwards; }
    @keyframes fadeUp {
      from { opacity:0; transform: translateY(22px); }
      to   { opacity:1; transform: translateY(0); }
    }

    /* ═══ Scrollbar ══════════════════════════════════════════════════════════ */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--ch-surface); }
    ::-webkit-scrollbar-thumb { background: var(--ch-text-dim); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--ch-accent); }

    /* ═══ انعكاس مرآتي لشعار الهيدر ════════════════════════════════════════ */
    .logo-wrap { position: relative; display: inline-flex; flex-direction: column; align-items: center; }
    .logo-mirror {
      display: block; width: 100%; height: 18px;
      background: url('/logo.png') center top / contain no-repeat;
      transform: scaleY(-1);
      opacity: 0.15;
      -webkit-mask-image: linear-gradient(to bottom, var(--ch-overlay) 0%, transparent 100%);
      mask-image: linear-gradient(to bottom, var(--ch-overlay) 0%, transparent 100%);
      filter: blur(0.6px);
      pointer-events: none;
    }

    /* ═══ Input focus ════════════════════════════════════════════════════════ */
    .orca-input {
      width: 100%; padding: 12px 14px; border-radius: 10px;
      background: var(--ch-border-input);
      border: 1px solid var(--ch-border-light);
      color: var(--ch-foreground); font-size: 12px; font-weight: 600;
      outline: none; transition: border-color 0.2s;
    }
    .orca-input:focus { border-color: var(--ch-accent); }
  `;

  const dir = lang === 'AR' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="corporate-home" style={{ minHeight: '100vh', background: 'var(--ch-bg)', color: 'var(--ch-foreground)', fontFamily: "'Calibri', 'Segoe UI', sans-serif", direction: dir, position: 'relative', WebkitFontSmoothing: 'antialiased' }}>



      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ══════════════════════════════════════════════════════════
          HEADER — الشريط العلوي
      ══════════════════════════════════════════════════════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--ch-surface-strong)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--ch-border-subtle)' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* ── الشعار مع الانعكاس المرآتي ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo-wrap" style={{ width: 42, height: 52 }}>
              <img src="/logo.png" alt="ORCA" style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 0 10px var(--ch-accent-glow-strong)) drop-shadow(0 2px 4px var(--ch-overlay-strong))' }} />
              <div className="logo-mirror" style={{ width: 42 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5 }}>
                <span className="metal-gradient">ORCA CRM</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--ch-accent-muted)', fontWeight: 700, letterSpacing: 0.5 }} dir="ltr">Real Estate Cloud</div>
            </div>
          </div>

          {/* ── روابط التنقل ── */}
          <nav className="hidden md:flex" style={{ gap: 32, fontSize: 11, fontWeight: 700 }}>
            {([['#features', t.navFeatures],['#workflow', t.navWorkflow],['#properties', t.navProperties],['#pricing', t.navPricing]] as [string,string][]).map(([h,l]) => (
              <a key={h} href={h} style={{ color: 'var(--ch-foreground-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ch-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ch-foreground-muted)')}>{l}</a>
            ))}
          </nav>

          {/* ── أدوات التحكم ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggleLang} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--ch-border-light)', background: 'var(--ch-accent-soft)', color: 'var(--ch-foreground-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              🌐 {lang === 'AR' ? 'EN' : 'عربي'}
            </button>
            <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--ch-border-light)', background: 'var(--ch-accent-soft)', color: 'var(--ch-foreground-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ☀
            </button>
            <a href="/login" className="btn-outline" style={{ height: 32, padding: '0 14px', borderRadius: 8, textDecoration: 'none', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              {t.login}
            </a>
            <a href="#register-interest" className="btn-blue" style={{ height: 32, padding: '0 16px', borderRadius: 8, textDecoration: 'none', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center' }}>
              {t.startFree}
            </a>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          1. HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center', zIndex: 1, overflow: 'hidden' }}>
        <div className="bp-grid" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '15%', right: '10%', width: 500, height: 500, background: 'radial-gradient(circle, var(--ch-accent-glow) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 380, height: 380, background: 'radial-gradient(circle, var(--ch-silver-glow) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto w-full" style={{ padding: '80px 40px', position: 'relative', zIndex: 10 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 80, alignItems: 'center' }}>

            {/* ── النص الرئيسي ── */}
            <div className="fade-up" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {/* شارات الحالة */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, border: '1px solid var(--ch-accent-border)', background: 'var(--ch-accent-soft)', color: 'var(--ch-accent-muted)', fontSize: 10, fontWeight: 700 }}>
                  {/* نبضة خضراء — إشارة سلامة النظام */}
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ch-green)', display: 'inline-block' }} className="pulse-emerald" />
                  {t.heroBadge}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, border: '1px solid var(--ch-border-soft)', background: 'var(--ch-border-input)', color: 'var(--ch-foreground-muted)', fontSize: 10, fontWeight: 700 }}>
                  🔒 {t.cloudStatus}
                </span>
              </div>

              {/* العنوان الرئيسي — التدرج المعدني المتحرك */}
              <h1 style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.3px' }}>
                <span className="metal-gradient">{t.heroTitle}</span>
              </h1>

              <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--ch-foreground-muted)', fontWeight: 600, maxWidth: 520, marginBottom: 40 }}>
                {t.heroSub}
              </p>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="#register-interest" className="btn-blue" style={{ padding: '14px 32px', borderRadius: 8, fontSize: 13, fontWeight: 900, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {t.heroCTA} ←
                </a>
                <a href="#pricing" className="btn-outline" style={{ padding: '14px 24px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  {t.navPricing}
                </a>
              </div>

              {/* إحصاءات —ألوان مميزة لكل رقم */}
              <div style={{ display: 'flex', gap: 32, marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--ch-border-subtle)' }}>
                {[
                  { val: '420+', lbl: lang === 'AR' ? 'وحدة مباعة'   : 'Units Sold',    color: 'var(--ch-accent)' },
                  { val: '98%',  lbl: lang === 'AR' ? 'رضا العملاء'  : 'Satisfaction',  color: 'var(--ch-silver)' },
                  { val: '24/7', lbl: lang === 'AR' ? 'وكيل ذكي نشط' : 'AI Agent Live', color: 'var(--ch-green)' },
                ].map(s => (
                  <div key={s.val}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--ch-text-dim)', fontWeight: 600 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── لوحة HUD ── */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, var(--ch-accent-glow) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ width: '100%', maxWidth: 460, borderRadius: 8, border: '1px solid var(--ch-accent-glow-strong)', background: 'var(--ch-hud-surface)', overflow: 'hidden', boxShadow: '0 30px 80px var(--ch-hud-title), 0 0 0 1px var(--ch-accent-glow)' }}>

                {/* شريط العنوان */}
                <div style={{ height: 44, background: 'var(--ch-hud-title)', borderBottom: '1px solid var(--ch-border-subtle)', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['var(--ch-dot-red)','var(--ch-dot-yellow)','var(--ch-dot-green)'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.75 }} />)}
                  </div>
                  {/* نبضة خادم الرياض — أخضر حصري */}
                  <div style={{ fontSize: 9, color: 'var(--ch-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }} dir="ltr">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ch-green)' }} className="pulse-emerald" />
                    {t.serverRiyadh}
                  </div>
                </div>

                <div style={{ padding: 24, position: 'relative' }}>
                  <div className="bp-grid" style={{ position: 'absolute', inset: 0, opacity: 0.25 }} />
                  <div style={{ position: 'relative', zIndex: 10 }}>

                    {/* شارة الدرع */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                      <span style={{ padding: '4px 10px', borderRadius: 99, background: 'var(--ch-accent-glow)', border: '1px solid var(--ch-accent-border)', color: 'var(--ch-accent-muted)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        🛡️ {t.cyberShield}
                      </span>
                    </div>

                    {/* الدائرة الإحصائية */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 24 }}>
                      <div style={{ width: 130, height: 130, borderRadius: '50%', border: '3px solid var(--ch-accent-soft)', background: 'var(--ch-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 0 30px var(--ch-accent-glow-strong) inset' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--ch-green)',    clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 70%)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--ch-accent)',    clipPath: 'polygon(50% 50%, 0 70%, 0 0, 30% 0)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--ch-accent)',    clipPath: 'polygon(50% 50%, 30% 0, 100% 0)', opacity: 0.7 }} />
                        <div style={{ width: 78, height: 78, background: 'var(--ch-surface)', borderRadius: '50%', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ch-accent-glow)' }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--ch-foreground)' }}>{toAr("85")}%</span>
                          <span style={{ fontSize: 7, color: 'var(--ch-text-dim)', fontWeight: 600 }}>{t.fromPortfolio}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[['var(--ch-green)', t.soldUnits, '420'], ['var(--ch-accent)', t.availUnits, '150'], ['var(--ch-accent)', t.bookedUnits, '85']].map(([c,l,v]) => (
                          <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 9, height: 9, borderRadius: '50%', background: c as string, boxShadow: `0 0 8px ${c}60` }} />
                            <span style={{ fontSize: 9, color: 'var(--ch-silver)', fontWeight: 600 }}>{l}: {toAr(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* شريط التدفق النقدي */}
                    <div style={{ background: 'var(--ch-border-input)', border: '1px solid var(--ch-accent-glow)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 8, color: 'var(--ch-accent-muted)', fontWeight: 700, marginBottom: 6 }}>{toAr(t.netFlows)}</div>
                      <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%"   stopColor="var(--ch-silver)" stopOpacity="0.5" />
<stop offset="50%"  stopColor="var(--ch-accent)" stopOpacity="0.9" />
<stop offset="100%" stopColor="var(--ch-silver)" stopOpacity="0.5" />
                          </linearGradient>
                        </defs>
                        <path d="M0 35 L30 25 L60 30 L90 10 L120 20 L150 5 L180 15 L200 2" stroke="url(#fg)" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                        <path d="M0 35 L30 25 L60 30 L90 10 L120 20 L150 5 L180 15 L200 2 L200 40 L0 40 Z" fill="var(--ch-accent-glow)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. WORKFLOW — الوكلاء الرقميون
      ══════════════════════════════════════════════════════════ */}
      <section id="workflow" style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '80px 0', zIndex: 1, position: 'relative' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, border: '1px solid var(--ch-accent-border)', background: 'var(--ch-accent-soft)', color: 'var(--ch-accent-muted)', fontSize: 10, fontWeight: 700, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.digitalEmployees}
            </span>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,32px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="metal-gradient">{t.workflowTitle}</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ch-text-dim)', fontWeight: 600, maxWidth: 480, margin: '0 auto' }}>{t.workflowSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]" style={{ gap: 24, alignItems: 'center', maxWidth: 860, margin: '0 auto' }}>

            {/* ساهر */}
            <div className="glass card-lift" style={{ borderRadius: 8, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--ch-border-subtle)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ch-accent-soft)', border: '1px solid var(--ch-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative' }}>
                  🤖
                  {/* نبضة الاتصال — أخضر حصري */}
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--ch-green)', border: '2px solid var(--ch-bg)' }} className="pulse-emerald" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--ch-foreground)' }}>{t.agentSaher}</div>
                  <div style={{ fontSize: 9, color: 'var(--ch-accent-muted)', fontWeight: 700 }}>{t.saherRole}</div>
                </div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.saherBullets.map((b,i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: 'var(--ch-foreground-muted)', fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ch-accent)', marginTop: 5, flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* سهم */}
            <div className="hidden md:block" style={{ fontSize: 22, color: 'var(--ch-accent-border-hover)', textAlign: 'center', transform: lang === 'AR' ? 'rotate(180deg)' : 'none' }}>→</div>

            {/* سند */}
            <div className="glass card-lift" style={{ borderRadius: 8, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--ch-border-subtle)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ch-green-bg)', border: '1px solid var(--ch-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative' }}>
                  💳
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--ch-green)', border: '2px solid var(--ch-bg)' }} className="pulse-emerald" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--ch-foreground)' }}>{t.agentSanad}</div>
                  <div style={{ fontSize: 9, color: 'var(--ch-green)', fontWeight: 700 }}>{t.sanadRole}</div>
                </div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.sanadBullets.map((b,i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: 'var(--ch-foreground-muted)', fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ch-green)', marginTop: 5, flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. FEATURES — بطاقات المميزات
      ══════════════════════════════════════════════════════════ */}
      <section id="features" style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '80px 0', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <div className="bp-grid" style={{ position: 'absolute', inset: 0, opacity: 0.2 }} />
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px', position: 'relative', zIndex: 10 }}>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 24, maxWidth: 900, margin: '0 auto' }}>
            {[
              { icon: '📊', t: t.f1t, d: t.f1d, c: 'var(--ch-accent)' },
              { icon: '🤝', t: t.f2t, d: t.f2d, c: 'var(--ch-silver)' },
              { icon: '🛡️', t: t.f3t, d: t.f3d, c: 'var(--ch-green)' },
            ].map(f => (
              <div key={f.t} className="glass card-lift" style={{ borderRadius: 8, padding: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--ch-border-icon)', border: '1px solid var(--ch-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18 }}>{f.icon}</div>
                <h3 style={{ fontSize: 13, fontWeight: 900, marginBottom: 10, color: f.c }}>{f.t}</h3>
                <p style={{ fontSize: 11, color: 'var(--ch-text-dim)', lineHeight: 1.8, fontWeight: 600 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. PROPERTIES — معرض الأصول
      ══════════════════════════════════════════════════════════ */}
      <section id="properties" style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '80px 0', zIndex: 1, position: 'relative' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="metal-gradient">{t.galleryTitle}</span>
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ch-text-dim)', fontWeight: 600, maxWidth: 440, margin: '0 auto' }}>{t.gallerySub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20, maxWidth: 900, margin: '0 auto' }}>
            {projects.map(p => (
              <div key={p.id} className="card-lift" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ch-border)', background: 'var(--ch-hud-surface-card)', backdropFilter: 'blur(12px)' }}>
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img src={p.thumb} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--ch-overlay-strong)', backdropFilter: 'blur(8px)', color: 'var(--ch-silver)', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 99, border: '1px solid var(--ch-border-soft)' }}>📍 {p.city}</span>
                  <span style={{ position: 'absolute', bottom: 12, right: 12, background: 'var(--ch-overlay-strong)', backdropFilter: 'blur(8px)', color: 'var(--ch-accent-muted)', fontSize: 8, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--ch-accent-border)' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 900, color: 'var(--ch-foreground)', marginBottom: 6 }}>{p.name}</h3>
                  <p style={{ fontSize: 9, color: 'var(--ch-text-dim)', fontWeight: 600, marginBottom: 14 }}>🏡 {p.layout}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--ch-border-subtle)' }}>
                    <span style={{ fontSize: 9, color: 'var(--ch-text-dim)', fontWeight: 600 }}>{t.pricingStarts}</span>
                    <span style={{ fontSize: 12, fontWeight: 900 }}><span className="metal-gradient">{fmtPrice(p.price)} {t.sar}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. PRICING
      ══════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '80px 0', zIndex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, var(--ch-accent-soft) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 900, marginBottom: 12 }}>
              <span className="metal-gradient">{t.pricingTitle}</span>
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ch-text-dim)', fontWeight: 600, maxWidth: 440, margin: '0 auto' }}>{t.pricingSub}</p>
          </div>
          <PricingGrid theme="dark" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. INVESTOR FORM
      ══════════════════════════════════════════════════════════ */}
      <section id="register-interest" style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '80px 0', zIndex: 1, position: 'relative' }}>
        <div className="max-w-4xl mx-auto" style={{ padding: '0 40px' }}>
          <div className="glass" style={{ borderRadius: 8, padding: '48px 52px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 60px var(--ch-accent-soft)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, background: 'radial-gradient(circle, var(--ch-accent-soft) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
                <span className="metal-gradient">{t.investorTitle}</span>
              </h2>
              <p style={{ fontSize: 11, color: 'var(--ch-text-dim)', fontWeight: 600, lineHeight: 1.7 }}>{t.investorSub}</p>
            </div>

            {formStatus && (
              <div style={{ marginBottom: 24, padding: '14px 20px', borderRadius: 8, background: formStatus.ok ? 'var(--ch-green-msg)' : 'var(--ch-error-soft)', border: `1px solid ${formStatus.ok ? 'var(--ch-green-border)' : 'var(--ch-error-border)'}`, color: formStatus.ok ? 'var(--ch-green)' : 'var(--ch-error)', fontSize: 12, fontWeight: 700, textAlign: 'center', position: 'relative', zIndex: 10 }}>
                {formStatus.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 10 }}>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ch-foreground-muted)', marginBottom: 6 }}>{t.nameLabel}</label>
                  <input name="name" type="text" required placeholder={t.namePH} className="orca-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ch-foreground-muted)', marginBottom: 6 }}>{t.phoneLabel}</label>
                  <input name="phone" type="tel" required placeholder={t.phonePH} className="orca-input" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ch-foreground-muted)', marginBottom: 6 }}>{t.projLabel}</label>
                <select name="projectId" className="orca-input" style={{ appearance: 'none', color: 'var(--ch-silver)' }}>
                  <option value="">{t.projPH}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-blue" style={{ padding: '14px 24px', borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1, marginTop: 8 }}>
                {isSubmitting ? (lang === 'AR' ? 'جارٍ المعالجة...' : 'Processing...') : t.submitBtn}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid var(--ch-border-subtle)', padding: '40px 0 28px', zIndex: 1, position: 'relative' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}><span className="metal-gradient">ORCA CRM</span></div>
            <div style={{ fontSize: 10, color: 'var(--ch-text-dim)', fontWeight: 600 }}>{t.allRights}</div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[[t.supportTitle, t.whatsapp],[t.security, t.secDesc]].map(([title, sub]) => (
              <div key={title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ch-foreground-muted)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 9, color: 'var(--ch-text-dim)', fontWeight: 600 }}>{sub}</div>
              </div>
            ))}
          </div>
          {/* نبضة خادم الرياض — أخضر حصري */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--ch-green)', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ch-green)' }} className="pulse-emerald" />
            {t.serverRiyadh}
          </div>
        </div>
      </footer>

    </div>
  );
}
