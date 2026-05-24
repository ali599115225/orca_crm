// app/operations/tasks/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTasksAction, getLeadsListAction, toggleTaskStatusAction, createTaskAction } from '@/app/actions/tasks';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // تحميل البيانات الحية عند فتح الصفحة
  useEffect(() => {
    async function loadData() {
      const dbTasks = await getTasksAction();
      const dbLeads = await getLeadsListAction();
      setTasks(dbTasks);
      setLeads(dbLeads);
    }
    loadData();
  }, []);

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const result = await toggleTaskStatusAction(taskId, currentStatus);
    if (result.success) {
      const updatedTasks = await getTasksAction();
      setTasks(updatedTasks);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTaskAction(formData);

    if (result.success) {
      setSuccessMessage("تمت جدولة مهمة المتابعة والتذكير بنجاح وتكليف مستشار العميل!");
      e.currentTarget.reset();
      const updatedTasks = await getTasksAction();
      setTasks(updatedTasks);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع أثناء الحفظ.");
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">نظام المتابعة والتذكيرات الميدانية</h1>
          <p className="text-gray-500 text-sm mt-1">جدولة زيارات المعاينة، اتصالات الحسبة التمويلية وتوقيع عقود المبيعات</p>
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
        
        {/* نموذج جدولة مهمة جديدة للعميل */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">جدولة متابعة جديدة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المهمة / الإجراء المطلوب *</label>
              <input 
                type="text" 
                name="title"
                required
                className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="مثال: الاتصال لتأكيد موعد معاينة الفيلا"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">العميل المرتبط بالمهمة *</label>
              <select name="leadId" required className="w-full border rounded-lg p-2 text-xs">
                <option value="">-- اختر عميلاً محتملاً --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">تاريخ ووقت الاستحقاق *</label>
                <input 
                  type="datetime-local" 
                  name="dueDate"
                  required
                  className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">مستوى الأهمية *</label>
                <select name="priority" className="w-full border rounded-lg p-2 text-xs">
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="HIGH">عالية جداً</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ملاحظات وتفاصيل إضافية</label>
              <textarea 
                name="description"
                rows={3}
                className="w-full border rounded-lg p-2 text-xs focus:outline-none"
                placeholder="تفاصيل الحسبة التمويلية أو شروط حجز الوحدة..."
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2.5 rounded-lg text-xs font-semibold"
            >
              جدولة المتابعة فوراً
            </button>
          </form>
        </div>

        {/* قائمة المهام المجدولة النشطة من قاعدة البيانات */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs">مهام فريق المبيعات والمتابعات</h3>
            <div className="flex gap-2 text-[10px] font-bold">
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">
                معلقة: {pendingCount}
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                مكتملة: {completedCount}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                لا يوجد مهام أو متابعات مجدولة حالياً.
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      checked={task.status === 'COMPLETED'}
                      onChange={() => handleToggle(task.id, task.status)}
                      className="mt-1 h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-gray-300 cursor-pointer"
                    />
                    <div>
                      <h4 className={`text-xs font-bold text-slate-800 ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100 max-w-lg">
                          {task.description}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-2">
                        العميل: <span className="font-bold text-slate-700">{task.lead?.firstName} {task.lead?.lastName || ""}</span>
                      </p>
                      <p className="text-[9px] text-amber-600 font-bold mt-1">
                        الاستحقاق: {new Date(task.dueDate).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[9px] text-slate-400 font-medium">
                      المسؤول: {task.assignedUser?.name}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                      task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                      task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {task.priority === 'HIGH' ? 'عالية جداً' : task.priority === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}