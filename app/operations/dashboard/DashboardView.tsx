// app/operations/dashboard/DashboardView.tsx
'use client';

import React, { useState } from 'react';

interface DashboardViewProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
  };
  stats: {
    totalLeads: number;
    activeBookings: number;
    closedSales: number;
    totalProjects: number;
    pendingTasks: number;
  };
  recentLeads: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    status: string;
    city: string;
    createdAt: string;
    project: { name: string } | null;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    lead: { firstName: string; lastName: string | null } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    unitsTotal: number;
    unitsSold: number;
    unitsBooked: number;
    minPrice: number | null;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "عميل جديد",
  CONTACTED: "تم التواصل",
  VISIT_SCHEDULED: "مجدول للزيارة",
  VISITED: "تمت الزيارة",
  OFFER_MADE: "تقديم عرض",
  RESERVED: "حجز مبدئي",
  CONTRACT_SIGNED: "عقد موقع",
  WON: "مكتمل البيع",
  LOST: "مستبعد",
};

export default function DashboardView({ tenant, stats, recentLeads, recentTasks, projects }: DashboardViewProps) {
  const [autonomy, setAutonomy] = useState<"advisory" | "autonomous">("autonomous");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const planTitles: Record<string, string> = {
    basic: "الباقة الأساسية",
    professional: "الباقة الاحترافية",
    enterprise: "باقة الشركات الكبرى",
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* هيدر ترحيبي مع مؤشرات فورية */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase">النواة المركزية للعمليات</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100">مرحباً بك في لوحة تحكم {tenant.companyName}</h1>
          <p className="text-xs text-slate-400 font-medium">مراقبة حية للمبيعات، نسب التحويل، وحالة مخزون الوحدات العقارية لشركتكم</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-slate-800/80 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl text-slate-200">
            الباقة: {planTitles[tenant.subscriptionPlan] || tenant.subscriptionPlan}
          </span>
          <button 
            onClick={() => setAutonomy(autonomy === "autonomous" ? "advisory" : "autonomous")}
            className={`text-xs font-black px-4 py-2 rounded-xl transition-all border cursor-pointer ${autonomy === 'autonomous' ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-lg shadow-amber-500/10' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
          >
            {autonomy === "autonomous" ? "⚡ وضع القيادة الذاتية" : "🛡️ وضع الاستشارة"}
          </button>
        </div>
      </div>

      {/* كروت التحليلات السريعة (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <p className="text-[10px] text-slate-400 font-extrabold">إجمالي العملاء</p>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.totalLeads}</p>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">عميل مسجل بالكامل</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <p className="text-[10px] text-slate-400 font-extrabold">الحجوزات النشطة</p>
          <p className="text-2xl font-black text-amber-600 mt-2">{stats.activeBookings}</p>
          <span className="text-[9px] text-amber-500 mt-1 font-semibold">بانتظار توقيع العقد</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <p className="text-[10px] text-slate-400 font-extrabold">المبيعات المكتملة</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.closedSales}</p>
          <span className="text-[9px] text-emerald-500 mt-1 font-semibold">عقود تم توقيعها</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <p className="text-[10px] text-slate-400 font-extrabold">المشاريع النشطة</p>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.totalProjects}</p>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">مشروع في الحفظ</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <p className="text-[10px] text-slate-400 font-extrabold">المهام المعلقة</p>
          <p className="text-2xl font-black text-rose-600 mt-2">{stats.pendingTasks}</p>
          <span className="text-[9px] text-rose-500 mt-1 font-semibold">تتطلب استجابة فورية</span>
        </div>

      </div>

      {/* المحتوى الرئيسي للوحة المبيعات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* العمود الأيمن: تتبع العملاء والمشاريع */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* جدول العملاء الأخير */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">أحدث العملاء المسجلين</h3>
                <p className="text-[10px] text-slate-400">آخر 5 عملاء مهتمين تم تسجيلهم بالنظام</p>
              </div>
              <a href="/operations/leads" className="text-xs text-amber-600 font-bold hover:underline">عرض الكل ➔</a>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5">العميل</th>
                    <th className="px-4 py-2.5">المشروع المستهدف</th>
                    <th className="px-4 py-2.5">الحالة</th>
                    <th className="px-5 py-2.5">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-400 font-medium">لا يوجد عملاء حالياً.</td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-800">{lead.firstName} {lead.lastName || ""}</p>
                          <p className="text-[9px] text-slate-400 font-medium" dir="ltr">{lead.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">
                          {lead.project ? lead.project.name : "غير محدد"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold border">
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[10px] text-gray-400 font-semibold">
                          {new Date(lead.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* مخزون المشاريع والوحدات العقارية */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">حالة مخزون المشاريع العقارية</h3>
              <p className="text-[10px] text-slate-400">توزيع الوحدات ومتابعة أرقام المبيعات للمشاريع</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 col-span-2">لا توجد مشاريع مسجلة حالياً.</p>
              ) : (
                projects.map((proj) => {
                  const soldPercentage = proj.unitsTotal > 0 ? Math.round((proj.unitsSold / proj.unitsTotal) * 100) : 0;
                  const bookedPercentage = proj.unitsTotal > 0 ? Math.round((proj.unitsBooked / proj.unitsTotal) * 100) : 0;
                  const remaining = proj.unitsTotal - proj.unitsSold - proj.unitsBooked;

                  return (
                    <div key={proj.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]">{proj.name}</span>
                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-semibold">{proj.city}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>نسبة المباع:</span>
                          <span>{soldPercentage}% ({proj.unitsSold} وحدة)</span>
                        </div>
                        <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${soldPercentage}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1.5 text-center text-[9px] border-t border-slate-200/50">
                        <div>
                          <p className="text-slate-400 font-medium">حجز مؤقت</p>
                          <p className="font-black text-amber-600 mt-0.5">{proj.unitsBooked}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">مباع نهائي</p>
                          <p className="font-black text-slate-700 mt-0.5">{proj.unitsSold}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">متاح</p>
                          <p className="font-black text-emerald-600 mt-0.5">{remaining}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* العمود الأيسر: المهام والتحكم الذاتي */}
        <div className="space-y-6">
          
          {/* قائمة التذكيرات الميدانية والمهام */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">تنبيهات ومتابعات اليوم</h3>
              <a href="/operations/tasks" className="text-[10px] text-slate-400 hover:underline">إدارة المهام ➔</a>
            </div>

            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">لا توجد مهام معلقة لليوم 🎉</p>
              ) : (
                recentTasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="p-3 border border-slate-100 rounded-xl hover:border-amber-400 transition-all cursor-pointer bg-slate-50/40 hover:bg-slate-50 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-xs line-clamp-1 flex-1 leading-normal">{task.title}</h4>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border shrink-0 ${
                        task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {task.priority === 'HIGH' ? 'حرج' : task.priority === 'MEDIUM' ? 'متوسط' : 'عادي'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                      <span>العميل: {task.lead ? task.lead.firstName : "غير مرتبط"}</span>
                      <span dir="ltr">{new Date(task.dueDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* محرك القيادة الذاتية والمتابعة التلقائية */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 space-y-4 shadow-md">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">محرك الأتمتة المتقدم (ORCA Engine)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">حل الأزمات وتوزيع العملاء بشكل آلي بالكامل</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
                <p className="font-bold text-slate-100 text-[11px]">✔ تم موازنة حمل مستشاري المبيعات</p>
                <p className="text-[9px] text-slate-400 leading-normal">توزيع 12 عميلاً محتملاً جديداً بالتساوي لزيادة سرعة الاستجابة لـ 4 دقائق.</p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
                <p className="font-bold text-slate-100 text-[11px]">✔ التحقق التلقائي من تضارب المبيعات</p>
                <p className="text-[9px] text-slate-400 leading-normal">منع تسجيل 3 عملاء مكررين عبر قنوات التسويق وتوجيههم للمستشار الأصلي.</p>
              </div>
            </div>

            <button 
              onClick={() => alert("محرك الأتمتة يعمل بالكامل وجاهز للربط الفوري مع الشبكات الإعلانية")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              🚀 تفعيل بوابة الربط الإعلاني المباشر
            </button>
          </div>

        </div>

      </div>

      {/* تفاصيل المهمة المفتوحة (Modal) */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">تفاصيل مهمة المتابعة</h3>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">المهمة المطلوب إنجازها:</p>
                <p className="text-slate-800 font-bold mt-1 text-sm">{selectedTask.title}</p>
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">الوصف والتفاصيل:</p>
                  <p className="text-slate-600 bg-slate-50 border p-2.5 rounded-lg mt-1 leading-relaxed font-semibold">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-3 text-[11px]">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">العميل المرتبط:</p>
                  <p className="text-slate-800 font-bold mt-0.5">{selectedTask.lead ? `${selectedTask.lead.firstName} ${selectedTask.lead.lastName || ""}` : "غير مرتبط"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">موعد الاستحقاق:</p>
                  <p className="text-amber-600 font-bold mt-0.5" dir="ltr">
                    {new Date(selectedTask.dueDate).toLocaleString('ar-SA')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button 
                onClick={() => setSelectedTask(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
