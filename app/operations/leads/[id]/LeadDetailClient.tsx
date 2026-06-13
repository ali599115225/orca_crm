"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailAction } from "@/app/actions/email";
import { toast } from "@/app/context/ToastContext";

interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  status: string;
  direction: string;
  createdAt: string;
  sentAt: string | null;
  errorMessage: string | null;
}

interface LeadActivity {
  id: string;
  activityType: string;
  description: string;
  createdAt: string;
  user?: { name: string } | null;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  city: string;
  status: string;
  source: string;
  leadScore: number;
  createdAt: string;
  assignedUser?: { id: string; name: string; email: string } | null;
  project?: { id: string; name: string } | null;
  emailMessages: EmailMessage[];
  leadActivities: LeadActivity[];
}

export default function LeadDetailClient({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "email" | "activity">("info");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState(lead.email || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailTo || !emailSubject || !emailBody) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSending(true);

    const formData = new FormData();
    formData.append("to", emailTo);
    formData.append("subject", emailSubject);
    formData.append("htmlBody", emailBody);
    formData.append("leadId", lead.id);

    const result = await sendEmailAction(formData);
    setIsSending(false);

    if (result.success) {
      toast.success("تم إرسال البريد بنجاح");
      setShowEmailModal(false);
      setEmailSubject("");
      setEmailBody("");
      router.refresh();
    } else {
      toast.error(result.error || "فشل إرسال البريد");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      DRAFT: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getLeadStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-800",
      CONTACTED: "bg-purple-100 text-purple-800",
      VISIT_SCHEDULED: "bg-indigo-100 text-indigo-800",
      VISITED: "bg-cyan-100 text-cyan-800",
      OFFER_MADE: "bg-orange-100 text-orange-800",
      RESERVED: "bg-amber-100 text-amber-800",
      CONTRACT_SIGNED: "bg-emerald-100 text-emerald-800",
      WON: "bg-green-100 text-green-800",
      LOST: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/operations/leads")}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            ← العودة للعملاء
          </button>
          <h1 className="text-2xl font-bold">
            {lead.firstName} {lead.lastName || ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lead.phone} {lead.email ? `• ${lead.email}` : ""}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeadStatusBadge(lead.status)}`}>
          {lead.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "info"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            المعلومات
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "email"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            البريد ({lead.emailMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "activity"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            النشاط ({lead.leadActivities.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">المعلومات الأساسية</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">الاسم:</span>{" "}
                  <span className="font-medium">{lead.firstName} {lead.lastName || ""}</span>
                </div>
                <div>
                  <span className="text-gray-500">الهاتف:</span>{" "}
                  <span className="font-medium">{lead.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">البريد:</span>{" "}
                  <span className="font-medium">{lead.email || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">المدينة:</span>{" "}
                  <span className="font-medium">{lead.city}</span>
                </div>
                <div>
                  <span className="text-gray-500">المصدر:</span>{" "}
                  <span className="font-medium">{lead.source}</span>
                </div>
                <div>
                  <span className="text-gray-500">التقييم:</span>{" "}
                  <span className="font-medium">{lead.leadScore}/100</span>
                </div>
                <div>
                  <span className="text-gray-500">تاريخ الإنشاء:</span>{" "}
                  <span className="font-medium">{new Date(lead.createdAt).toLocaleDateString("ar-SA")}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">التعيينات</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">المستشار:</span>{" "}
                  <span className="font-medium">{lead.assignedUser?.name || "غير معين"}</span>
                </div>
                {lead.assignedUser && (
                  <div>
                    <span className="text-gray-500">بريد المستشار:</span>{" "}
                    <span className="font-medium">{lead.assignedUser.email}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">المشروع:</span>{" "}
                  <span className="font-medium">{lead.project?.name || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === "email" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">سجل البريد</h3>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                إرسال بريد
              </button>
            </div>

            {lead.emailMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                لا توجد رسائل بريد مسجلة لهذا العميل
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="nc-table">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">الاتجاه</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">إلى</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">الموضوع</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.emailMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(msg.sentAt || msg.createdAt).toLocaleString("ar-SA", { hour12: false })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={msg.direction === "outbound" ? "text-blue-600" : "text-green-600"}>
                            {msg.direction === "outbound" ? "صادر" : "وارد"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{msg.to}</td>
                        <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{msg.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(msg.status)}`}>
                            {msg.status}
                          </span>
                          {msg.status === "FAILED" && msg.errorMessage && (
                            <span className="ml-2 text-xs text-red-600" title={msg.errorMessage}>
                              ⚠️
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">سجل النشاط</h3>
            {lead.leadActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                لا توجد أنشطة مسجلة لهذا العميل
              </div>
            ) : (
              <div className="space-y-3">
                {lead.leadActivities.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {activity.activityType}
                          </span>
                          {activity.user && (
                            <span className="text-xs text-gray-500">بواسطة {activity.user.name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mt-2">{activity.description}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString("ar-SA", { hour12: false })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">إرسال بريد للعميل</h2>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {!lead.email && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ هذا العميل ليس لديه بريد إلكتروني مسجل. يمكنك إدخال بريد يدويًا.
                </div>
              )}

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">إلى *</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="recipient@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">الموضوع *</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="موضوع البريد"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">محتوى البريد (HTML) *</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    required
                    rows={8}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="<p>مرحباً،</p><p>هذا بريد من ORCA CRM.</p>"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? "جاري الإرسال..." : "إرسال البريد"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    إلغاء
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
