// components/views/tabs/Opportunities.tsx
"use client";
import { useState, useEffect } from "react";
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from "@/app/context/AppContext";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { MoneyCell } from "@/components/ui/orca-table/cells/MoneyCell";
import { DateCell } from "@/components/ui/orca-table/cells/DateCell";
import { RelationCell } from "@/components/ui/orca-table/cells/RelationCell";
import { StatusCell } from "@/components/ui/orca-table/cells/StatusCell";
import { formatOpportunityStatus } from "@/lib/ui-status";
import { DateField } from '@/components/ui/date-time/DateField';

type Opportunity = { id: string; leadId: string; value: number; probability: number; closeDate: string; status: string; unitId: string | null; };
type Lead = { id: string; firstName: string; lastName: string | null; };
type Unit = { id: string; unitNumber: string; priceSar: number; status: string; project: { name: string } | null };

interface OpportunitiesProps {
  leadId?: string;
  leadName?: string;
}

export default function Opportunities({ leadId: fixedLeadId, leadName }: OpportunitiesProps = {}) {
  const { t, lang } = useApp();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [leadId, setLeadId] = useState(fixedLeadId || ""); const [value, setValue] = useState(""); const [probability, setProbability] = useState("50"); const [closeDate, setCloseDate] = useState(""); const [unitId, setUnitId] = useState("");
  const [aiPrice, setAiPrice] = useState<number | null>(null); const [aiRationale, setAiRationale] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => { try { setLoading(true); const [oppRes, leadRes, unitsRes] = await Promise.all([fetch("/api/v1/opportunities"), fetch("/api/v1/leads"), fetch("/api/v1/properties")]); const oppJson = await oppRes.json(); const leadJson = await leadRes.json(); const unitsJson = await unitsRes.json(); if (oppJson.success) setOpportunities(oppJson.data); if (leadJson.success) setLeads(leadJson.data); if (unitsJson.data) setUnits(unitsJson.data.map((u: any) => ({ id: u.id, unitNumber: u.sku, priceSar: u.price, status: u.status, project: { name: u.project } }))); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, []);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!leadId) {
      setError(lang === "EN" ? "Lead is required" : "العميل مطلوب");
      return;
    }
    if (!value) {
      setError(lang === "EN" ? "Deal value is required" : "قيمة الصفقة مطلوبة");
      return;
    }
    if (!unitId) {
      setError(lang === "EN" ? "Unit is required" : "الوحدة مطلوبة");
      return;
    }

    try {
      setBtnLoading(true);
      const res = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, value, probability, closeDate, unitId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (lang === "EN" ? "Failed to create opportunity" : "فشل إنشاء الفرصة"));
      }

      // Reset form and close modal
      setValue("");
      setProbability("50");
      setCloseDate("");
      setUnitId("");
      setShowModal(false);

      // Reload data to show new opportunity
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || (lang === "EN" ? "An error occurred" : "حدث خطأ"));
    } finally {
      setBtnLoading(false);
    }
  };

  const optimizeOfferPrice = async () => { if (!value) return; try { setBtnLoading(true); const res = await fetch("/api/v1/ai/offer-optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basePrice: value, probability }) }); const json = await res.json(); if (json.success) { setAiPrice(json.suggestedPrice); setAiRationale(json.rationaleAr); } } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const getLeadName = (lid: string) => {
    if (fixedLeadId && leadName) return leadName;
    const l = leads.find(lead => lead.id === lid);
    return l ? `${l.firstName} ${l.lastName || ""}`.trim() : null;
  };

  const filteredOpportunities = fixedLeadId
    ? opportunities.filter(opp => opp.leadId === fixedLeadId)
    : opportunities;

  const columns: Column<Opportunity>[] = [
    { header: t("opps.tableLead"), accessor: (opp) => <RelationCell name={getLeadName(opp.leadId)} /> },
    { header: t("opps.tableValue"), accessor: (opp) => <MoneyCell amount={opp.value} lang={lang} /> },
    { header: t("opps.tableProbability"), accessor: (opp) => <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-en">{opp.probability}%</span>, className: 'text-center', headerClassName: 'text-center' },
    { header: t("opps.tableCloseDate"), accessor: (opp) => <DateCell value={opp.closeDate} /> },
    { header: t("opps.tableStatus"), accessor: (opp) => <StatusCell status={opp.status} format={formatOpportunityStatus} activeClass="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20" /> },
  ];

  // If viewing from lead detail, show simplified view with create button
  if (fixedLeadId) {
    return (
      <div className="tab-pane space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm">{t("opps.listTitle")}</h3>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold text-sm transition-all"
          >
            {lang === "EN" ? "Create Opportunity" : "إنشاء فرصة"}
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("opps.loading")}</div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("opps.noData")}</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredOpportunities}
            emptyMessage={t("opps.noData")}
            pageSize={15}
          />
        )}

        {/* Create Opportunity Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--nc-foreground)]">
                    {lang === "EN" ? "Create Opportunity" : "إنشاء فرصة"}
                  </h2>
                  <button
                    onClick={() => { setShowModal(false); setError(null); }}
                    className="text-[var(--nc-text-dim)] hover:text-[var(--nc-foreground)] text-2xl"
                  >
                    ×
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateOpportunity} className="space-y-4 text-sm">
                  {/* Fixed Lead */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[var(--nc-text-dim)] font-medium">{t("opps.selectLead")}</label>
                    <div className="bg-[var(--nc-surface)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] opacity-75">
                      {leadName || getLeadName(fixedLeadId)}
                    </div>
                  </div>

                  {/* Deal Value */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[var(--nc-text-dim)] font-medium">{t("opps.propertyValue")}</label>
                    <input
                      type="number"
                      placeholder={t("opps.propertyPlaceholder")}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]"
                      required
                    />
                  </div>

                  {/* Probability */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[var(--nc-text-dim)] font-medium">{t("opps.probability")}</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={probability}
                      onChange={(e) => setProbability(e.target.value)}
                      className="w-full accent-[var(--nc-accent)]"
                    />
                    <span className="text-left font-bold text-[var(--nc-foreground)]">{probability}%</span>
                  </div>

                  {/* Unit Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[var(--nc-text-dim)] font-medium">{t("opps.unitIds")}</label>
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]"
                      required
                    >
                      <option value="">{t("opps.unitIdsPlaceholder")}</option>
                      {units.filter(u => u.status !== "Sold").map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.project?.name || ""} — {u.unitNumber} ({u.priceSar.toLocaleString()} {lang === "EN" ? "SAR" : "ر.س"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Close Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[var(--nc-text-dim)] font-medium">{t("opps.expectedClose")}</label>
                    <DateField
                      value={closeDate}
                      onChange={setCloseDate}
                      className="w-full"
                    />
                  </div>

                  {/* AI Optimize */}
                  {aiPrice !== null && (
                    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex justify-between items-center text-indigo-400 font-bold">
                        <span>{t("opps.aiSuggested")}</span>
                        <span className="font-en text-sm text-[var(--nc-foreground)]">{aiPrice.toLocaleString()} ر.س</span>
                      </div>
                      <p className="text-[var(--nc-text-dim)] font-medium leading-relaxed text-xs">{aiRationale}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={btnLoading}
                      className="flex-1 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center disabled:opacity-50"
                    >
                      {btnLoading ? (lang === "EN" ? "Saving..." : "جاري الحفظ...") : t("opps.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); setError(null); }}
                      className="px-3 py-2 border border-[var(--nc-border)] text-[var(--nc-foreground)] rounded font-bold hover:bg-[var(--nc-surface)] transition-all"
                    >
                      {lang === "EN" ? "Cancel" : "إلغاء"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original view for global opportunities page
  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <SmartCard className="p-4">
          <div><h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("opps.createTitle")}</h3>
            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.selectLead")}</label><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="">{t("opps.selectLeadPlaceholder")}</option>{leads.map((l) => (<option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>))}</select></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.propertyValue")}</label><input type="number" placeholder={t("opps.propertyPlaceholder")} value={value} onChange={(e) => setValue(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required /></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.probability")}</label><input type="range" min="10" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} className="w-full accent-[var(--nc-accent)]" /><span className="text-left font-bold text-[var(--nc-foreground)]">{probability}%</span></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.unitIds")}</label><select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]"><option value="">{t("opps.unitIdsPlaceholder")}</option>{units.filter(u => u.status !== "Sold").map((u) => (<option key={u.id} value={u.id}>{u.project?.name || ""} — {u.unitNumber} ({u.priceSar.toLocaleString()} {lang === "EN" ? "SAR" : "ر.س"})</option>))}</select></div>
              <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("opps.expectedClose")}</label><DateField value={closeDate} onChange={setCloseDate} /></div>
              <div className="pt-2 flex gap-2"><button type="submit" disabled={btnLoading} className="flex-1 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{t("opps.save")}</button><button type="button" onClick={optimizeOfferPrice} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold px-3 py-2 transition-all">{t("opps.aiOptimize")}</button></div>
            </form>
          </div>
          {aiPrice !== null && (<div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 mt-4 text-xs space-y-2"><div className="flex justify-between items-center text-indigo-400 font-bold"><span>{t("opps.aiSuggested")}</span><span className="font-en text-sm text-[var(--nc-foreground)]">{aiPrice.toLocaleString()} ر.س</span></div><p className="text-[var(--nc-text-dim)] font-medium leading-relaxed text-xs">{aiRationale}</p></div>)}
        </SmartCard>
        <SmartCard className="lg:col-span-2 p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("opps.listTitle")}</h3>
          {loading ? (
            <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("opps.loading")}</div>
          ) : (
            <DataTable
              columns={columns}
              data={opportunities}
              emptyMessage={t("opps.noData")}
              pageSize={15}
            />
          )}
        </SmartCard>
      </div>
    </div>
  );
}
