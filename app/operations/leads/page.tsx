// app/operations/leads/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getLeadsAction, getProjectsAction, createLeadAction, updateLeadStatusAction } from '@/app/actions/leads';

// تفصيل تسلسل قمع ومسار المبيعات العقارية مع الحالات المترجمة للعربية
const STATUS_PIPELINE = [
  { key: 'NEW', label: 'عملاء جدد', next: 'CONTACTED', style: 'border-sky-500 bg-sky-500/5 text-sky-600' },
  { key: 'CONTACTED', label: 'تم التواصل', next: 'VISIT_SCHEDULED', style: 'border-indigo-500 bg-indigo-500/5 text-indigo-600' },
  { key: 'VISIT_SCHEDULED', label: 'مجدول للزيارة', next: 'RESERVED', style: 'border-amber-500 bg-amber-500/5 text-amber-600' },
  { key: 'RESERVED', label: 'حجز مبدئي', next: 'CONTRACT_SIGNED', style: 'border-emerald-500 bg-emerald-500/5 text-emerald-600' },
  { key: 'CONTRACT_SIGNED', label: 'توقيع العقد', next: null, style: 'border-teal-500 bg-teal-500/5 text-teal-600' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban'); // اللوحة هي الوضع الافتراضي لجمال العرض
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // جلب البيانات الحية عند فتح الصفحة
  useEffect(() => {
    async function loadData() {
      const dbLeads = await getLeadsAction();
      const dbProjects = await getProjectsAction();
      setLeads(dbLeads);
      setProjects(dbProjects);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createLeadAction(formData);

    if (result.success) {
      setSuccessMessage("تم تسجيل العميل المحتعل الجديد بنجاح وحقن الإشعارات الفورية له وللمبيعات!");
      e.currentTarget.reset();
      const updatedLeads = await getLeadsAction();
      setLeads(updatedLeads);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع.");
    }
  };

  // حركة نقل العميل للعمود التالي تفاعلياً حياً على السيرفر
  const handleMoveToNextStep = async (leadId: string, currentStatus: string, nextStatus: string) => {
    setUpdatingId(leadId);
    const result = await updateLeadStatusAction(leadId, nextStatus);
    setUpdatingId(null);
    if (result.success) {
      const updatedLeads = await getLeadsAction();
      setLeads(updatedLeads);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* الهيدر وزري التبديل الفخمين بين الجدول واللوحة */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">أتمتة وإدارة العملاء المحتملين</h1>
          <p className="text-gray-500 text-sm mt-1">تتبع مستويات اهتمام العملاء، ومنع التكرار، ومراقبة حركة التدفق ببطاقات مبيعات تفاعلية [1, 2]</p>
        </div>

        {/* أزرار التبديل الدائرية الناعمة بتأثير الـ Cairo */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl self-start md:self-auto border border-slate-300/30">
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🗂️ عرض لوحة البطاقات (Kanban)
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            📋 عرض جدول البيانات
          </button>
        </div>
      </div>

      {/* التنبيهات ورسائل النجاح والخطأ */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {successMessage}
        </div>
      )}

      {/* نموذج الإضافة السريع للعميل المعتمد بقاعدة البيانات */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">تسجيل عميل محتمل جديد وتفعيل التحقق الفوري</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">الاسم الأول *</label>
            <input type="text" name="firstName" required className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="مثال: عبد العزيز" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">العائلة</label>
            <input type="text" name="lastName" className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="الشمري" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">رقم الجوال *</label>
            <input type="tel" name="phone" required className="w-full border rounded-lg p-2 text-xs text-left focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="05xxxxxxxx" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">المشروع العقاري المستهدف</label>
            <select name="projectId" className="w-full border rounded-lg p-2 text-xs text-slate-800">
              <option value="">-- اختر مشروعاً عقارياً --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black p-2.5 rounded-lg transition-colors cursor-pointer">
            تسجيل وتحقق التكرار ➔
          </button>
        </form>
      </div>

      {/* طريقة العرض 1: عرض بطاقات الكانبان التفاعلية المنسقة والمانعة للتداخل بدقة فائقة */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_PIPELINE.map((column) => {
            const columnLeads = leads.filter((l) => l.status === column.key && l.phone.includes(searchPhone));
            return (
              <div key={column.key} className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-4 flex flex-col space-y-3 min-w-[220px]">
                {/* هيدر العمود المطور بدقة والمانع لأي تداخل أو تغطية للنصوص */}
                <div className={`p-3 rounded-xl border-r-4 border shadow-sm flex items-center justify-between text-xs font-black ${column.style}`}>
                  <span>{column.label}</span>
                  <span className="bg-slate-900/10 px-2 py-0.5 rounded-md text-[10px] font-extrabold text-slate-800 shrink-0">
                    {columnLeads.length} عملاء
                  </span>
                </div>

                {/* بطاقات المبيعات بداخل العمود */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[450px] min-h-[200px] pr-1">
                  {columnLeads.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-300/40 rounded-2xl bg-white/40">
                      <svg width="24" height="24" className="text-slate-400 mb-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-[10px] font-bold text-slate-500">بانتظار عملاء جدد ✨</span>
                      <span className="text-[8px] text-slate-400 mt-0.5 leading-relaxed">المسار جاهز للاستقبال</span>
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-amber-400 transition-all duration-300 hover:scale-[1.02] space-y-3">
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-800">{lead.firstName} {lead.lastName || ""}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5" dir="ltr">{lead.phone}</p>
                        </div>

                        {lead.project && (
                          <div className="text-[9px] bg-slate-50 border border-slate-100 p-1.5 rounded-md font-bold text-slate-600 truncate">
                            🎯 {lead.project.name}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold border-t pt-2.5">
                          <span>الاهتمام: {lead.leadScore}%</span>
                          <span>{lead.city}</span>
                        </div>

                        {/* زر توليد العقد السحابي الموحد والمفتوح في تبويب خارجي مستقل */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <a 
                            href={`/operations/contract/${lead.id}`}
                            target="_blank"
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black p-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            📄 عقد الحجز
                          </a>

                          {column.next && (
                            <button 
                              disabled={updatingId === lead.id}
                              onClick={() => handleMoveToNextStep(lead.id, column.key, column.next!)}
                              className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                            >
                              {updatingId === lead.id ? 'جاري...' : 'التالي ➔'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* طريقة العرض 2: عرض جدول البيانات الكلاسيكي المنسق بالكامل بالعربية */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs">جدول تتبع بيانات العملاء والصفقات</h3>
            <input 
              type="text" 
              placeholder="البحث برقم الهاتف..." 
              className="border rounded-lg px-3 py-1.5 text-xs focus:ring-amber-500 focus:outline-none"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">الاسم والبيانات</th>
                  <th className="px-4 py-3">المشروع المستهدف</th>
                  <th className="px-4 py-3">قناة الإعلان والمدينة</th>
                  <th className="px-4 py-3">حالة العميل الحالية</th>
                  <th className="px-5 py-3">عقد الحجز المبدئي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 font-medium">
                      لا يوجد عملاء مسجلين حالياً لقاعدة بيانات شركتكم.
                    </td>
                  </tr>
                ) : (
                  leads
                    .filter(l => l.phone.includes(searchPhone))
                    .map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800">{lead.firstName} {lead.lastName || ""}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5" dir="ltr">{lead.phone}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {lead.project ? (
                            <span className="text-[10px] font-semibold text-slate-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                              {lead.project.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">غير محدد</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-700">{lead.source}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{lead.city}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          <a 
                            href={`/contract/${lead.id}`}
                            target="_blank"
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors inline-block"
                          >
                            📄 عرض عقد الحجز المبدئي
                          </a>
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}