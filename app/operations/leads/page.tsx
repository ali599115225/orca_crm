// app/operations/leads/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getLeadsAction, getProjectsAction, createLeadAction } from '@/app/actions/leads';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // تحميل البيانات الحية من قاعدة البيانات عند فتح الصفحة
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
      setSuccessMessage("تم تسجيل العميل المحتمل الجديد بنجاح في قاعدة بيانات شركتكم!");
      e.currentTarget.reset();
      // تحديث القائمة الحية للعملاء
      const updatedLeads = await getLeadsAction();
      setLeads(updatedLeads);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع أثناء الحفظ.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة العملاء المحتملين (Leads CRM)</h1>
          <p className="text-gray-500 text-sm mt-1">تتبع رحلة العملاء، وتجنب التكرار لضمان كفاءة أداء فريق المبيعات</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium px-4 py-2 rounded-lg text-sm transition-colors border">
            استيراد Excel / CSV
          </button>
        </div>
      </div>

      {/* التنبيهات والرسائل الإرشادية */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* نموذج إضافة عميل يدويًا مرتبط بقاعدة البيانات ومشاريعك الفعالة */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">تسجيل عميل محتمل</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الاسم الأول *</label>
                <input 
                  type="text" 
                  name="firstName"
                  required
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="محمد"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">العائلة</label>
                <input 
                  type="text" 
                  name="lastName"
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="الغامدي"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الجوال *</label>
              <input 
                type="tel" 
                name="phone"
                required
                className="w-full border rounded-lg p-2 text-xs text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="05xxxxxxxx"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">المدينة</label>
                <select name="city" className="w-full border rounded-lg p-2 text-xs focus:ring-amber-500">
                  <option>الرياض</option>
                  <option>جدة</option>
                  <option>الدمام</option>
                  <option>مكة المكرمة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">مصدر العميل</label>
                <select name="source" className="w-full border rounded-lg p-2 text-xs">
                  <option>إعلانات سناب شات</option>
                  <option>حملة ميتا إعلانية</option>
                  <option>زيارة مباشرة المقر</option>
                  <option>موقع الشركة الإلكتروني</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">المشروع المستهدف</label>
              <select name="projectId" className="w-full border rounded-lg p-2.5 text-xs">
                <option value="">-- اختر مشروعاً عقارياً --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2.5 rounded-lg text-xs font-semibold"
            >
              تسجيل العميل في النظام وتحقق التكرار
            </button>
          </form>
        </div>

        {/* عرض جدول العملاء الحقيقيين من قاعدة البيانات */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs">العملاء النشطين ومستويات الاهتمام</h3>
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
                  <th className="px-4 py-3">الاسم والبيانات</th>
                  <th className="px-4 py-3">المشروع العقاري</th>
                  <th className="px-4 py-3">المصدر والمدينة</th>
                  <th className="px-4 py-3">الحالة والرحلة</th>
                  <th className="px-4 py-3">مستوى الجدية</th>
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
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{lead.firstName} {lead.lastName || ""}</p>
                          <p className="text-[10px] text-slate-500">{lead.phone}</p>
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
                          <p className="text-[10px] text-gray-500">{lead.city}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-700">
                          {lead.leadScore}%
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}