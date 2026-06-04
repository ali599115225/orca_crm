// components/views/tabs/LeadsTabs.tsx
"use client";

import { useState } from "react";
import { useApp } from "@/app/context/AppContext";
import strings from "@/components/i18n/ar";
import Pipeline from "../pipeline/Pipeline";
import Contacts from "./Contacts";
import Opportunities from "./Opportunities";
import Tours from "./Tours";
import Offers from "./Offers";
import Tasks from "./Tasks";
import InsightsAutomation from "./InsightsAutomation";

export default function LeadsTabs() {
  const { lang } = useApp();
  const [active, setActive] = useState("pipeline");

  const tabs = [
    { id: "pipeline", labelAr: "نظرة عامة Pipeline", labelEn: "Pipeline Overview" },
    { id: "contacts", labelAr: "دفتر العملاء Contacts", labelEn: "Contacts Directory" },
    { id: "opportunities", labelAr: "الفرص Opportunities", labelEn: "Opportunities" },
    { id: "tours", labelAr: "الجولات Tours", labelEn: "Property Tours" },
    { id: "offers", labelAr: "العروض Offers", labelEn: "Offers & Proposals" },
    { id: "tasks", labelAr: "الأنشطة Tasks", labelEn: "Tasks & Activities" },
    { id: "insights", labelAr: "الرؤى والأتمتة Insights", labelEn: "Insights & Automation" },
  ];

  return (
    <div className="leads-page p-6" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-[#94A3B8] font-bold tracking-wider uppercase">{lang === 'AR' ? 'إدارة علاقات العملاء' : 'Customer Relationship Management'}</div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">
            {lang === 'AR' ? 'مركز إدارة العملاء والصفقات — ORCA CRM' : 'Deals & Leads Hub — ORCA CRM'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <input 
            placeholder={lang === 'AR' ? 'بحث شامل بالاسم أو الجوال...' : 'Global search leads...'} 
            className="px-3 py-1.5 rounded-md bg-[#042A44] border border-[#0ea5e9]/20 text-white text-xs" 
          />
          <button className="bg-[#df7b62] hover:bg-[#c5654e] text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors">
            {lang === 'AR' ? 'بحث' : 'Search'}
          </button>
        </div>
      </div>

      <div className="tabs-row flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              active === t.id 
                ? "bg-[#df7b62] text-white" 
                : "bg-[#042A44] text-[#94A3B8] border border-slate-800 hover:text-white"
            }`}
          >
            {lang === 'AR' ? t.labelAr : t.labelEn}
          </button>
        ))}
      </div>

      <div className="tab-area">
        {active === "pipeline" && <Pipeline />}
        {active === "contacts" && <Contacts />}
        {active === "opportunities" && <Opportunities />}
        {active === "tours" && <Tours />}
        {active === "offers" && <Offers />}
        {active === "tasks" && <Tasks />}
        {active === "insights" && <InsightsAutomation />}
      </div>
    </div>
  );
}
