// app/operations/email/EmailClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { sendEmailAction, getEmailMessagesAction } from "@/app/actions/email";
import { useApp } from "@/app/context/AppContext";
import { useSearchParams } from "next/navigation";
import { SmartCard } from "@/components/ui/SmartCard";

interface EmailMessage {
  id: string; to: string; subject: string; status: string;
  providerMessageId: string | null; errorMessage: string | null;
  createdAt: string; sentAt: string | null;
  lead?: { firstName: string; lastName: string | null } | null;
}
interface Lead { id: string; firstName: string; lastName: string; email: string | null; }
interface EmailClientProps { initialMessages: EmailMessage[]; leads: Lead[]; emailFrom: string; }

export default function EmailClient({ initialMessages, leads, emailFrom }: EmailClientProps) {
  const { t, lang } = useApp();
  const searchParams = useSearchParams();
  const isRTL = lang === 'AR';

  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [to, setTo] = useState(searchParams.get('email') || "");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [leadId, setLeadId] = useState(searchParams.get('leadId') || "");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const leadParam = searchParams.get('leadId');
    const emailParam = searchParams.get('email');
    if (leadParam) setLeadId(leadParam);
    if (emailParam) setTo(emailParam);
  }, [searchParams]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject) return;
    setIsSending(true);
    const formData = new FormData();
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("htmlBody", htmlBody);
    if (leadId) formData.append("leadId", leadId);
    const result = await sendEmailAction(formData);
    setIsSending(false);
    if (result.success) {
      setTo(""); setSubject(""); setHtmlBody(""); setLeadId("");
      const refreshResult = await getEmailMessagesAction(50);
      if (refreshResult.success) {
        setMessages(refreshResult.messages.map(m => ({
          ...m, createdAt: m.createdAt.toISOString(), sentAt: m.sentAt?.toISOString() || null,
          lead: m.lead ? { firstName: m.lead.firstName, lastName: m.lead.lastName || null } : null,
        })));
      }
    }
  }

  function getStatusKey(status: string): string {
    const map: Record<string, string> = { SENT: 'status.sent', FAILED: 'status.failed', PENDING: 'status.pending', DRAFT: 'status.draft' };
    return map[status] || status;
  }

  return (
    <div className="nc-stack" dir={isRTL ? 'rtl' : 'ltr'} style={{ padding: '16px 24px 40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div>
        <h1 className="nc-heading-1">{t('tab.email')}</h1>
        <p className="text-[var(--nc-text-dim)] text-sm mt-1">{isRTL ? 'إرسال وإدارة البريد الإلكتروني من ORCA' : 'Send and manage emails from ORCA'}</p>
      </div>

      <SmartCard elevation="default" className="p-5">
        <h3 className="text-sm font-bold text-[var(--nc-foreground)] mb-4">{isRTL ? 'إرسال بريد جديد' : 'Send New Email'}</h3>
        <form onSubmit={handleSend} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">{isRTL ? 'ربط بعميل (اختياري)' : 'Link to Lead (optional)'}</label>
              <select value={leadId} onChange={e => { setLeadId(e.target.value); const l = leads.find(ll => ll.id === e.target.value); if (l?.email) setTo(l.email); }}
                className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]">
                <option value="">{isRTL ? '-- اختر عميلاً --' : '-- Select lead --'}</option>
                {leads.map(l => (<option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}{l.email ? ` (${l.email})` : ""}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[var(--nc-text-dim)] font-medium">{isRTL ? 'إلى *' : 'To *'}</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)} required dir="ltr"
                className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[var(--nc-text-dim)] font-medium">{isRTL ? 'الموضوع *' : 'Subject *'}</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
              className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg px-3 py-2 text-[var(--nc-foreground)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[var(--nc-text-dim)] font-medium">{isRTL ? 'محتوى البريد (HTML)' : 'Email Content (HTML)'}</label>
            <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} rows={5}
              className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-lg p-3 text-[var(--nc-foreground)] font-mono" />
          </div>
          <button type="submit" disabled={isSending || !to || !subject}
            className="nc-btn nc-btn-primary text-xs cursor-pointer min-h-[44px]">
            {isSending ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'إرسال البريد' : 'Send Email')}
          </button>
        </form>
      </SmartCard>

      <SmartCard elevation="default" className="p-5">
        <h3 className="text-sm font-bold text-[var(--nc-foreground)] mb-4">{isRTL ? `آخر الرسائل (${messages.length})` : `Recent Messages (${messages.length})`}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-bold">
                <th className="py-2 px-2 text-left">{isRTL ? 'إلى' : 'To'}</th>
                <th className="py-2 px-2 text-left">{isRTL ? 'الموضوع' : 'Subject'}</th>
                <th className="py-2 px-2 text-left">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="py-2 px-2 text-left">{isRTL ? 'العميل' : 'Lead'}</th>
                <th className="py-2 px-2 text-left">{isRTL ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nc-glass-border)]">
              {messages.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--nc-text-dim)]">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</td></tr>
              ) : messages.map(m => (
                <tr key={m.id} className="hover:bg-[var(--nc-surface-strong)] transition-colors">
                  <td className="py-2.5 px-2 text-[var(--nc-foreground)]">{m.to}</td>
                  <td className="py-2.5 px-2 text-[var(--nc-text-dim)] max-w-[200px] truncate">{m.subject}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' : m.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {t(getStatusKey(m.status))}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-[var(--nc-text-dim)]">{m.lead ? `${m.lead.firstName} ${m.lead.lastName || ""}` : "—"}</td>
                  <td className="py-2.5 px-2 text-[var(--nc-text-dim)] font-mono text-[10px]">
                    {new Date(m.createdAt).toLocaleDateString(lang === 'AR' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SmartCard>
    </div>
  );
}
