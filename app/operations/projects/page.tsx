// app/operations/projects/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getDetailedProjectsAction, createProjectAction } from '@/app/actions/projects';

// مترجم لحالة المشروع العقاري
const STATUS_TRANSLATIONS: Record<string, { label: string; style: string }> = {
  PLANNING: { label: 'تحت التخطيط', style: 'bg-sky-50 text-sky-600 border-sky-200' },
  UNDER_CONSTRUCTION: { label: 'قيد الإنشاء', style: 'bg-amber-50 text-amber-600 border-amber-200' },
  COMPLETED: { label: 'مكتمل وجاهز', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  SOLD_OUT: { label: 'مباع بالكامل', style: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const dbProjects = await getDetailedProjectsAction();
      setProjects(dbProjects);
    }
    loadProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createProjectAction(formData);

    if (result.success) {
      setSuccessMessage("تم تسجيل المشروع العقاري الجديد بنجاح في قاعدة بيانات شركتكم!");
      e.currentTarget.reset();
      const updatedProjects = await getDetailedProjectsAction();
      setProjects(updatedProjects);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع أثناء الحفظ.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المشاريع العقارية</h1>
          <p className="text-gray-500 text-sm mt-1">تتبع حالة التطوير العقاري، حجم الوحدات الإجمالي ونسب المبيعات الحية</p>
        </div>
      </div>

      {/* التنبيهات ورسائل الخطأ والنجاح */}
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
        
        {/* استمارة إضافة مشروع عقاري جديد */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">إضافة مشروع جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المشروع العقاري *</label>
              <input 
                type="text" 
                name="name"
                required
                className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="مثال: نرجس ريزيدنس 102"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">المدينة *</label>
                <select name="city" className="w-full border rounded-lg p-2 text-xs">
                  <option>الرياض</option>
                  <option>جدة</option>
                  <option>الدمام</option>
                  <option>مكة المكرمة</option>
                  <option>المدينة المنورة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">حالة البناء *</label>
                <select name="status" className="w-full border rounded-lg p-2 text-xs">
                  <option value="PLANNING">تحت التخطيط</option>
                  <option value="UNDER_CONSTRUCTION">قيد الإنشاء</option>
                  <option value="COMPLETED">جاهز للسكن</option>
                  <option value="SOLD_OUT">مباع بالكامل</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">إجمالي عدد الوحدات</label>
              <input 
                type="number" 
                name="unitsTotal"
                className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="120"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأدنى للسعر (ر.س)</label>
                <input 
                  type="number" 
                  name="minPrice"
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                  placeholder="1200000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأقصى للسعر (ر.س)</label>
                <input 
                  type="number" 
                  name="maxPrice"
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                  placeholder="1900000"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2.5 rounded-lg text-xs font-semibold"
            >
              حفظ المشروع العقاري
            </button>
          </form>
        </div>

        {/* عرض بطاقات المشاريع الحية مع المبيعات والمهتمين */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm">مشاريع المطور العقاري النشطة</h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
              إجمالي {projects.length} مشاريع
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-2 bg-white p-12 text-center border border-dashed rounded-xl text-gray-400 font-medium">
                لا يوجد مشاريع عقارية مسجلة لشركتكم حالياً. قم بإضافة أول مشروع عبر النموذج الجانبي!
              </div>
            ) : (
              projects.map((project) => {
                const statusDetails = STATUS_TRANSLATIONS[project.status] || { label: project.status, style: 'bg-gray-50' };
                const leadsCount = project._count?.leads || 0;
                
                return (
                  <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusDetails.style}`}>
                          {statusDetails.label}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">{project.city}</span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-base mb-1">{project.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mb-3">
                        إجمالي الوحدات في المشروع: <span className="font-bold text-slate-700">{project.unitsTotal} وحدة</span>
                      </p>

                      {project.minPrice && (
                        <p className="text-xs text-amber-600 font-extrabold mb-4">
                          يبدأ من: {parseFloat(project.minPrice).toLocaleString('ar-SA')} ر.س
                        </p>
                      )}

                      <div className="border-t pt-3 flex items-center justify-between text-xs text-slate-600">
                        <span>العملاء المحتملين المهتمين:</span>
                        <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          {leadsCount} عملاء
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 grid grid-cols-3 gap-1 text-center text-[10px]">
                      <div>
                        <p className="text-gray-400 font-medium">مباع</p>
                        <p className="font-black text-slate-700 mt-0.5">{project.unitsSold}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">محجوز</p>
                        <p className="font-black text-amber-600 mt-0.5">{project.unitsBooked}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">متاح</p>
                        <p className="font-black text-emerald-600 mt-0.5">{project.unitsTotal - project.unitsSold - project.unitsBooked}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}