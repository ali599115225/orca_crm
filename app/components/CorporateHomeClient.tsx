"use client";
import React, { useState } from "react";
import PricingGrid from "./PricingGrid";
import { createLeadAction } from "@/app/actions/leads";
import { useApp } from "@/app/context/AppContext";

interface Project { id: string; name: string; city: string; status: string; unitsTotal: number; unitsSold: number; unitsBooked: number; minPrice: number | null; maxPrice: number | null; }
interface CorporateHomeClientProps { host: string; companyName: string; initialProjects?: Project[]; }

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
    navFeatures: "بنية النظام الذكي", navWorkflow: "الوكلاء الرقميون", navProperties: "الأصول الفاخرة", navPricing: "الباقات الاستثمارية", startFree: "ابدأ مجاناً", heroBadge: "المنصة الرائدة للمطورين العقاريين في الخليج",
    heroSub: "المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة.", heroCTA: "ابدأ إدارة محفظتك الاستثمارية مجاناً", serverRiyadh: "خادم الرياض: آمن ١٠٠٪", cyberShield: "الدرع السيبراني: نشط",
    soldUnits: "الوحدات المباعة: ٤٢٠ وحدة", availUnits: "الوحدات المتاحة: ١٥٠ وحدة", bookedUnits: "الوحدات المحجوزة: ٨٥ وحدة", netFlows: "التدفقات النقدية: ٤٢,٥٠٠,٠٠٠ ر.س",
    landing: { heroTitle: "الجيل الجديد من إدارة العقارات" }, submitBtn: "توثيق الاهتمام وتأهيل الطلب فوريّاً", galleryTitle: "معرض الأصول العقارية الفاخرة", pricingStarts: "تبدأ الأسعار من:", saudiRiyal: "ر.س", statusPlanning: "قيد التخطيط", statusUnderConstruction: "تحت الإنشاء", statusCompleted: "مكتمل التطوير", statusSoldOut: "مباع بالكامل"
  },
  EN: {
    navFeatures: "Smart Architecture", navWorkflow: "Digital Agents", navProperties: "Luxury Assets", navPricing: "Investment Tiers", startFree: "Start Free", heroBadge: "The Leading Platform for Gulf Real Estate Developers",
    heroSub: "An innovative cloud platform running 24/7 autonomous digital staff to manage sales and collection.", heroCTA: "Start Managing Your Portfolio Free", serverRiyadh: "Riyadh Server: 100% Secure", cyberShield: "Cyber Shield: Active",
    soldUnits: "Sold Units: 420 Units", availUnits: "Available Units: 150 Units", bookedUnits: "Reserved Units: 85 Units", netFlows: "Secured Cash Flows: 42,500,000 SAR",
    landing: { heroTitle: "Next-Gen Real Estate: 100% Automations" }, submitBtn: "Submit Intent & Fast-Track Qualification", galleryTitle: "Luxury Estate & Asset Portfolio Showcase", pricingStarts: "Pricing Starts From:", saudiRiyal: "SAR", statusPlanning: "Planning Phase", statusUnderConstruction: "Under Construction", statusCompleted: "Fully Developed", statusSoldOut: "Sold Out"
  }
};
export default function CorporateHomeClient({ host, companyName, initialProjects = [] }: CorporateHomeClientProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ success: boolean; message: string } | null>(null);

  const formatPrice = (price: number): string => price.toLocaleString('en-US');
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await createLeadAction(formData);
    setIsSubmitting(false);
    if (res.success) { setFormStatus({ success: true, message: "تم بنجاح." }); (e.target as HTMLFormElement).reset(); }
    else { setFormStatus({ success: false, message: res.error || "حدث خطأ." }); }
  };
  const displayProjects = initialProjects && initialProjects.length > 0 ? initialProjects.map((p, idx) => ({ ...p, thumbnail: FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length] })) : DEFAULT_LUXURY_PROJECTS.map(p => ({ ...p, name: lang === 'AR' ? p.nameAr : p.nameEn, city: lang === 'AR' ? p.cityAr : p.cityEn }));
  const isDark = theme === "dark";
  return (
    <div className={`min-h-screen transition-colors ${isDark ? "bg-[#0b0f19] text-white" : "bg-[#f9f9fb] text-[#0b0f19]"}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      <header className="p-6 flex justify-between items-center border-b">
        <div className="font-black">ORCA CRM</div>
        <div className="flex gap-4">
          <button onClick={toggleLang}>🌐 {lang === "AR" ? "EN" : "عربي"}</button>
          <a href="#register-interest" className="bg-[#735334] text-white px-4 py-2 rounded-lg">{t.startFree}</a>
        </div>
      </header>
      <section className="py-20 text-center">
        <h1 className="text-4xl font-black">{t.landing.heroTitle}</h1>
        <a href="#register-interest" className="block mt-10 bg-[#735334] text-white py-4 w-48 mx-auto rounded-xl font-black">{t.heroCTA}</a>
      </section>
      <section id="properties" className="py-20 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
          {displayProjects.map((p) => (
            <div key={p.id} className="border rounded-3xl overflow-hidden"><img src={p.thumbnail} alt={p.name} className="h-48 w-full object-cover" /><div className="p-6"><h3 className="font-black">{p.name}</h3></div></div>
          ))}
        </div>
      </section>
      <PricingGrid theme={theme} />
      <section id="register-interest" className="py-20 border-t px-6 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="investorName" placeholder="الاسم" className="w-full p-4 border rounded-xl bg-transparent" required />
          <input type="tel" name="phone" placeholder="الجوال" className="w-full p-4 border rounded-xl bg-transparent" required />
          <button type="submit" className="w-full bg-[#735334] text-white p-4 rounded-xl font-black">{t.submitBtn}</button>
        </form>
      </section>
    </div>
  );
}
