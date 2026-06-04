// components/views/tabs/Opportunities.tsx
"use client";

import { useState, useEffect } from "react";

type Opportunity = {
  id: string;
  leadId: string;
  value: number;
  probability: number;
  closeDate: string;
  status: string;
  linkedUnitIds: string | null;
};

type Lead = {
  id: string;
  firstName: string;
  lastName: string | null;
};

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Form states
  const [leadId, setLeadId] = useState("");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("50");
  const [closeDate, setCloseDate] = useState("");
  const [unitIds, setUnitIds] = useState("");

  // AI Optimizer States
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [aiRationale, setAiRationale] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppRes, leadRes] = await Promise.all([
        fetch("/api/v1/opportunities"),
        fetch("/api/v1/leads"),
      ]);
      const oppJson = await oppRes.json();
      const leadJson = await leadRes.json();

      if (oppJson.success) setOpportunities(oppJson.data);
      if (leadJson.success) setLeads(leadJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !value) return;

    try {
      setBtnLoading(true);
      const res = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          value,
          probability,
          closeDate,
          linkedUnitIds: unitIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLeadId("");
        setValue("");
        setProbability("50");
        setCloseDate("");
        setUnitIds("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const optimizeOfferPrice = async () => {
    if (!value) return;
    try {
      setBtnLoading(true);
      const res = await fetch("/api/v1/ai/offer-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: value, probability }),
      });
      const json = await res.json();
      if (json.success) {
        setAiPrice(json.suggestedPrice);
        setAiRationale(json.rationaleAr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBtnLoading(false);
    }
  };

  const getLeadName = (lid: string) => {
    const l = leads.find(lead => lead.id === lid);
    return l ? `${l.firstName} ${l.lastName || ""}`.trim() : "عميل غير معروف";
  };

  return (
    <div className="tab-pane bg-[#021324] border border-[#0ea5e9]/10 p-5 rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Creation Form */}
        <div className="bg-[#042A44]/40 border border-[#0ea5e9]/5 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-white font-bold text-sm mb-4">إنشاء فرصة صفقة جديدة (Create Opportunity)</h3>
            <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">اختر العميل المحتمل *</label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="bg-[#042A44] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  required
                >
                  <option value="">-- اختر العميل --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">قيمة العقار المتوقعة (SAR) *</label>
                <input
                  type="number"
                  placeholder="مثال: 750000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="bg-[#042A44] border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">احتمالية إغلاق الصفقة (٪)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  className="w-full accent-[#df7b62]"
                />
                <span className="text-left font-en font-bold text-white">{probability}%</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">الوحدات المرتبطة (Unit IDs)</label>
                <input
                  placeholder="أدخل معرفات الوحدات مفصولة بفاصلة"
                  value={unitIds}
                  onChange={(e) => setUnitIds(e.target.value)}
                  className="bg-[#042A44] border border-slate-700 rounded px-2.5 py-1.5 text-white animate-pulse"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">تاريخ الإغلاق المتوقع</label>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="bg-[#042A44] border border-slate-700 rounded px-2.5 py-1.5 text-white font-en"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={btnLoading}
                  className="flex-1 bg-[#df7b62] hover:bg-[#c5654e] text-white rounded font-bold px-3 py-1.5 transition-all text-center"
                >
                  حفظ الفرصة
                </button>
                <button
                  type="button"
                  onClick={optimizeOfferPrice}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold px-3 py-1.5 transition-all"
                >
                  تحسين السعر (AI)
                </button>
              </div>
            </form>
          </div>

          {/* AI Pricing rationale output */}
          {aiPrice !== null && (
            <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 mt-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-indigo-400 font-bold">
                <span>سعر العرض المقترح (AI)</span>
                <span className="font-en text-sm text-white">{aiPrice.toLocaleString()} ر.س</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">{aiRationale}</p>
            </div>
          )}
        </div>

        {/* Opportunities List Table */}
        <div className="lg:col-span-2 bg-[#042A44]/40 border border-[#0ea5e9]/5 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">الصفقات والفرص النشطة (Opportunities List)</h3>
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل الصفقات...</div>
          ) : opportunities.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">لا توجد فرص صفقات مسجلة حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2 px-1">العميل</th>
                    <th className="py-2 px-1">القيمة المقدرة</th>
                    <th className="py-2 px-1 text-center">الاحتمالية</th>
                    <th className="py-2 px-1">تاريخ الإغلاق</th>
                    <th className="py-2 px-1">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-[#042A44]/60 transition-colors">
                      <td className="py-2.5 px-1 font-bold text-white">{getLeadName(opp.leadId)}</td>
                      <td className="py-2.5 px-1 font-en">{Number(opp.value).toLocaleString()} ر.س</td>
                      <td className="py-2.5 px-1 text-center">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-en">
                          {opp.probability}%
                        </span>
                      </td>
                      <td className="py-2.5 px-1 font-en">{opp.closeDate.slice(0, 10)}</td>
                      <td className="py-2.5 px-1">
                        <span className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 px-2 py-0.5 rounded">
                          {opp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
