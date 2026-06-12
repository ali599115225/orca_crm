// components/views/tabs/Opportunities.tsx
"use client";
import { useState, useEffect } from "react";
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from "@/app/context/AppContext";

type Opportunity = { id: string; leadId: string; value: number; probability: number; closeDate: string; status: string; linkedUnitIds: string | null; };
type Lead = { id: string; firstName: string; lastName: string | null; };

export default function Opportunities() {
  const { t } = useApp();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [leadId, setLeadId] = useState(""); const [value, setValue] = useState(""); const [probability, setProbability] = useState("50"); const [closeDate, setCloseDate] = useState(""); const [unitIds, setUnitIds] = useState("");
  const [aiPrice, setAiPrice] = useState<number | null>(null); const [aiRationale, setAiRationale] = useState("");

  const loadData = async () => { try { setLoading(true); const [oppRes, leadRes] = await Promise.all([fetch("/api/v1/opportunities"), fetch("/api/v1/leads")]); const oppJson = await oppRes.json(); const leadJson = await leadRes.json(); if (oppJson.success) setOpportunities(oppJson.data); if (leadJson.success) setLeads(leadJson.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, []);

  const handleCreateOpportunity = async (e: React.FormEvent) => { e.preventDefault(); if (!leadId || !value) return; try { setBtnLoading(true); await fetch("/api/v1/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, value, probability, closeDate, linkedUnitIds: unitIds }) }); setLeadId(""); setValue(""); setProbability("50"); setCloseDate(""); setUnitIds(""); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const optimizeOfferPrice = async () => { if (!value) return; try { setBtnLoading(true); const res = await fetch("/api/v1/ai/offer-optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basePrice: value, probability }) }); const json = await res.json(); if (json.success) { setAiPrice(json.suggestedPrice); setAiRationale(json.rationaleAr); } } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const getLeadName = (lid: string) => { const l = leads.find(lead => lead.id === lid); return l ? `${l.firstName} ${l.lastName || ""}`.trim() : t("opps.unknownLead"); };

  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SmartCard className="p-4 flex flex-col justify-between">
          <div><h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("opps.createTitle")}</h3>
            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.selectLead")}</label><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="">{t("opps.selectLeadPlaceholder")}</option>{leads.map((l) => (<option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>))}</select></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.propertyValue")}</label><input type="number" placeholder={t("opps.propertyPlaceholder")} value={value} onChange={(e) => setValue(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required /></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.probability")}</label><input type="range" min="10" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} className="w-full accent-[var(--nc-accent)]" /><span className="text-left font-bold text-[var(--nc-foreground)]">{probability}%</span></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.unitIds")}</label><input placeholder={t("opps.unitIdsPlaceholder")} value={unitIds} onChange={(e) => setUnitIds(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] animate-pulse" /></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.expectedClose")}</label><input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] font-en" /></div>
              <div className="pt-2 flex gap-2"><button type="submit" disabled={btnLoading} className="flex-1 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{t("opps.save")}</button><button type="button" onClick={optimizeOfferPrice} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold px-3 py-2 transition-all">{t("opps.aiOptimize")}</button></div>
            </form>
          </div>
          {aiPrice !== null && (<div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 mt-4 text-xs space-y-2"><div className="flex justify-between items-center text-indigo-400 font-bold"><span>{t("opps.aiSuggested")}</span><span className="font-en text-sm text-[var(--nc-foreground)]">{aiPrice.toLocaleString()} ر.س</span></div><p className="text-[var(--nc-text-dim)] font-medium leading-relaxed text-xs">{aiRationale}</p></div>)}
        </SmartCard>
        <SmartCard className="lg:col-span-2 p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("opps.listTitle")}</h3>
          {loading ? (<div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("opps.loading")}</div>) : opportunities.length === 0 ? (<div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("opps.noData")}</div>) : (
            <div className="overflow-x-auto"><table className="w-full text-right border-collapse text-xs"><thead><tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-medium font-semibold"><th className="py-2 px-1">{t("opps.tableLead")}</th><th className="py-2 px-1">{t("opps.tableValue")}</th><th className="py-2 px-1 text-center">{t("opps.tableProbability")}</th><th className="py-2 px-1">{t("opps.tableCloseDate")}</th><th className="py-2 px-1">{t("opps.tableStatus")}</th></tr></thead><tbody className="divide-y divide-slate-800/60 text-slate-200">{opportunities.map((opp) => (<tr key={opp.id} className="hover:bg-[var(--nc-surface-strong)] transition-colors"><td className="py-2 px-1 font-bold text-[var(--nc-foreground)]">{getLeadName(opp.leadId)}</td><td className="py-2 px-1 font-en">{Number(opp.value).toLocaleString()} ر.س</td><td className="py-2 px-1 text-center"><span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-en">{opp.probability}%</span></td><td className="py-2 px-1 font-en">{opp.closeDate.slice(0, 10)}</td><td className="py-2 px-1"><span className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 px-2 py-1 rounded">{opp.status}</span></td></tr>))}</tbody></table></div>
          )}
        </SmartCard>
      </div>
    </div>
  );
}
