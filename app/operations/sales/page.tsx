// app/operations/sales/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getSalesPerformanceAction, SalesRepKPI } from '@/app/actions/sales';

export default function SalesManagementPage() {
  const [salesReps, setSalesReps] = useState<SalesRepKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      const data = await getSalesPerformanceAction();
      setSalesReps(data);
      setLoading(false);
    }
    loadPerformance();
  }, []);

  // حساب مؤشرات القسم الإجمالية التجميعية
  const totalLeadsAssigned = salesReps.reduce((acc, curr) => acc + curr.leadsCount, 0);
  const totalBookings = salesReps.reduce((acc, curr) => acc + curr.bookings, 0);
  const totalContracts = salesReps.reduce((acc, curr) => acc + curr.contracts, 0);
  const averageConversionRate = salesReps.length > 0
    ? (salesReps.reduce((acc, curr) => acc + parseFloat(curr.conversionRate), 0) / salesReps.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">تحليل وتقييم أداء فريق المبيعات</h1>
          <p className="text-gray-500 text-sm mt-1">تتبع جودة خدمة المستشارين العقاريين، سرعة الاستجابة، ونسب إغلاق الحجوزات بنظام الفوترة</p>
        </div>
      </div>

      {/* لوحة المؤشرات الإجمالية للقسم */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-bold">إجمالي عملاء المبيعات</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{loading ? '...' : totalLeadsAssigned}</span>
            <span className="text-[10px] text-slate-400">عميل مسند للقسم</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-bold">حجوزات نشطة بالقسم</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-600">{loading ? '...' : totalBookings}</span>
            <span className="text-[10px] text-amber-500 font-bold">عربونات مسجلة</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-bold">العقود الموقعة نهائياً</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600">{loading ? '...' : totalContracts}</span>
            <span className="text-[10px] text-emerald-500 font-bold">إغلاق ناجح</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-bold">متوسط معدل التحويل (CR)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{loading ? '...' : `${averageConversionRate}%`}</span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">نسبة ممتازة</span>
          </div>
        </div>
      </div>

      {/* جدول تقييم أداء مستشاري المبيعات */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">لوحة تميز فريق المبيعات (Leaderboard)</h3>
          <span className="text-xs text-slate-400">مرتبة تنازلياً حسب تحقيق الهدف الفردي</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3">اسم المستشار العقاري</th>
                <th className="px-4 py-3">العملاء المتابعين</th>
                <th className="px-4 py-3">متوسط سرعة الرد</th>
                <th className="px-4 py-3">معدل التحويل (CR)</th>
                <th className="px-4 py-3">حجوزات / عقود مغلقة</th>
                <th className="px-5 py-3">تحقيق الأهداف الشهرية (KPI Target)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 font-semibold">
                    جاري حساب وتحليل مؤشرات الأداء العقاري...
                  </td>
                </tr>
              ) : salesReps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 font-semibold">
                    لا يوجد بيانات مبيعات مسجلة في قاعدة بيانات شركتكم حالياً للتحليل.
                  </td>
                </tr>
              ) : (
                salesReps.map((rep, index) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-reverse space-x-3">
                        <div className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{rep.name}</p>
                          <p className="text-[10px] text-gray-400">{rep.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700">{rep.leadsCount} عميل</td>
                    <td className="px-4 py-4 text-slate-600 font-semibold">{rep.responseTime}</td>
                    <td className="px-4 py-4 font-black text-slate-800">{rep.conversionRate}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1.5">
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100">
                          {rep.bookings} حجز
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                          {rep.contracts} عقد
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-reverse space-x-3">
                        <span className="text-xs font-black text-slate-800">{rep.targetAchieved}%</span>
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${
                              rep.targetAchieved >= 80 ? 'bg-emerald-500' :
                              rep.targetAchieved >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`} 
                            style={{ width: `${rep.targetAchieved}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}