// components/views/tabs/Offers.tsx
"use client";
import { useState, useEffect } from 'react';
import { SmartCard } from "@/components/ui/SmartCard";
import { BoundedCardList } from "@/components/ui/BoundedCardList";
import { StatusCell } from "@/components/ui/orca-table/cells/StatusCell";
import { MoneyCell } from "@/components/ui/orca-table/cells/MoneyCell";
import { DateCell } from "@/components/ui/orca-table/cells/DateCell";
import { RelationCell } from "@/components/ui/orca-table/cells/RelationCell";
import { formatOfferStatus } from '@/lib/ui-status';
import { useApp } from '@/app/context/AppContext';

type Offer = { id: string; linkedOpportunityId: string; price: number; validUntil: string; status: string; documentUrl: string | null; };
type Opportunity = { id: string; leadId: string; value: number; };
type Lead = { id: string; firstName: string; lastName: string | null; };

export default function Offers() {
  const { t, lang } = useApp();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [oppId, setOppId] = useState(""); const [price, setPrice] = useState(""); const [validUntil, setValidUntil] = useState("");

  const loadData = async () => { try { setLoading(true); const [offersRes, oppsRes, leadsRes] = await Promise.all([fetch("/api/v1/offers"), fetch("/api/v1/opportunities"), fetch("/api/v1/leads")]); const offersJson = await offersRes.json(); const oppsJson = await oppsRes.json(); const leadsJson = await leadsRes.json(); if (offersJson.success) setOffers(offersJson.data); if (oppsJson.success) setOpportunities(oppsJson.data); if (leadsJson.success) setLeads(leadsJson.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, []);

  const handleCreateOffer = async (e: React.FormEvent) => { e.preventDefault(); if (!oppId || !price || !validUntil) return; try { setBtnLoading(true); await fetch("/api/v1/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkedOpportunityId: oppId, price, validUntil }) }); setOppId(""); setPrice(""); setValidUntil(""); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const handleAcceptOffer = async (offerId: string) => { try { setBtnLoading(true); await fetch(`/api/v1/offers/${offerId}/accept`, { method: "POST", headers: { "Content-Type": "application/json" } }); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const getOpportunityLeadName = (oId: string) => { const opp = opportunities.find(o => o.id === oId); if (!opp) return null; const lead = leads.find(l => l.id === opp.leadId); return lead ? `${lead.firstName} ${lead.lastName || ""}`.trim() : null; };

  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("offers.createTitle")}</h3>
          <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("offers.selectOpp")}</label><select value={oppId} onChange={(e) => setOppId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="">{t("offers.selectOppPlaceholder")}</option>{opportunities.map((opp) => (<option key={opp.id} value={opp.id}>{t("offers.dealValue")} {Number(opp.value).toLocaleString()} ر.س ({getOpportunityLeadName(opp.id)})</option>))}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("offers.price")}</label><input type="number" placeholder={t("offers.pricePlaceholder")} value={price} onChange={(e) => setPrice(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("offers.validUntil")}</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] font-en" required /></div>
            <button type="submit" disabled={btnLoading} className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{btnLoading ? t("offers.saving") : t("offers.save")}</button>
          </form>
        </SmartCard>
        <SmartCard className="lg:col-span-2 p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("offers.listTitle")}</h3>
          {loading ? (
            <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("offers.loading")}</div>
          ) : (
            <BoundedCardList pageSize={15} emptyMessage={t("offers.noData")}>
              {offers.map((offer) => (
                <div key={offer.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl hover:border-[var(--nc-accent-border)]/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--nc-foreground)] font-bold"><RelationCell name={getOpportunityLeadName(offer.linkedOpportunityId)} /></span>
                      <StatusCell status={offer.status} format={formatOfferStatus}
                        activeClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        badgeClass={offer.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : undefined} />
                    </div>
                    <p className="text-slate-450">{t("offers.negotiationPrice")} <MoneyCell amount={offer.price} lang={lang} /></p>
                    <p className="text-slate-450 font-en">{t("offers.validityLabel")} <DateCell value={offer.validUntil} /></p>
                    {offer.documentUrl && (<a href={offer.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline font-semibold block text-xs mt-1 font-en">{t("offers.viewPDF")}</a>)}
                  </div>
                  {offer.status === "PENDING" && (<button onClick={() => handleAcceptOffer(offer.id)} disabled={btnLoading} className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded text-xs transition-colors font-bold">{t("offers.accept")}</button>)}
                </div>
              ))}
            </BoundedCardList>
          )}
        </SmartCard>
      </div>
    </div>
  );
}
