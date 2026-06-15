// components/views/tabs/Tours.tsx
"use client";
import { useState, useEffect } from 'react';
import { SmartCard } from "@/components/ui/SmartCard";
import { BoundedCardList } from "@/components/ui/BoundedCardList";
import { StatusCell } from "@/components/ui/orca-table/cells/StatusCell";
import { DateCell } from "@/components/ui/orca-table/cells/DateCell";
import { RelationCell } from "@/components/ui/orca-table/cells/RelationCell";
import { useApp } from '@/app/context/AppContext';

type Tour = { id: string; leadId: string | null; assignedTo: string | null; startAt: string; endAt: string; location: string; status: string; attendees: number | null; notes: string | null; };
type Lead = { id: string; firstName: string; lastName: string | null; };

const TOUR_STATUS_MAP: Record<string, string> = {
  SCHEDULED: 'مجدول', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
};

function formatTourStatus(s?: string | null): string {
  if (!s) return '—';
  return TOUR_STATUS_MAP[s] || s;
}

export default function Tours() {
  const { t, lang } = useApp();
  const [tours, setTours] = useState<Tour[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true); const [btnLoading, setBtnLoading] = useState(false);
  const [leadId, setLeadId] = useState(""); const [location, setLocation] = useState(""); const [startAt, setStartAt] = useState(""); const [attendees, setAttendees] = useState("");

  const loadData = async () => { try { setLoading(true); const [toursRes, leadsRes] = await Promise.all([fetch("/api/v1/tours"), fetch("/api/v1/leads")]); const toursJson = await toursRes.json(); const leadsJson = await leadsRes.json(); if (toursJson.success) setTours(toursJson.data); if (leadsJson.success) setLeads(leadsJson.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadData(); }, []);

  const handleCreateTour = async (e: React.FormEvent) => { e.preventDefault(); if (!leadId || !location || !startAt) return; try { setBtnLoading(true); await fetch("/api/v1/tours", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, location, startAt, attendees }) }); setLeadId(""); setLocation(""); setStartAt(""); setAttendees(""); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const handleUpdateStatus = async (tourId: string, status: string) => { try { setBtnLoading(true); await fetch(`/api/v1/tours/${tourId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); loadData(); } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const getLeadName = (lid: string | null) => { if (!lid) return null; const lead = leads.find(l => l.id === lid); return lead ? `${lead.firstName} ${lead.lastName || ""}`.trim() : null; };

  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <SmartCard className="p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("tours.createTitle")}</h3>
          <form onSubmit={handleCreateTour} className="space-y-4 text-xs">
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tours.selectLead")}</label><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="">{t("tours.selectLeadPlaceholder")}</option>{leads.map((l) => (<option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>))}</select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tours.location")}</label><select value={location} onChange={(e) => setLocation(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required><option value="مشروع النرجس السكني">مشروع النرجس السكني</option><option value="برج أوركا الياسمين">برج أوركا الياسمين</option><option value="مشروع أبراج مكة الإدارية">مشروع أبراج مكة الإدارية</option><option value="جولة افتراضية">جولة افتراضية</option></select></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tours.startAt")}</label><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] font-en" required /></div>
            <div className="flex flex-col gap-1"><label className="text-[var(--nc-text-dim)] font-medium">{t("tours.attendees")}</label><input type="number" placeholder={t("tours.attendeesPlaceholder")} value={attendees} onChange={(e) => setAttendees(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] font-en" /></div>
            <button type="submit" disabled={btnLoading} className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{t("tours.save")}</button>
          </form>
        </SmartCard>
        <SmartCard className="lg:col-span-2 p-4">
          <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("tours.listTitle")}</h3>
          {loading ? (<div className="py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("tours.loading")}</div>) : (
            <BoundedCardList pageSize={15} emptyMessage={t("tours.noData")}>
              {tours.map((tour) => (
                <div key={tour.id} className="p-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-xl hover:border-[var(--nc-accent-border)]/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--nc-foreground)] font-bold"><RelationCell name={getLeadName(tour.leadId)} /></span>
                      <StatusCell status={tour.status} format={formatTourStatus}
                        activeClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        badgeClass={tour.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : tour.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : undefined} />
                    </div>
                    <p className="text-slate-450">{t("tours.location")} <span className="text-[var(--nc-foreground)] font-semibold">{tour.location}</span></p>
                    <p className="text-slate-450 font-en"><DateCell value={tour.startAt} /></p>
                  </div>
                  {tour.status === "SCHEDULED" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(tour.id, "COMPLETED")} disabled={btnLoading} className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded text-xs transition-colors font-bold">{t("tours.complete")}</button>
                      <button onClick={() => handleUpdateStatus(tour.id, "CANCELLED")} disabled={btnLoading} className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 px-3.5 py-1 rounded text-xs transition-colors font-bold">{t("tours.cancel")}</button>
                    </div>
                  )}
                </div>
              ))}
            </BoundedCardList>
          )}
        </SmartCard>
      </div>
    </div>
  );
}
