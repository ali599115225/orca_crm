// components/views/tabs/Offers.tsx
"use client";

import { useState, useEffect } from "react";

type Offer = {
  id: string;
  linkedOpportunityId: string;
  price: number;
  validUntil: string;
  status: string;
  documentUrl: string | null;
};

type Opportunity = {
  id: string;
  leadId: string;
  value: number;
};

type Lead = {
  id: string;
  firstName: string;
  lastName: string | null;
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Form states
  const [oppId, setOppId] = useState("");
  const [price, setPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [offersRes, oppsRes, leadsRes] = await Promise.all([
        fetch("/api/v1/offers"),
        fetch("/api/v1/opportunities"),
        fetch("/api/v1/leads"),
      ]);
      const offersJson = await offersRes.json();
      const oppsJson = await oppsRes.json();
      const leadsJson = await leadsRes.json();

      if (offersJson.success) setOffers(offersJson.data);
      if (oppsJson.success) setOpportunities(oppsJson.data);
      if (leadsJson.success) setLeads(leadsJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppId || !price || !validUntil) return;

    try {
      setBtnLoading(true);
      const res = await fetch("/api/v1/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedOpportunityId: oppId,
          price,
          validUntil,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOppId("");
        setPrice("");
        setValidUntil("");
        loadData();
        alert("تم إنشاء عرض السعر بنجاح وجاهز للإرسال.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      setBtnLoading(true);
      const res = await fetch(`/api/v1/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        loadData();
        alert("تهانينا! تم قبول العرض بنجاح، وترقية الليد إلى عقد مغلق، وصياغة مسودة العقد تلقائياً في السجل.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const getOpportunityLeadName = (oId: string) => {
    const opp = opportunities.find(o => o.id === oId);
    if (!opp) return "فرصة غير معروفة";
    const lead = leads.find(l => l.id === opp.leadId);
    return lead ? `${lead.firstName} ${lead.lastName || ""}`.trim() : "عميل غير معروف";
  };

  return (
    <div className="tab-pane bg-[#021324] border border-[#0ea5e9]/10 p-6 rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Creation Form */}
        <div className="bg-[var(--nc-surface)] border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-4">إنشاء وتقديم عرض سعر (Send Offer)</h3>
          <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">اختر الصفقة / الفرصة *</label>
              <select
                value={oppId}
                onChange={(e) => setOppId(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              >
                <option value="">-- اختر الفرصة --</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    صفقة بقيمة {Number(opp.value).toLocaleString()} ر.س ({getOpportunityLeadName(opp.id)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">سعر العرض المقدم (SAR) *</label>
              <input
                type="number"
                placeholder="السعر المقترح للمفاوضة"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">تاريخ انتهاء صلاحية العرض *</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-white font-en"
                required
              />
            </div>

            <button
              type="submit"
              disabled={btnLoading}
              className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center"
            >
              {btnLoading ? "جاري الإنشاء..." : "إنشاء العرض"}
            </button>
          </form>
        </div>

        {/* Offers List Panel */}
        <div className="lg:col-span-2 bg-[var(--nc-surface)] border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-4">العروض العقارية وحالاتها (Active Offers)</h3>
          {loading ? (
            <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">جاري تحميل العروض...</div>
          ) : offers.length === 0 ? (
            <div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">لا توجد عروض أسعار مسجلة حالياً.</div>
          ) : (
            <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1 scrollbar-fade">
              {offers.map((offer) => (
                <div key={offer.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl hover:border-[var(--nc-accent-border)]/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{getOpportunityLeadName(offer.linkedOpportunityId)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        offer.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : offer.status === "ACCEPTED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-[var(--nc-text-dim)] font-medium"
                      }`}>
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-slate-450">سعر المفاوضة: <span className="text-white font-semibold font-en">{Number(offer.price).toLocaleString()} ر.س</span></p>
                    <p className="text-slate-450 font-en">صلاحية العرض: <span className="text-indigo-400 font-semibold">{offer.validUntil.slice(0, 10)}</span></p>
                    {offer.documentUrl && (
                      <a href={offer.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline font-semibold block text-xs mt-1 font-en">
                        📄 View Offer Document (PDF)
                      </a>
                    )}
                  </div>

                  {offer.status === "PENDING" && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={btnLoading}
                      className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded text-xs transition-colors font-bold"
                    >
                      موافقة وتوقيع العقد
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
