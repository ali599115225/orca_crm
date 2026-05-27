// app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTenantsListAction, toggleTenantStatusAction, updateTenantPlanAction } from '@/app/actions/admin';

// تراجم للباقات العقارية والأسعار الشهرية المترابطة بها
const PLAN_DETAILS: Record<string, { label: string; price: number; style: string }> = {
  basic: { label: 'الباقة الأساسية', price: 299, style: 'bg-slate-100 text-slate-700 border-slate-200' },
  professional: { label: 'الباقة الاحترافية', price: 599, style: 'bg-amber-50 text-amber-700 border-amber-200' },
  enterprise: { label: 'باقة الشركات الكبرى', price: 1299, style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTenantsListAction();
        // إذا رجعت البيانات بشكل صحيح = المستخدم أدمن
        setTenants(data);
        setAuthChecked(true);
        setLoading(false);
      } catch (err: any) {
        // إذا فشل التحقق = توجيه لصفحة دخول الأدمن
        if (err.message?.includes('يجب تسجيل الدخول') || err.message?.includes('غير مصرح')) {
          window.location.href = '/admin/login';
        } else {
          setError(err.message || 'خطأ في تحميل البيانات');
          setAuthChecked(true);
          setLoading(false);
        }
      }
    }
    loadData();
  }, []);

  // شاشة التحميل أثناء التحقق
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        fontFamily: "'Cairo', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#a78bfa' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛡️</div>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>جارٍ التحقق من صلاحيات الإدارة...</p>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    setError(null);
    const result = await toggleTenantStatusAction(tenantId, currentStatus);
    if (result.success) {
      const updatedData = await getTenantsListAction();
      setTenants(updatedData);
    } else {
      setError(result.error);
    }
  };

  const handlePlanChange = async (tenantId: string, newPlan: string) => {
    setError(null);
    const result = await updateTenantPlanAction(tenantId, newPlan);
    if (result.success) {
      const updatedData = await getTenantsListAction();
      setTenants(updatedData);
    } else {
      setError(result.error);
    }
  };

  // عمليات حسابية إجمالية للمنصة السحابية بالكامل
  const totalTenants = tenants.length;
  const activeTenantsCount = tenants.filter(t => t.isActive).length;
  const suspendedCount = totalTenants - activeTenantsCount;
  
  // حساب الإيرادات الشهرية المتوقعة للمنصة بالكامل بناءً على خطط اشتراك الشركات النشطة
  const monthlyRevenue = tenants
    .filter(t => t.isActive)
    .reduce((acc, curr) => acc + (PLAN_DETAILS[curr.subscriptionPlan]?.price || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-right p-6 md:p-10 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* هيدر الصفحة والترقية الجمالية */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full border border-amber-500/20">
              بوابة الإدارة الكبرى الكلية - ORCA Super Admin
            </span>
            <h1 className="text-3xl font-black text-white mt-2">لوحة تشغيل وإدارة المنشآت العقارية</h1>
            <p className="text-xs text-slate-400 mt-1">تتبع حسابات المطورين، ترقية الباقات، مراقبة الإيرادات المالية وقاعدة البيانات السحابية [2]</p>
          </div>
          
          <a href="/operations/analytics" className="bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-xs font-bold transition-all">
            ➔ العودة للعمليات التشغيلية
          </a>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-xl font-bold">
            {error}
          </div>
        )}

        {/* كروت قياس وإيرادات السحابة بالكامل (SaaS Metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
            <p className="text-[10px] text-slate-400 font-bold">إجمالي المنشآت العقارية</p>
            <p className="text-3xl font-black text-white mt-2">{loading ? '...' : totalTenants}</p>
            <span className="text-[9px] text-slate-500 font-semibold">مطور عقاري مسجل بالمنصة</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
            <p className="text-[10px] text-slate-400 font-bold">الشركات النشطة (Active Tenants)</p>
            <p className="text-3xl font-black text-emerald-500 mt-2">{loading ? '...' : activeTenantsCount}</p>
            <span className="text-[9px] text-emerald-600 font-semibold">تكامل دورة حياة السحابة</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
            <p className="text-[10px] text-slate-400 font-bold">حسابات معطلة / موقوفة</p>
            <p className="text-3xl font-black text-rose-500 mt-2">{loading ? '...' : suspendedCount}</p>
            <span className="text-[9px] text-rose-600 font-semibold">بسبب انتهاء الاشتراك أو الدفع</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
            <p className="text-[10px] text-slate-400 font-bold">الإيرادات الشهرية المتوقعة (MRR)</p>
            <p className="text-3xl font-black text-amber-500 mt-2">{loading ? '...' : `${monthlyRevenue.toLocaleString('ar-SA')} ر.س`}</p>
            <span className="text-[9px] text-amber-500/80 font-bold">مجموع اشتراكات الباقات النشطة</span>
          </div>
        </div>

        {/* جدول تتبع وإدارة المشتركين بالكامل */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">مستأجري المنصة وحسابات المطورين</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-5 py-3">الشركة والنطاق الفرعي (Subdomain)</th>
                  <th className="px-4 py-3">خطة الاشتراك الحالية</th>
                  <th className="px-4 py-3">حجم العمليات والبيانات</th>
                  <th className="px-4 py-3">تاريخ الانضمام</th>
                  <th className="px-4 py-3">الحالة والتحكم بالنشاط</th>
                  <th className="px-5 py-3">ترقية يدوية للباقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                      جاري فحص واستدعاء بيانات المشتركين العقاريين من السيرفر...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                      لا يوجد أي شركات عقارية مسجلة في قاعدة البيانات حالياً لمراقبتها.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const plan = PLAN_DETAILS[tenant.subscriptionPlan] || { label: tenant.subscriptionPlan, price: 0, style: 'bg-slate-800' };
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-white text-sm">{tenant.companyName}</p>
                          <p className="text-[10px] text-amber-500 font-bold mt-1" dir="ltr">
                            {tenant.subdomain}.orcacrm.sa
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${plan.style}`}>
                            {plan.label} ({plan.price} ر.س)
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2 text-[10px] font-bold">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {tenant._count?.projects || 0} مشاريع
                            </span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {tenant._count?.leads || 0} عملاء
                            </span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {tenant._count?.users || 0} موظفين
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {new Date(tenant.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${tenant.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <button 
                              onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                                tenant.isActive 
                                  ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50' 
                                  : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50'
                              }`}
                            >
                              {tenant.isActive ? 'تعطيل الحساب 🛑' : 'تنشيط الحساب ⚡'}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <select 
                            value={tenant.subscriptionPlan}
                            onChange={(e) => handlePlanChange(tenant.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="basic">الباقة الأساسية</option>
                            <option value="professional">الباقة الاحترافية</option>
                            <option value="enterprise">باقة الشركات الكبرى</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}