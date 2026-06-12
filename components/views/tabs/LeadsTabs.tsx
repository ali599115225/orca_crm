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

import { Plus } from "lucide-react";
import { SmartCard } from "../../ui/SmartCard";

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

  // ── Filter Chips ──
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (key: string) => setActiveFilter(prev => prev === key ? null : key);
  const clearFilters = () => setActiveFilter(null);
  const hasFilters = activeFilter !== null || searchQuery.length > 0;

  const filterChips = [
    { key: "total",      labelKey: "leads.totalLeads" },
    { key: "dueToday",   labelKey: "leads.dueToday" },
    { key: "highProb",   labelKey: "leads.highProbability" },
    { key: "active",     labelKey: "leads.activeLeads" },
  ] as const;

  const chipColors: Record<string, string> = {
    total:    "border-blue-500/30 bg-blue-500/5 text-blue-400",
    dueToday: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    highProb: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    active:   "border-purple-500/30 bg-purple-500/5 text-purple-400",
  };

  // ── Add Lead Modal ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [leadForm, setLeadForm] = useState({ firstName: "", lastName: "", phone: "", email: "", source: "مباشر", city: "الرياض" });
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.firstName.trim() || !leadForm.phone.trim()) return;
    setFormLoading(true); setFormMsg(null);
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const json = await res.json();
      if (json.success) {
        setFormMsg({ ok: true, text: lang === "AR" ? "تم إضافة العميل بنجاح" : "Lead added successfully" });
        setLeadForm({ firstName: "", lastName: "", phone: "", email: "", source: "مباشر", city: "الرياض" });
        setTimeout(() => { setShowAddModal(false); setFormMsg(null); }, 1000);
      } else {
        setFormMsg({ ok: false, text: json.error || "Error" });
      }
    } catch {
      setFormMsg({ ok: false, text: lang === "AR" ? "فشل الاتصال بالخادم" : "Connection failed" });
    } finally { setFormLoading(false); }
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

      {/* ════════════════ A. PAGE HEADER ════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="nc-heading-1">{t("leads.pageTitle")}</h1>
          <p className="text-[var(--nc-text-dim)] text-sm mt-1">{t("leads.pageDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddModal(true)} className="nc-btn nc-btn-primary nc-btn-sm text-xs cursor-pointer">
            <Plus size={14} />
            <span>{t("leads.addLead")}</span>
          </button>
        </div>
      </div>

      {/* ════════════════ B. ADD LEAD MODAL ════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()} dir={lang === "AR" ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[var(--nc-foreground)]">{t("leads.addLead")}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{lang === "AR" ? "الاسم الأول *" : "First Name *"}</label>
                  <input value={leadForm.firstName} onChange={e => setLeadForm({...leadForm, firstName: e.target.value})} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" required />
                </div>
                <div>
                  <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{lang === "AR" ? "الاسم الأخير" : "Last Name"}</label>
                  <input value={leadForm.lastName} onChange={e => setLeadForm({...leadForm, lastName: e.target.value})} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" />
                </div>
              </div>
              <div>
                <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{lang === "AR" ? "رقم الجوال *" : "Phone *"}</label>
                <input value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" required dir="ltr" />
              </div>
              <div>
                <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{t("lead.email")}</label>
                <input value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} type="email" className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{t("lead.source")}</label>
                  <select value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value})} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]">
                    <option value="مباشر">{lang === "AR" ? "مباشر" : "Direct"}</option>
                    <option value="سناب شات">{lang === "AR" ? "سناب شات" : "Snapchat"}</option>
                    <option value="فيسبوك">{lang === "AR" ? "فيسبوك" : "Facebook"}</option>
                    <option value="جوجل">{lang === "AR" ? "جوجل" : "Google"}</option>
                    <option value="إحالة">{lang === "AR" ? "إحالة" : "Referral"}</option>
                    <option value="واتساب">{lang === "AR" ? "واتساب" : "WhatsApp"}</option>
                    <option value="معرض">{lang === "AR" ? "معرض" : "Exhibition"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[var(--nc-text-dim)] font-medium block mb-1">{t("lead.city")}</label>
                  <input value={leadForm.city} onChange={e => setLeadForm({...leadForm, city: e.target.value})} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" />
                </div>
              </div>
              {formMsg && (
                <div className={`text-xs font-bold p-2 rounded-lg ${formMsg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>{formMsg.text}</div>
              )}
              <button type="submit" disabled={formLoading} className="nc-btn nc-btn-primary w-full text-xs cursor-pointer">
                {formLoading ? (lang === "AR" ? "جاري الحفظ..." : "Saving...") : t("leads.addLead")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ B. FILTER STRIP ════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.key;
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
            </button>
          );
        })}
        {hasFilters && (
          <button onClick={clearFilters} className="text-[10px] font-bold text-[var(--nc-accent)] hover:underline cursor-pointer px-2">
            {t("leads.clearFilters")}
          </button>
        )}
      </div>

      {/* ════════════════ C. TAB BAR ════════════════ */}
      <div className="tabs-row flex flex-wrap gap-2 border-b border-[var(--nc-glass-border)] pb-2">
        {tabs.map((t2) => (
          <button key={t2.id} type="button" onClick={() => handleTabChange(t2.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${active === t2.id ? "bg-[var(--nc-accent)] text-white shadow-sm" : "bg-[var(--nc-surface)] text-[var(--nc-text-dim)] border border-[var(--nc-glass-border)] hover:text-[var(--nc-foreground)]"}`}>
            {lang === "AR" ? t2.labelAr : t2.labelEn}
          </button>
        ))}
      </div>

      {/* ════════════════ D. TAB CONTENT ════════════════ */}
      {isPending ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-xs text-[var(--nc-foreground-muted)]">{lang === "AR" ? "جاري الانتقال..." : "Loading..."}</span>
        </div>
      ) : (
        <>
          {active === "pipeline" && <LeadsPipelineV2 wiredFilter={activeFilter} refreshKey={formMsg?.ok ? Date.now() : 0} />}
          {active === "contacts" && <Contacts />}
          {active === "opportunities" && <Opportunities />}
          {active === "tours" && <Tours />}
          {active === "offers" && <Offers />}
          {active === "tasks" && <Tasks />}
          {active === "insights" && <InsightsAutomation />}
        </>
      )}

      {/* ════════════════ E. AI PREVIEW ════════════════ */}
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
          <button onClick={() => startTransition(() => setActive("insights"))} className="nc-btn nc-btn-ghost nc-btn-sm text-xs">
            <span>{t("insights.title")} →</span>
          </button>
        </SmartCard>
      )}
    </div>
  );
}
