// components/views/tabs/Contacts.tsx
"use client";
import { useState, useEffect } from 'react';
import { SmartCard } from '@/components/ui/SmartCard';
import { useApp } from '@/app/context/AppContext';

type Contact = { id: string; name: string; phone: string; email: string | null; preferredContactTime: string | null; budgetRange: string | null; notes: string | null; createdAt: string; };

export default function Contacts() {
  const { t } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [prefTime, setPrefTime] = useState(""); const [budget, setBudget] = useState(""); const [leadNotes, setLeadNotes] = useState("");

  const loadContacts = async () => { try { setLoading(true); const res = await fetch("/api/v1/contacts"); const json = await res.json(); if (json.success) setContacts(json.data); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { loadContacts(); }, []);

  const handleCreateContact = async (e: React.FormEvent) => { e.preventDefault(); if (!name || !phone) return; try { setBtnLoading(true); const res = await fetch("/api/v1/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, email, preferredContactTime: prefTime, budgetRange: budget, notes: leadNotes }) }); const json = await res.json(); if (json.success) { setName(""); setPhone(""); setEmail(""); setPrefTime(""); setBudget(""); setLeadNotes(""); loadContacts(); } } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const handleAddNote = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedContact || !newNote) return; try { setBtnLoading(true); const res = await fetch(`/api/v1/contacts/${selectedContact.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: newNote }) }); const json = await res.json(); if (json.success) { setNewNote(""); setSelectedContact(json.data); loadContacts(); } } catch (err) { console.error(err); } finally { setBtnLoading(false); } };
  const getTimelineItems = (notesText: string | null) => notesText ? notesText.split("\n").filter(Boolean) : [];

  return (
    <div className="tab-pane space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SmartCard className="p-4">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("contacts.createTitle")}</h3>
            <form onSubmit={handleCreateContact} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <input placeholder={t("contacts.fullName")} value={name} onChange={(e) => setName(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required />
              <input placeholder={t("contacts.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" required />
              <input placeholder={t("contacts.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" />
              <input placeholder={t("contacts.prefTime")} value={prefTime} onChange={(e) => setPrefTime(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" />
              <input placeholder={t("contacts.budget")} value={budget} onChange={(e) => setBudget(e.target.value)} className="bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)]" />
              <button type="submit" disabled={btnLoading} className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold transition-all px-3 py-2">{btnLoading ? t("contacts.saving") : t("contacts.save")}</button>
            </form>
          </SmartCard>
          <SmartCard className="p-4">
            <h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4">{t("contacts.directory")}</h3>
            {loading ? (<div className="py-8 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("contacts.loading")}</div>) : contacts.length === 0 ? (<div className="py-8 text-center text-[var(--nc-text-dim)] font-medium text-xs">{t("contacts.noContacts")}</div>) : (
              <div className="overflow-x-auto"><table className="w-full text-right border-collapse text-xs"><thead><tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-medium font-semibold"><th className="py-2 px-1">{t("contacts.tableName")}</th><th className="py-2 px-1">{t("contacts.tablePhone")}</th><th className="py-2 px-1">{t("contacts.tableBudget")}</th><th className="py-2 px-1">{t("contacts.tableEmail")}</th><th className="py-2 px-1">{t("contacts.tableAction")}</th></tr></thead><tbody className="divide-y divide-slate-800/60 text-slate-200">{contacts.map((c) => (<tr key={c.id} className="hover:bg-[var(--nc-surface-strong)] transition-colors"><td className="py-2 px-1 font-bold text-[var(--nc-foreground)]">{c.name}</td><td className="py-2 px-1 font-en">{c.phone}</td><td className="py-2 px-1">{c.budgetRange || "—"}</td><td className="py-2 px-1 font-en">{c.email || "—"}</td><td className="py-2 px-1"><button onClick={() => setSelectedContact(c)} className="bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/35 text-[#0ea5e9] px-2.5 py-1 rounded">{t("contacts.viewHistory")}</button></td></tr>))}</tbody></table></div>
            )}
          </SmartCard>
        </div>
        <div className="space-y-6">
          <SmartCard className="p-4 min-h-[400px] flex flex-col justify-between">
            <div><h3 className="text-[var(--nc-foreground)] font-bold text-sm mb-4 pb-2 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>{t("contacts.timeline")}</span></h3>
              {selectedContact ? (<div className="space-y-4"><div className="text-xs"><p className="text-[var(--nc-foreground)] font-bold text-sm mb-1">{selectedContact.name}</p><p className="text-[var(--nc-text-dim)] font-medium font-en">{selectedContact.phone}</p>{selectedContact.preferredContactTime && (<p className="text-[var(--nc-text-dim)] font-medium mt-1">{t("contacts.prefTimeLabel")} <span className="text-[var(--nc-foreground)]">{selectedContact.preferredContactTime}</span></p>)}</div><div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">{getTimelineItems(selectedContact.notes).map((item, idx) => (<div key={idx} className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] p-2.5 rounded-xl text-xs text-[var(--nc-text-dim)] font-medium leading-relaxed shadow-sm">{item}</div>))}{getTimelineItems(selectedContact.notes).length === 0 && (<div className="text-center py-6 text-[var(--nc-text-dim)] font-medium text-xs">{t("contacts.noTimeline")}</div>)}</div></div>) : (<div className="flex flex-col items-center justify-center py-16 text-center text-[var(--nc-text-dim)] font-medium"><i className="ph ph-chat-circle-dots text-3xl mb-2 text-[var(--nc-text-dim)] font-medium"></i><p className="text-xs">{t("contacts.selectHint")}</p></div>)}</div>
            {selectedContact && (<form onSubmit={handleAddNote} className="border-t border-[var(--nc-border)] pt-4 mt-4 text-xs space-y-2"><textarea placeholder={t("contacts.notePlaceholder")} value={newNote} onChange={(e) => setNewNote(e.target.value)} className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-lg p-2 text-[var(--nc-foreground)] h-16 resize-none" required /><div className="flex gap-2"><button type="submit" disabled={btnLoading} className="flex-1 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded font-bold px-3 py-2 transition-all text-center">{t("contacts.addNote")}</button><button type="button" className="bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/35 text-[#0ea5e9] rounded px-3 py-2 text-center font-bold">{t("contacts.uploadDoc")}</button></div></form>)}
          </SmartCard>
        </div>
      </div>
    </div>
  );
}
