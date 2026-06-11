// app/operations/email/EmailClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { sendEmailAction, getEmailMessagesAction } from "@/app/actions/email";
import toast from "react-hot-toast";

interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  lead?: { firstName: string; lastName: string | null } | null;
  user?: { name: string } | null;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface EmailClientProps {
  initialMessages: EmailMessage[];
  leads: Lead[];
  emailFrom: string;
}

export default function EmailClient({ initialMessages, leads, emailFrom }: EmailClientProps) {
  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [leadId, setLeadId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function refresh() {
      const result = await getEmailMessagesAction(50);
      if (result.success) {
        const mapped = result.messages.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          sentAt: m.sentAt?.toISOString() || null,
          lead: m.lead ? { firstName: m.lead.firstName, lastName: m.lead.lastName || null } : null,
        }));
        setMessages(mapped);
      }
    }
    refresh();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject) {
      toast.error("الحقول المطلوبة: إلى، الموضوع");
      return;
    }

    setIsSending(true);
    const formData = new FormData();
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("htmlBody", htmlBody);
    if (leadId) formData.append("leadId", leadId);

    const result = await sendEmailAction(formData);
    setIsSending(false);

    if (result.success) {
      toast.success(`تم إرسال البريد بنجاح — ${result.emailId?.slice(0, 8)}`);
      setTo("");
      setSubject("");
      setHtmlBody("");
      setLeadId("");

      // Refresh messages
      const refreshResult = await getEmailMessagesAction(50);
      if (refreshResult.success) {
        const mapped = refreshResult.messages.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          sentAt: m.sentAt?.toISOString() || null,
          lead: m.lead ? { firstName: m.lead.firstName, lastName: m.lead.lastName || null } : null,
        }));
        setMessages(mapped);
      }
    } else {
      toast.error(result.error || "فشل إرسال البريد");
    }
  }

  function handleLeadSelect(leadIdValue: string) {
    setLeadId(leadIdValue);
    const lead = leads.find(l => l.id === leadIdValue);
    if (lead?.email) {
      setTo(lead.email);
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      SENT: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      DRAFT: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">البريد الإلكتروني</h1>
        <p className="text-sm text-gray-500 mt-1">
          إرسال بريد من ORCA — المرسل: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{emailFrom}</code>
        </p>
      </div>

      {/* Send Form */}
      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-4">إرسال بريد جديد</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ربط بعميل (اختياري)</label>
              <select
                value={leadId}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- اختر عميلاً --</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.firstName} {l.lastName || ""} {l.email ? `(${l.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى *</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الموضوع *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="موضوع البريد"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">محتوى البريد (HTML)</label>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="<p>مرحباً،</p><p>هذا بريد تجريبي من ORCA CRM.</p>"
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isSending || !to || !subject}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? "جاري الإرسال..." : "إرسال البريد"}
          </button>
        </form>
      </section>

      {/* Messages List */}
      <section className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">آخر الرسائل المرسلة ({messages.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">إلى</th>
                <th className="px-3 py-2 text-left">الموضوع</th>
                <th className="px-3 py-2 text-left">الحالة</th>
                <th className="px-3 py-2 text-left">العميل</th>
                <th className="px-3 py-2 text-left">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    لا توجد رسائل بعد
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2">{m.to}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{m.subject}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(m.status)}`}>
                        {m.status}
                      </span>
                      {m.status === "FAILED" && m.errorMessage && (
                        <span className="ml-2 text-xs text-red-600" title={m.errorMessage}>
                          ⚠️
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.lead ? `${m.lead.firstName} ${m.lead.lastName || ""}` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(m.createdAt).toLocaleString("ar-SA", { hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
