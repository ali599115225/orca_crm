// app/operations/layout.tsx
import React from 'react';
import { getSession } from '@/lib/session';
import { logoutAction } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'لوحة التحكم - ORCA',
  description: 'نظام إدارة العمليات العقارية',
};

// خريطة لترجمة الأدوار الوظيفية للعربية بأسلوب لائق
const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: "المدير العام",
  SALES_MANAGER: "مدير المبيعات",
  SALES_EMPLOYEE: "مستشار عقاري",
  MARKETING: "إدارة التسويق",
  READ_ONLY: "مشاهدة فقط",
};

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. جلب بيانات الجلسة النشطة فوراٍ من السيرفر لضمان الأمان
  const session = await getSession();

  // إذا لم تكن هناك جلسة نشطة (حماية إضافية للروابط)
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* شريط التنقل الجانبي (Sidebar) - مثبت على اليسار */}
      <aside 
        className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 text-right" 
        dir="rtl"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xl font-bold tracking-wider text-amber-500">ORCA CRM</span>
          <span className="bg-slate-800 text-xs px-2 py-1 rounded text-amber-300 font-semibold">تطوير عقاري</span>
        </div>
        
        {/* معلومات المستأجر النشط */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <p className="text-xs text-slate-400">الشركة الحالية:</p>
          <p className="font-semibold text-sm text-slate-200 truncate">شركة دار الأعمار العقارية</p>
          <span className="inline-block mt-2 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
            باقة برو (نشط)
          </span>
        </div>

        {/* روابط التنقل المحدثة */}
        <nav className="flex-1 p-4 space-y-2 text-sm">
          <a href="/operations/analytics" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
            <span>لوحة التحليلات والتقارير</span>
          </a>

          <a href="/operations/leads" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>العملاء المحتملين (Leads)</span>
          </a>

          <a href="/operations/projects" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" />
            </svg>
            <span>إدارة المشاريع العقارية</span>
          </a>

          <a href="/operations/sales" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>أداء المبيعات والـ KPIs</span>
          </a>

          <a href="/operations/tasks" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>المهام والتذكيرات</span>
          </a>

          <a href="/operations/settings" className="flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <svg width="20" height="20" className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>إعدادات النظام</span>
          </a>

          {/* استمارة تسجيل الخروج السريع والآمن دون الحاجة لكود جافا سكريبت جانبي */}
          <form action={logoutAction} className="pt-4 border-t border-slate-800">
            <button 
              type="submit" 
              className="w-full flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <svg width="20" height="20" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500">
          <p>جميع الحقوق محفوظة لوكالة ORCA</p>
          <p className="mt-1">رقم الإصدار MVP 1.0</p>
        </div>
      </aside>

      {/* محتوى الشاشة الرئيسي */}
      <main className="flex-1 flex flex-col min-w-0 text-right" dir="rtl">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center space-x-reverse space-x-4">
            <div className="relative">
              <span className="absolute bottom-0 left-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              <div className="h-9 w-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">
                {/* استخراج الحرف الأول من اسم المستخدم ديناميكياً */}
                {session?.name ? (session.name as string).charAt(0) : "م"}
              </div>
            </div>
            <div>
              {/* عرض اسم الموظف الحقيقي وصلاحياته ديناميكياً من الجلسة */}
              <p className="text-sm font-bold text-gray-800">{session?.name as string || "أحمد الغامدي"}</p>
              <p className="text-[10px] text-gray-500 font-semibold">
                {session?.role ? ROLE_TRANSLATIONS[session.role as string] : "مدير المبيعات"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-reverse space-x-3">
            <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium">
              تحديث فوري نشط
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}