// components/views/tabs/LeadsTabs.tsx
"use client";
import { useState, useTransition, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import { useRouter } from "next/navigation";
import LeadsPipelineV2 from "../pipeline/LeadsPipelineV2";
import Contacts from "./Contacts";
import Opportunities from "./Opportunities";
import Tours from "./Tours";
import Offers from "./Offers";
import Tasks from "./Tasks";
import InsightsAutomation from "./InsightsAutomation";

import { Search, Plus, Upload, Phone, MessageCircle, Mail, CheckSquare, MapPin, FileText, Target, FileCheck } from "lucide-react";
import { SmartCard } from "../../ui/SmartCard";

// ── Flat row block (shared style) ──
function FlatRowBlock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] hover:border-[var(--nc-accent-border)] transition-colors ${className}`}>
      {children}
    </div>
  );
}

export default function LeadsTabs() {
  const { lang, t } = useApp();
  const router = useRouter();
  const [active, setActive] = useState("pipeline");
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // ── Listen for search from Header ──
  useEffect(() => {
    const handler = (e: Event) => { setSearchQuery((e as CustomEvent).detail || ""); };
    window.addEventListener("search-change", handler);
    return () => window.removeEventListener("search-change", handler);
  }, []);

  // ── Filter state ──
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const clearFilters = () => setActiveFilters(new Set());
  const hasFilters = activeFilters.size > 0 || searchQuery.length > 0;

  // ── Filter chips (simulated counts) ──
  const filterChips = [
    { key: "total",      labelKey: "leads.totalLeads",      mockCount: 48 },
    { key: "dueToday",   labelKey: "leads.dueToday",        mockCount: 7 },
    { key: "highProb",   labelKey: "leads.highProbability", mockCount: 12 },
    { key: "active",     labelKey: "leads.activeLeads",     mockCount: 31 },
  ];

  // Filter chip colors
  const chipColors: Record<string, string> = {
    total:    "border-blue-500/30 bg-blue-500/5 text-blue-400",
    dueToday: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    highProb: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    active:   "border-purple-500/30 bg-purple-500/5 text-purple-400",
  };

  const tabs = [
    { id: "pipeline",     labelAr: "مسار الصفقات",    labelEn: "Pipeline" },
    { id: "contacts",     labelAr: "جهات اتصال",      labelEn: "Contacts" },
    { id: "opportunities",labelAr: "الفرص",           labelEn: "Opportunities" },
    { id: "tours",        labelAr: "الجولات العقارية", labelEn: "Tours" },
    { id: "offers",       labelAr: "العروض العقارية",  labelEn: "Offers" },
    { id: "tasks",        labelAr: "المهام والأنشطة",  labelEn: "Tasks" },
    { id: "insights",     labelAr: "الرؤى والأتمتة",   labelEn: "Insights" },
  ];

  const handleTabChange = (tabId: string) => startTransition(() => setActive(tabId));

  return (
    <div className="nc-stack" dir={lang === "AR" ? "rtl" : "ltr"} style={{ padding: "16px 24px 40px", maxWidth: 1600, margin: "0 auto", width: "100%" }}>

      {/* ═══════════════════════════════════════
          A. PAGE HEADER
          ═══════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="nc-heading-1">{t("leads.pageTitle")}</h1>
          <p className="text-[var(--nc-text-dim)] text-sm mt-1">{t("leads.pageDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="nc-btn nc-btn-ghost nc-btn-sm text-xs" onClick={() => router.push("/operations/leads?import=1")}>
            <Upload size={14} />
            <span>{t("leads.import")}</span>
          </button>
          <button className="nc-btn nc-btn-primary nc-btn-sm text-xs" onClick={() => router.push("/operations/leads?add=1")}>
            <Plus size={14} />
            <span>{t("leads.addLead")}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          B. MINI KPI / FILTER STRIP
          ═══════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map((chip) => {
          const isActive = activeFilters.has(chip.key);
          return (
            <button
              key={chip.key}
              onClick={() => toggleFilter(chip.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer
                ${isActive
                  ? `${chipColors[chip.key] || ""} border-current`
                  : "border-[var(--nc-glass-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)] hover:text-[var(--nc-foreground)]"}
              `}
            >
              <span>{t(chip.labelKey)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-current/10" : "bg-[var(--nc-surface-strong)]"}`}>
                {chip.mockCount}
              </span>
            </button>
          );
        })}
        {hasFilters && (
          <button onClick={clearFilters} className="text-[10px] font-bold text-[var(--nc-accent)] hover:underline cursor-pointer px-2">
            {t("leads.clearFilters")}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════
          C. VIEW SWITCH + TAB BAR
          ═══════════════════════════════════════ */}
      <div className="tabs-row flex flex-wrap gap-2 border-b border-[var(--nc-glass-border)] pb-2">
        {tabs.map((t2) => (
          <button
            key={t2.id}
            type="button"
            onClick={() => handleTabChange(t2.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              active === t2.id
                ? "bg-[var(--nc-accent)] text-white shadow-sm"
                : "bg-[var(--nc-surface)] text-[var(--nc-text-dim)] border border-[var(--nc-glass-border)] hover:text-[var(--nc-foreground)]"
            }`}
          >
            {lang === "AR" ? t2.labelAr : t2.labelEn}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          D. TAB CONTENT AREA
          ═══════════════════════════════════════ */}
      {isPending ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[var(--nc-foreground-muted)]">{lang === "AR" ? "جاري الانتقال..." : "Loading..."}</span>
        </div>
      ) : (
        <>
          {active === "pipeline" && <LeadsPipelineV2 />}
          {active === "contacts" && <Contacts />}
          {active === "opportunities" && <Opportunities />}
          {active === "tours" && <Tours />}
          {active === "offers" && <Offers />}
          {active === "tasks" && <Tasks />}
          {active === "insights" && <InsightsAutomation />}
        </>
      )}

      {/* ═══════════════════════════════════════
          E. AI / INSIGHTS — Limited Preview
          ═══════════════════════════════════════ */}
      {active !== "insights" && (
        <SmartCard elevation="subtle" className="p-5 border-dashed border-purple-500/20">
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
              <i className="ph-fill ph-eye text-xs"></i>
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{t("dash.previewLabel")}</p>
              <p className="text-[9px] text-[var(--nc-text-dim)]">{t("dash.previewDesc")}</p>
            </div>
          </div>
          <button
            onClick={() => startTransition(() => setActive("insights"))}
            className="nc-btn nc-btn-ghost nc-btn-sm text-xs"
          >
            <span>{t("insights.title")} →</span>
          </button>
        </SmartCard>
      )}

    </div>
  );
}
