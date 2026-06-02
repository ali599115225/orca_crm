'use client';

import React, { useState } from 'react';

export default function PropertiesManagementPage() {
  // التبويب النشط حالياً
  const [activeTab, setActiveTab] = useState('overview');

  // قائمة التبويبات بناءً على متطلباتك
  const tabs = [
    { id: 'overview', label: 'معلومات وحالة العقارات' },
    { id: 'owners', label: 'إدارة الملاك' },
    { id: 'tenants', label: 'إدارة المستأجرين' },
    { id: 'occupancy', label: 'تتبع الإشغال والشاغر' },
    { id: 'reports', label: 'التقارير والأداء المالي' },
  ];

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100 dir-rtl" dir="rtl">
      {/* الرأس التكتيكي للقسم */}
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          منظومة إدارة الأملاك والعقارات
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          إدارة العمائر، الأراضي، الوحدات، المجمعات، والمستأجرين بشكل مدمج.
        </p>
      </div>

      {/* شريط التبويبات (Tabs Switcher) */}
      <div className="flex flex-wrap gap-2 mb-6 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 backdrop-blur-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويبات الديناميكي */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* 1. تبويب معلومات وحالة العقار */}
        {activeTab === 'overview' && (
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md space-y-6">
            <h2 className="text-xl font-semibold text-cyan-400 border-b border-slate-800 pb-2">تفاصيل العقارات والوحدات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">نوع العقار</span>
                <p className="text-lg font-bold text-slate-200 mt-1">عمائر - مجمعات - أراضٍ</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">حالة التشغيل</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">مشغول / شاغر</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">الصيانة</span>
                <p className="text-lg font-bold text-amber-400 mt-1">تحت الصيانة</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">المستندات والصور</span>
                <p className="text-lg font-bold text-blue-400 mt-1">مرفوعة ومؤمنة</p>
              </div>
            </div>
            <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-sm text-slate-300">
              موقع العقار والمساحة الجغرافية مربوطة تلقائياً بنظام الخرائط والـ GIS لتتبع الأصول الميدانية.
            </div>
          </div>
        )}

        {/* 2. تبويب إدارة الملاك */}
        {activeTab === 'owners' && (
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md">
            <h2 className="text-xl font-semibold text-cyan-400 border-b border-slate-800 pb-2 mb-4">سجلات الملاك والمحفظة العقارية</h2>
            <p className="text-slate-400 text-sm mb-4">إدارة حسابات ملاك العقارات والعمائر ومتابعة نسب الإدارة وصافي المستحقات الدورية.</p>
            <div className="border border-slate-800 rounded-lg overflow-hidden text-sm bg-slate-900/20">
              <div className="bg-slate-900/80 p-3 text-slate-400 font-medium grid grid-cols-3">
                <div>اسم المالك</div>
                <div>العقارات المملوكة</div>
                <div>الحالة المادية</div>
              </div>
              <div className="p-3 border-t border-slate-800/60 grid grid-cols-3 text-slate-300">
                <div>شركة الاستثمارات العقارية</div>
                <div>مجمع أوركا السكني</div>
                <div className="text-emerald-400">مسدد بالكامل</div>
              </div>
            </div>
          </div>
        )}

        {/* 3. تبويب إدارة المستأجرين */}
        {activeTab === 'tenants' && (
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md">
            <h2 className="text-xl font-semibold text-cyan-400 border-b border-slate-800 pb-2 mb-4">ملفات وبيانات المستأجرين</h2>
            <p className="text-slate-400 text-sm mb-4">متابعة المستأجرين (أفراد / شركات)، عقود الإيجار الحية، وتواريخ التجديد أو الإخلاء.</p>
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-slate-500 text-sm">
              شاشة إدارة المستأجرين جاهزة لاستقبال استعلامات المستأجرين المباشرة من قاعدة البيانات.
            </div>
          </div>
        )}

        {/* 4. تبويب تتبع الإشغال Occupancy */}
        {activeTab === 'occupancy' && (
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400 border-b border-slate-800 pb-2">مؤشر تتبع الإشغال (Occupancy Tracking)</h2>
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-cyan-500 border-t-slate-800 flex items-center justify-center text-xl font-bold text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                84%
              </div>
              <p className="text-sm text-slate-300 font-medium">معدل الإشغال الحالي للمجمع والوحدات</p>
              <p className="text-xs text-slate-500 mt-1">يوجد 16% وحدات شاغرة جاهزة للتسويق والإيجار</p>
            </div>
          </div>
        )}

        {/* 5. تبويب التقارير والأداء */}
        {activeTab === 'reports' && (
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400 border-b border-slate-800 pb-2">التقارير التحليلية والإيرادات</h2>
            <p className="text-slate-400 text-sm">مخطط بياني ومؤشرات لأداء العقارات، صافي الأرباح، ونسب التحصيل الفعلي للأقساط.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-xs text-slate-400">إجمالي الإيرادات الدورية</span>
                <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">0.00 ر.س</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-xs text-slate-400">كفاءة الأداء العقاري</span>
                <p className="text-2xl font-mono font-bold text-blue-400 mt-1">92.4%</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
