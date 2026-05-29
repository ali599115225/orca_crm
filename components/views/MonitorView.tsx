// app/operations/support-monitor/MonitorView.tsx
"use client";

import React, { useState } from "react";
import { adminUpdateTicketAction, adminUpdateTenantPlanAction } from "@/app/actions/admin";
import { runAllSystemAgentsAction } from "@/app/actions/errorAgent";
import { runSystemDiagnosticsAction } from "@/app/actions/sentinel";

interface Ticket {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenant: {
    companyName: string;
    subdomain: string;
  };
}

interface Tenant {
  id: string;
  companyName: string;
  subdomain: string;
  subscriptionPlan: string;
  isActive: boolean;
  extraAgents: number;
  whatsappConnected: boolean;
  createdAt: Date;
  _count: {
    users: number;
    projects: number;
    leads: number;
  };
}

interface MonitorViewProps {
  initialTickets: any[];
  initialTenants: any[];
}

export default function MonitorView({ initialTickets, initialTenants }: MonitorViewProps) {
  const [activeTab, setActiveTab] = useState<"tickets" | "tenants" | "agents">("tickets");
  
  // تذاكر الدعم
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [ticketStatus, setTicketStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  
  // الشركات
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantPlan, setTenantPlan] = useState("basic");
  const [tenantActive, setTenantActive] = useState(true);

  // تشغيل وفحص الوكلاء
  const [triggeringAgents, setTriggeringAgents] = useState(false);
  const [agentsReport, setAgentsReport] = useState<any | null>(null);

  // وكيل الصيانة والمراقبة السحابي الجديد
  const [triggeringSentinel, setTriggeringSentinel] = useState(false);
  const [sentinelReport, setSentinelReport] = useState<any | null>(null);

  // حالات التحميل والرسائل
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunSentinel = async () => {
    setTriggeringSentinel(true);
    setSuccess(null);
    setError(null);
    
    try {
      const result = await runSystemDiagnosticsAction();
      setTriggeringSentinel(false);
      if (result.success && result.report) {
        setSuccess("تم تشغيل وكيل الصيانة والمراقبة بنجاح وإرسال تنبيهات الأداء للمشرفين!");
        setSentinelReport(result.report);
      } else {
        setError(result.error || "فشل تشغيل وكيل الصيانة.");
      }
    } catch (err: any) {
      setTriggeringSentinel(false);
      setError(err.message || "حدث خطأ غير متوقع.");
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setEditingTicketId(ticket.id);
    setReplyText(ticket.aiResponse || "");
    setTicketStatus(ticket.status as "OPEN" | "CLOSED");
    setSuccess(null);
    setError(null);
  };

  const handleSaveTicket = async () => {
    if (!editingTicketId) return;
    setLoading(true);
    setSuccess(null);
    setError(null);

    const result = await adminUpdateTicketAction(editingTicketId, ticketStatus, replyText);
    setLoading(false);

    if (result.success) {
      setSuccess("تم تحديث تذكرة الدعم والرد يدوياً بنجاح!");
      setTickets(prev => 
        prev.map(t => t.id === editingTicketId ? { ...t, status: ticketStatus, aiResponse: replyText } : t)
      );
      setEditingTicketId(null);
    } else {
      setError(result.error || "فشل تحديث التذكرة.");
    }
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setTenantPlan(tenant.subscriptionPlan);
    setTenantActive(tenant.isActive);
    setSuccess(null);
    setError(null);
  };

  const handleSaveTenant = async () => {
    if (!editingTenantId) return;
    setLoading(true);
    setSuccess(null);
    setError(null);

    const result = await adminUpdateTenantPlanAction(editingTenantId, tenantPlan, tenantActive);
    setLoading(false);

    if (result.success) {
      setSuccess("تم تحديث خطة اشتراك المنشأة وحالة تنشيطها بنجاح!");
      setTenants(prev => 
        prev.map(t => t.id === editingTenantId ? { ...t, subscriptionPlan: tenantPlan, isActive: tenantActive } : t)
      );
      setEditingTenantId(null);
    } else {
      setError(result.error || "فشل تحديث بيانات المنشأة.");
    }
  };

  const handleRunAllAgents = async () => {
    setTriggeringAgents(true);
    setSuccess(null);
    setError(null);
    
    try {
      const result = await runAllSystemAgentsAction();
      setTriggeringAgents(false);
      if (result.success) {
        setSuccess(result.message);
        setAgentsReport(result.report);
      } else {
        setError(result.error || "فشل تشغيل الوكلاء.");
      }
    } catch (e: any) {
      setTriggeringAgents(false);
      setError(e.message || "حدث خطأ غير متوقع.");
    }
  };

  const planTitles: Record<string, string> = {
    basic: "الباقة الأساسية",
    silver: "الباقة الفضية",
    gold: "الباقة الذهبية",
  };

  return (
    <div className="space-y-6" dir="rtl">
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
        }
      `}} />
      {/* هيدر الصفحة الفخم */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
            صلاحيات الإشراف الفوقي (Super Admin)
          </span>
          <h1 className="text-2xl font-black mt-2">بوابة المراقبة الفوقية لمنصة أوركا CRM</h1>
          <p className="text-slate-400 text-xs mt-1">متابعة كافة طلبات الدعم، تفعيل الاشتراكات، والتحكم بسحابة الشركات العقارية</p>
        </div>

        {/* أزرار التبويبات الفخمة */}
        <div className="flex gap-2 bg-slate-850 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveTab("tickets"); setSuccess(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "tickets" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            تذاكر الدعم والطلبات ({tickets.length})
          </button>
          <button
            onClick={() => { setActiveTab("tenants"); setSuccess(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "tenants" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            الشركات العقارية ({tenants.length})
          </button>
          <button
            onClick={() => { setActiveTab("agents"); setSuccess(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "agents" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            وكلاء الذكاء الاصطناعي والتشغيل ({4})
          </button>
        </div>
      </div>

      {/* التنبيهات والرسائل */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      {/* التبويب الأول: إدارة تذاكر الدعم */}
      {activeTab === "tickets" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* جدول وقائمة التذاكر */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800">سجل التذاكر والاستفسارات العقارية المفتوحة</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] text-slate-500 font-bold border-b">
                    <th className="p-4">الشركة العقارية</th>
                    <th className="p-4">عنوان الاستفسار</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{ticket.tenant.companyName}</div>
                        <div className="text-[9px] text-slate-400" dir="ltr">{ticket.tenant.subdomain}.orca.pro</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{ticket.title}</div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">{ticket.description}</p>
                      </td>
                      <td className="p-4 text-slate-400 text-[10px]">
                        {new Date(ticket.createdAt).toLocaleDateString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                          {ticket.status === 'OPEN' ? 'نشطة / مفتوحة' : 'محلولة / مغلقة'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleSelectTicket(ticket)}
                          className="text-amber-600 hover:text-amber-700 font-bold text-[10px] underline cursor-pointer"
                        >
                          تعديل / رد
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد تذاكر دعم فني مسجلة بالنظام حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* محرر الرد والتحديث للتذكرة المحددة */}
          <div className="xl:col-span-1">
            {editingTicketId ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">تحديث والرد على التذكرة</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">حالة التذكرة</label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value as "OPEN" | "CLOSED")}
                    className="w-full bg-slate-50 border rounded-lg p-2.5 text-xs text-slate-700 font-bold"
                  >
                    <option value="OPEN">مفتوحة (قيد المراجعة)</option>
                    <option value="CLOSED">مغلقة (تم حل المشكلة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الرد التلقائي أو اليدوي</label>
                  <textarea
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg p-2.5 text-xs text-slate-700 font-bold leading-relaxed focus:outline-none"
                    placeholder="اكتب رد الإدارة الفني للعميل هنا..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveTicket}
                    disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 p-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    {loading ? "جاري الحفظ..." : "حفظ التحديثات"}
                  </button>
                  <button
                    onClick={() => setEditingTicketId(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/50 p-8 rounded-2xl border border-dashed text-center text-slate-400 font-bold">
                ⚠️ الرجاء اختيار تذكرة من الجدول لتحديث حالتها أو كتابة رد المشرفين.
              </div>
            )}
          </div>
        </div>
      )}

      {/* التبويب الثاني: إدارة وتعديل باقات الشركات */}
      {activeTab === "tenants" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* جدول إحصائيات الشركات والاشتراكات */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800">بيانات الشركات العقارية المشتركة بالسحابة</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] text-slate-500 font-bold border-b">
                    <th className="p-4">الشركة / النطاق</th>
                    <th className="p-4">خطة الاشتراك</th>
                    <th className="p-4">الوكلاء الإضافيون</th>
                    <th className="p-4">الواتساب</th>
                    <th className="p-4">الإحصائيات</th>
                    <th className="p-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{tenant.companyName}</div>
                        <div className="text-[9px] text-slate-400" dir="ltr">{tenant.subdomain}.orca.az-ez.pro</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{planTitles[tenant.subscriptionPlan] || tenant.subscriptionPlan}</div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black ${tenant.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {tenant.isActive ? 'الحساب نشط' : 'معلق / منتهي'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-900 text-amber-500 px-2 py-0.5 rounded font-black text-[10px]">
                          +{tenant.extraAgents} وكيل
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${tenant.whatsappConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {tenant.whatsappConnected ? 'متصل حياً' : 'غير مرتبط'}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-slate-500">
                        <div>👥 موظفين: {tenant._count.users}</div>
                        <div>📂 مشاريع: {tenant._count.projects}</div>
                        <div>🎯 عملاء: {tenant._count.leads}</div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleSelectTenant(tenant)}
                          className="text-amber-600 hover:text-amber-700 font-bold text-[10px] underline cursor-pointer"
                        >
                          تعديل الباقة / تنشيط
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* محرر باقة المستأجر */}
          <div className="xl:col-span-1">
            {editingTenantId ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">تحديث الباقة والصلاحية</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">باقة المنصة الحالية</label>
                  <select
                    value={tenantPlan}
                    onChange={(e) => setTenantPlan(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg p-2.5 text-xs text-slate-700 font-bold"
                  >
                    <option value="basic">الباقة الأساسية (Basic)</option>
                    <option value="silver">الباقة الفضية (Silver)</option>
                    <option value="gold">الباقة الذهبية (Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">حالة تفعيل السحابة</label>
                  <select
                    value={tenantActive ? "true" : "false"}
                    onChange={(e) => setTenantActive(e.target.value === "true")}
                    className="w-full bg-slate-50 border rounded-lg p-2.5 text-xs text-slate-700 font-bold"
                  >
                    <option value="true">نشط بالكامل (Active)</option>
                    <option value="false">معلق / غير نشط (Suspended)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveTenant}
                    disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 p-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    {loading ? "جاري الحفظ..." : "حفظ التحديثات"}
                  </button>
                  <button
                    onClick={() => setEditingTenantId(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/50 p-8 rounded-2xl border border-dashed text-center text-slate-400 font-bold">
                ⚠️ الرجاء اختيار شركة عقارية من الجدول لتعديل باقتها أو إيقاف حسابها يدوياً.
              </div>
            )}
          </div>
        </div>
      )}

      {/* التبويب الثالث: إدارة وتشغيل الوكلاء الأذكياء */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          {/* كرت تفعيل وتنشيط الوكلاء */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-base font-black text-slate-800">إدارة وتشغيل الوكلاء الأذكياء (AI Agent Registry)</h2>
                <p className="text-xs text-slate-500 mt-1">تفعيل الوكلاء ليقوموا بأعمالهم الدورية وفحص الأخطاء وصحة النظام.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRunSentinel}
                  disabled={triggeringSentinel}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition-all shadow-md hover:scale-[1.02] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
                >
                  {triggeringSentinel ? (
                    <>
                      <span className="inline-block animate-spin border-2 border-slate-950 border-t-transparent rounded-full w-4 h-4" />
                      <span>جاري فحص خادم Vercel والقاعدة...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 تشغيل وكيل الصيانة (Sentinel)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRunAllAgents}
                  disabled={triggeringAgents}
                  className="bg-emerald-650 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-xl transition-all shadow-md hover:scale-[1.02] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
                >
                  {triggeringAgents ? (
                    <>
                      <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                      <span>جاري تشغيل وفحص الوكلاء...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ تشغيل وتفعيل جميع الوكلاء فورا</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* شبكة معلومات الوكلاء */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {/* الوكيل سند */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full">نشط ومتصل</span>
                <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-xl font-bold">🤖</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">الوكيل سند (Billing & Suspend)</h4>
                  <p className="text-[10px] text-slate-500 mt-1">تفعيل اشتراكات المنشآت بعد الدفع، توليد كلمات مرور الدخول الآمنة وإرسالها، وتعليق الحسابات المنتهية الصلاحية تلقائياً.</p>
                </div>
              </div>

              {/* الوكيل مساعد */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full">نشط ومتصل</span>
                <div className="h-10 w-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-xl font-bold">🛠️</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">الوكيل مساعد (Helpdesk)</h4>
                  <p className="text-[10px] text-slate-500 mt-1">قراءة تذاكر الاستفسارات والمشاكل المفتوحة من المطورين العقاريين، وصياغة ردود تقنية وإرشادية فورية لحل مشاكلهم.</p>
                </div>
              </div>

              {/* الوكيل مبيعات واتساب */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full">نشط ومتصل</span>
                <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xl font-bold">💬</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">وكيل واتساب (WhatsApp Sales)</h4>
                  <p className="text-[10px] text-slate-500 mt-1">استقبال محادثات واستفسارات العملاء على الواتساب، والرد الفوري عليها لتعريفهم بالمشاريع السكنية وحجز مواعيد الزيارة.</p>
                </div>
              </div>

              {/* الوكيل ساهر */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-3 relative overflow-hidden">
                <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full">نشط ومتصل</span>
                <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center text-xl font-bold">🔍</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">الوكيل ساهر (Error Watchdog)</h4>
                  <p className="text-[10px] text-slate-500 mt-1">تتبع الأخطاء البرمجية وصحة قاعدة البيانات السحابية، فحص تشفير قنوات النقل، وإشعار الإدارة بتقارير تشخيصية فورية بالبريد الإلكتروني.</p>
                </div>
              </div>

              {/* وكيل الصيانة ساهر الجديد */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-3 relative overflow-hidden border-amber-300 bg-amber-500/[0.02]">
                <span className="absolute top-4 left-4 bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-300/30">ساهر الصيانة</span>
                <div className="h-10 w-10 bg-slate-900 text-amber-500 rounded-lg flex items-center justify-center text-xl font-bold">🤖</div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">ساهر الصيانة (Sentinel Agent)</h4>
                  <p className="text-[10px] text-slate-500 mt-1">مراقبة سحابية نشطة لثلاث طبقات: خوادم Vercel، قاعدة بيانات Neon PostgreSQL، واتصال النطاق الرئيسي والـ DNS والـ SSL.</p>
                </div>
              </div>
            </div>
          </div>

          {/* لوحة التقارير والتشخيص من وكيل الصيانة والمراقبة السحابي */}
          {sentinelReport && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6 text-white text-right">
              <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-black text-white">تقرير المراقبة والصيانة السحابي الشامل - وكيل الصيانة (Sentinel)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">تاريخ الرصد: {sentinelReport.timestamp}</span>
              </div>

              {/* شبكة طبقات المراقبة الثلاث */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. طبقة Vercel Cloud */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-amber-500">☁️ خوادم Vercel</h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                      sentinelReport.vercel.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {sentinelReport.vercel.status === "HEALTHY" ? "مستقر" : "تنبيه فني"}
                    </span>
                  </div>
                  <ul className="text-[10px] space-y-2 text-slate-350">
                    <li>اسم المشروع: <span className="text-white font-bold">{sentinelReport.vercel.projectName}</span></li>
                    <li>حالة النشر: <span className="text-white font-bold">{sentinelReport.vercel.latestDeploymentStatus}</span></li>
                    <li>رابط النشر: <a href={sentinelReport.vercel.latestDeploymentUrl} target="_blank" className="text-amber-500 hover:underline" dir="ltr">{sentinelReport.vercel.latestDeploymentUrl}</a></li>
                    <li>زمن البناء: <span className="text-white font-bold">{sentinelReport.vercel.buildTime}</span></li>
                  </ul>
                </div>

                {/* 2. طبقة قاعدة البيانات Neon */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-amber-500">🗄️ قاعدة بيانات Neon</h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                      sentinelReport.database.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {sentinelReport.database.status === "HEALTHY" ? "متصلة" : "عطل بالاتصال"}
                    </span>
                  </div>
                  <ul className="text-[10px] space-y-2 text-slate-350">
                    <li>زمن الاستجابة: <span className="text-white font-bold">{sentinelReport.database.latencyMs} ms</span></li>
                    <li>وضع التشفير: <span className="text-white font-bold">{sentinelReport.database.sslMode}</span></li>
                    <li>الشركات: <span className="text-white font-bold">{sentinelReport.database.totalRows.tenants}</span> | المستخدمين: <span className="text-white font-bold">{sentinelReport.database.totalRows.users}</span></li>
                    <li>العملاء: <span className="text-white font-bold">{sentinelReport.database.totalRows.leads}</span> | المشاريع: <span className="text-white font-bold">{sentinelReport.database.totalRows.projects}</span></li>
                  </ul>
                </div>

                {/* 3. طبقة النطاق والـ DNS */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-amber-500">🌍 النطاق والـ DNS</h4>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                      sentinelReport.domain.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {sentinelReport.domain.status === "HEALTHY" ? "نشط" : "عطل بالنطاق"}
                    </span>
                  </div>
                  <ul className="text-[10px] space-y-2 text-slate-350">
                    <li>اسم النطاق: <span className="text-white font-bold" dir="ltr">{sentinelReport.domain.domainName}</span></li>
                    <li>عنوان IP: <span className="text-white font-bold" dir="ltr">{sentinelReport.domain.ipResolved}</span></li>
                    <li>كود استجابة HTTP: <span className="text-white font-bold">HTTP {sentinelReport.domain.httpResponseCode}</span></li>
                    <li>حالة SSL: <span className="text-white font-bold">{sentinelReport.domain.sslStatus}</span></li>
                  </ul>
                </div>
              </div>

              {/* المشاكل المكتشفة والتوصيات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-rose-400">🚨 المشاكل والأخطاء المرصودة:</h4>
                  <ul className="bg-slate-950 p-4 rounded-xl border border-slate-850 divide-y divide-slate-800/40 text-[11px] leading-relaxed text-slate-300">
                    {sentinelReport.anomalies.map((anomaly: string, idx: number) => (
                      <li key={idx} className="py-2 flex items-start gap-2">
                        <span className="text-slate-500">•</span>
                        <span>{anomaly}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-emerald-450">💡 التوصيات التقنية المقترحة:</h4>
                  <ul className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30 divide-y divide-emerald-900/10 text-[11px] leading-relaxed text-emerald-350 font-bold">
                    {sentinelReport.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="py-2 flex items-start gap-2">
                        <span className="text-emerald-500">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* لوحة التقارير والتشخيص من الوكيل ساهر */}
          {agentsReport && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6 text-white text-right">
              <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-black">تقرير فحص صحة النظام والأخطاء - الوكيل ساهر</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">تاريخ الرصد: {agentsReport.timestamp}</span>
              </div>

              {/* الإحصائيات الأساسية في التشخيص */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] text-slate-400 font-bold">حالة قاعدة البيانات</p>
                  <p className={`text-sm font-black mt-1 ${agentsReport.databaseStatus === "HEALTHY" ? "text-emerald-400" : "text-rose-400"}`}>
                    {agentsReport.databaseStatus === "HEALTHY" ? "سليمة ومتصلة" : "فشل في الاتصال"}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] text-slate-400 font-bold">وضع تشفير SSL</p>
                  <p className="text-sm font-black text-amber-400 mt-1">{agentsReport.sslMode}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] text-slate-400 font-bold">تذاكر معلقة (مفتوحة)</p>
                  <p className="text-sm font-black text-white mt-1">{agentsReport.openTicketsCount} تذاكر</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-[9px] text-slate-400 font-bold">الشركات المسجلة</p>
                  <p className="text-sm font-black text-white mt-1">{agentsReport.totalTenantsCount} شركات</p>
                </div>
              </div>

              {/* سرد المشاكل والأخطاء المكتشفة */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-450">🚨 المشاكل والأخطاء المرصودة بقاعدة البيانات والنظام:</h4>
                <ul className="bg-slate-950 p-4 rounded-xl border border-slate-850 divide-y divide-slate-800/40 text-xs font-bold leading-relaxed text-slate-300">
                  {agentsReport.anomalies.map((anomaly: string, idx: number) => (
                    <li key={idx} className="py-2.5 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-slate-500">•</span>
                      <span>{anomaly}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* التوصيات الفورية */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-emerald-450">💡 التوصيات والإرشادات التقنية المقترحة:</h4>
                <ul className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30 divide-y divide-emerald-900/10 text-xs font-bold leading-relaxed text-emerald-300 font-bold">
                  {agentsReport.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="py-2.5 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
