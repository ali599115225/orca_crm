// app/operations/analytics/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getAnalyticsDataAction, AnalyticsSummary } from '@/app/actions/analytics';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      const data = await getAnalyticsDataAction();
      setAnalytics(data);
      setLoading(false);
    }
    loadAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-semibold text-gray-500">
        جاري جلب وحساب المؤشرات والتقارير العقارية الشاملة...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* العناوين والتحكم الفوري */}
      <div className="bg-white p-5 rounded-xl border border-gray-200">
        <h1 className="text-2xl font-bold text-slate-800">لوحة تحليلات ومؤشرات الأداء (Real-Time Analytics)</h1>
        <p className="text-gray-500 text-sm mt-1">تقارير تجميعية حية لقنوات التسويق، جغرافيا المبيعات، ومعدلات التدفق العقاري لشركتكم</p>
      </div>

      {/* بطاقات قياس الأداء الكلية (KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">إجمالي الـ Leads</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{analytics.totalLeads}</p>
          <span className="text-[9px] text-slate-400">عميل مسجل بالكامل</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">حجوزات نشطة (عربونات)</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{analytics.activeBookings}</p>
          <span className="text-[9px] text-amber-500 font-semibold">بإنتظار استكمال التمويل</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">عقود البيع النهائي</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{analytics.closedSales}</p>
          <span className="text-[9px] text-emerald-500 font-semibold">توقيع وإصدار الفاتورة</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">معدل التحويل الكلي</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{analytics.conversionRate}</p>
          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">تحديث لحظي</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">فرص تسويقية مستبعدة</p>
          <p className="text-3xl font-black text-rose-600 mt-2">{analytics.lostLeads}</p>
          <span className="text-[9px] text-rose-500 font-semibold">عدم تلاءم ميزانية/تمويل</span>
        </div>
      </div>

      {/* الرسوم والتحليلات البصرية الجغرافية والتسويقية وقمع المبيعات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* مخطط حركة العملاء في قمع المبيعات (Sales Pipeline) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">مراحل قمع المبيعات (Sales Pipeline Stages)</h3>
          
          <div className="space-y-4">
            {analytics.pipelineStages.map((stage) => (
              <div key={stage.status}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">{stage.status}</span>
                  <span className="text-slate-500">{stage.count} عميل ({stage.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* كفاءة الحملات الإعلانية ومصادر توليد العملاء والمدن */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          
          {/* قسم مصادر الإعلانات */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">كفاءة قنوات التسويق والمصادر</h3>
            {analytics.sourcesBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد بيانات تسويقية حية حالياً للتحليل.</p>
            ) : (
              <div className="space-y-2">
                {analytics.sourcesBreakdown.map((src) => (
                  <div key={src.source} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-700">{src.source}</span>
                    <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      {src.count} عملاء
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* قسم جغرافيا المبيعات بالمدن */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-800 text-sm pb-2 border-b">التوزيع الجغرافي للمبيعات والطلب</h3>
            {analytics.citiesBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد جغرافيا مسجلة حالياً للتحليل.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {analytics.citiesBreakdown.map((city) => (
                  <div key={city.city} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <p className="text-[10px] text-gray-400 font-bold">{city.city}</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{city.count}</p>
                    <span className="text-[9px] text-slate-500">عميل محلي</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}