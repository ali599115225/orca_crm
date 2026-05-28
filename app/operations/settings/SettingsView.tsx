// app/operations/settings/SettingsView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initiateSubscriptionPaymentAction, initiateAddonPaymentAction } from '@/app/actions/payment';
import { createTenantUserAction, updateTenantUserAction, deleteTenantUserAction } from '@/app/actions/users';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsViewProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  users?: User[];
  currentUserRole?: string;
}

const PLAN_LIMITS: Record<string, number> = {
  basic: 2,
  silver: 10,
  gold: 99999, // لا محدود
};

const PLAN_TITLES: Record<string, string> = {
  basic: "الباقة الأساسية",
  silver: "الباقة الفضية",
  gold: "الباقة الذهبية",
};

const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: "المدير العام (Admin)",
  SALES_MANAGER: "مدير المبيعات",
  SALES_EMPLOYEE: "مستشار عقاري",
  MARKETING: "إدارة التسويق",
  READ_ONLY: "مشاهدة فقط",
};

export default function SettingsView({ tenant, users = [], currentUserRole = "READ_ONLY" }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'billing' | 'staff'>('billing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // حالات الوكلاء الإضافيين
  const [agentCount, setAgentCount] = useState(1);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // حالات إدارة الموظفين
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    if (successMsg) setSuccess(successMsg);
    if (errorMsg) setError(errorMsg);
  }, [searchParams]);

  const handleUpgrade = async (plan: "basic" | "silver" | "gold") => {
    setSuccess(null);
    setError(null);
    setLoadingPlan(plan);

    // تحويل الاسم البرمجي ليتوافق مع ترقيات الدفع الميسر
    // profesional -> silver, enterprise -> gold
    const paymentPlan = plan === 'silver' ? 'professional' : plan === 'gold' ? 'enterprise' : plan;

    const result = await initiateSubscriptionPaymentAction(paymentPlan as any);
    setLoadingPlan(null);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || "عذراً، فشل بدء عملية الدفع والاتصال بالبوابة.");
    }
  };

  const handleBuyAgents = async () => {
    setSuccess(null);
    setError(null);
    setLoadingAgent(true);

    const result = await initiateAddonPaymentAction(agentCount);
    setLoadingAgent(false);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || "عذراً، فشل بدء عملية الدفع لشراء الوكلاء.");
    }
  };

  // عمليات الموظفين
  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoadingCreate(true);

    const formData = new FormData(e.currentTarget);
    const result = await createTenantUserAction(formData);
    setLoadingCreate(false);

    if (result.success) {
      setSuccess("تم إضافة الموظف الجديد بنجاح وتفعيل حسابه بالنظام.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setError(result.error || "عذراً، فشل إنشاء حساب الموظف.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    setSuccess(null);
    setError(null);
    setLoadingActionId(user.id);

    const formData = new FormData();
    formData.append("name", user.name);
    formData.append("role", user.role);
    formData.append("isActive", (!user.isActive).toString());

    const result = await updateTenantUserAction(user.id, formData);
    setLoadingActionId(null);

    if (result.success) {
      setSuccess(`تم ${user.isActive ? 'تعطيل' : 'تفعيل'} حساب الموظف بنجاح.`);
      router.refresh();
    } else {
      setError(result.error || "فشل تعديل حالة الموظف.");
    }
  };

  const handleEditRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setSuccess(null);
    setError(null);
    setLoadingActionId(editingUser.id);

    const formData = new FormData(e.currentTarget);
    formData.append("isActive", editingUser.isActive.toString());

    const result = await updateTenantUserAction(editingUser.id, formData);
    setLoadingActionId(null);
    setEditingUser(null);

    if (result.success) {
      setSuccess("تم تحديث صلاحيات وبيانات الموظف بنجاح.");
      router.refresh();
    } else {
      setError(result.error || "فشل تعديل بيانات الموظف.");
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً من شركتك العقارية؟")) return;

    setSuccess(null);
    setError(null);
    setLoadingActionId(userId);

    const result = await deleteTenantUserAction(userId);
    setLoadingActionId(null);

    if (result.success) {
      setSuccess("تم حذف حساب الموظف بالكامل وتحرير مقعد في باقتك.");
      router.refresh();
    } else {
      setError(result.error || "فشل عملية حذف الموظف.");
    }
  };

  const plan = (tenant.subscriptionPlan || "basic").toLowerCase();
  const limit = PLAN_LIMITS[plan] || 2;
  const currentUsersCount = users.length;
  const isLimitReached = currentUsersCount >= limit;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Calibri', sans-serif" }}>
      
      {/* الهيدر الموحد */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">إعدادات النظام والعمليات السحابية (SaaS Settings)</h1>
          <p className="text-gray-500 text-xs mt-1">تخصيص وإدارة اشتراكك العقاري، وإدارة حسابات موظفي المبيعات والوصول</p>
        </div>
        <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-4 py-2 rounded-xl font-bold text-xs shrink-0 text-center">
          الباقة الحالية: {PLAN_TITLES[plan] || tenant.subscriptionPlan}
        </div>
      </div>

      {/* شريط علامات التبويب (Tabs) */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-amber-500 text-amber-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-slate-800'
          }`}
        >
          💳 باقة الاشتراك والترقيات
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'border-amber-500 text-amber-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-slate-800'
          }`}
        >
          👥 إدارة فريق العمل ({currentUsersCount} موظف)
        </button>
      </div>

      {/* التنبيهات العامة */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      {/* التبويب الأول: الاشتراكات والترقيات */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* تفاصيل المنشأة */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xs font-extrabold text-slate-800 border-b pb-2 mb-4">بيانات الشركة ومستأجر النظام</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">اسم المنشأة العقارية</label>
                  <input type="text" disabled className="w-full bg-gray-50 border rounded-lg p-2.5 text-xs text-gray-700 font-bold" value={tenant.companyName} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">النطاق الفرعي (Subdomain)</label>
                  <div className="flex" dir="ltr">
                    <span className="bg-gray-100 border border-r-0 rounded-l-lg px-3 py-2.5 text-[10px] text-gray-500">.orca-az-ez.pro</span>
                    <input type="text" disabled className="flex-1 bg-gray-50 border rounded-r-lg p-2.5 text-xs text-gray-700 font-bold text-left" value={tenant.subdomain} />
                  </div>
                </div>
              </div>
            </div>

            {/* الباقات والأسعار */}
            <div className="pt-2">
              <h2 className="text-xs font-extrabold text-slate-800 border-b pb-4 mb-4">باقات وخطط الاشتراك لترقية النظام</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* الباقة الأساسية */}
                <div className={`border rounded-2xl p-6 bg-white flex flex-col justify-between shadow-sm transition-all ${plan === 'basic' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-amber-400'}`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-xs">الباقة الأساسية</h3>
                      {plan === 'basic' && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black">نشطة حالياً</span>}
                    </div>
                    <div className="my-4">
                      <span className="text-2xl font-black text-slate-900">199</span>
                      <span className="text-[10px] text-slate-500 font-medium"> ر.س / شهرياً</span>
                    </div>
                    <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                      <li>✔ حد الموظفين: 2 موظفين بشرين</li>
                      <li>✔ إدخال حتى 500 عميل محتمل</li>
                      <li>✔ إدارة حتى 3 مشاريع عقارية</li>
                      <li>✔ 1 وكيل ذكاء اصطناعي</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('basic')}
                    disabled={loadingPlan !== null || plan === 'basic'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${plan === 'basic' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'}`}
                  >
                    {loadingPlan === 'basic' ? 'جاري التحضير...' : plan === 'basic' ? 'باقتك الحالية' : 'تحويل للباقة (مدى / فيزا)'}
                  </button>
                </div>

                {/* الباقة الفضية */}
                <div className={`border rounded-2xl p-6 bg-amber-50/5 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all ${plan === 'silver' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-amber-400'}`}>
                  {plan !== 'silver' && <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-bold text-[8px] px-3 py-1 rounded-bl-lg"> الأكثر طلباً </span>}
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-xs">الباقة الفضية</h3>
                      {plan === 'silver' && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black">نشطة حالياً</span>}
                    </div>
                    <div className="my-4">
                      <span className="text-2xl font-black text-slate-900">599</span>
                      <span className="text-[10px] text-slate-500 font-medium"> ر.س / شهرياً</span>
                    </div>
                    <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                      <li>✔ حد الموظفين: 10 موظفين بشرين</li>
                      <li>✔ عملاء ومشاريع غير محدودة</li>
                      <li>✔ 3 وكلاء أذكياء وتكامل واتساب</li>
                      <li>✔ تتبع المهام والزيارات للمستشارين</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('silver')}
                    disabled={loadingPlan !== null || plan === 'silver'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${plan === 'silver' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border' : 'bg-amber-500 text-slate-950 hover:bg-amber-600 cursor-pointer'}`}
                  >
                    {loadingPlan === 'silver' ? 'جاري التحضير...' : plan === 'silver' ? 'باقتك الحالية' : 'ترقية للباقة (مدى / فيزا)'}
                  </button>
                </div>

                {/* الباقة الذهبية */}
                <div className={`border rounded-2xl p-6 bg-white flex flex-col justify-between shadow-sm transition-all ${plan === 'gold' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-amber-400'}`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-xs">الباقة الذهبية</h3>
                      {plan === 'gold' && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black">نشطة حالياً</span>}
                    </div>
                    <div className="my-4">
                      <span className="text-2xl font-black text-slate-900">1,199</span>
                      <span className="text-[10px] text-slate-500 font-medium"> ر.س / شهرياً</span>
                    </div>
                    <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                      <li>✔ حد الموظفين: لا محدود (Unlimited)</li>
                      <li>✔ 5 وكلاء ذكاء اصطناعي وتكامل كامل</li>
                      <li>✔ دعم فني وتصميم عقود رسمي</li>
                      <li>✔ لوحة إدارة المشرفين والتحليلات</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => handleUpgrade('gold')}
                    disabled={loadingPlan !== null || plan === 'gold'}
                    className={`w-full mt-6 transition-all p-2.5 rounded-xl text-xs font-bold ${plan === 'gold' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'}`}
                  >
                    {loadingPlan === 'gold' ? 'جاري التحضير...' : plan === 'gold' ? 'باقتك الحالية' : 'ترقية للباقة (مدى / فيزا)'}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* زيادة الوكلاء الآليين */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xs font-extrabold text-slate-800">زيادة سعة وكلاء الذكاء الاصطناعي</h2>
                <p className="text-gray-500 text-[10px] mt-1">شراء وتوسيع سعة قنوات التحدث والرد التلقائي للفريق الآلي</p>
              </div>
              <div className="bg-slate-900 text-amber-500 border border-slate-800 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2">
                <span>الوكلاء المضافون:</span>
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg text-xs font-black">{tenant.extraAgents}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>السعر للوكيل الإضافي:</span>
                    <span className="font-bold text-slate-900">{plan === "basic" ? "75 ر.س" : "60 ر.س"} / شهرياً</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>الحد الأقصى للطلب الواحد:</span>
                    <span className="font-bold text-slate-900">10 وكلاء</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">العدد المطلوب:</span>
                  <div className="flex items-center border rounded-xl overflow-hidden bg-white">
                    <button onClick={() => setAgentCount(prev => Math.max(1, prev - 1))} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border-l cursor-pointer">-</button>
                    <span className="px-5 py-2 text-xs font-bold text-slate-800 w-12 text-center select-none">{agentCount}</span>
                    <button onClick={() => setAgentCount(prev => Math.min(10, prev + 1))} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border-r cursor-pointer">+</button>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col justify-between h-full border border-slate-850">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">تفاصيل التكلفة الإضافية</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-2xl font-black text-amber-500">{agentCount * (plan === "basic" ? 75 : 60)}</span>
                    <span className="text-[10px] text-slate-300"> ر.س إجمالي القيمة</span>
                  </div>
                </div>
                <button
                  onClick={handleBuyAgents}
                  disabled={loadingAgent}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 p-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  {loadingAgent ? "جاري التحضير..." : "شراء وكلاء الآن (مدى / فيزا)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* التبويب الثاني: إدارة الموظفين */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* لوحة التحكم والإضافة */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* مؤشر سعة الموظفين */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800">حالة مقاعد الموظفين بالباقة</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">المقاعد النشطة:</span>
                  <span className="text-slate-800 font-black">
                    {currentUsersCount} / {plan === 'gold' ? 'لا محدود' : limit}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${plan === 'gold' ? 30 : Math.min(100, (currentUsersCount / limit) * 100)}%` }}
                  />
                </div>
                {isLimitReached && (
                  <p className="text-[10px] text-rose-500 font-bold leading-relaxed pt-1">
                    ⚠️ لقد استنفدت كامل مقاعد الموظفين المتاحة لباقة {PLAN_TITLES[plan]}. قم بترقية اشتراكك لفتح مقاعد إضافية.
                  </p>
                )}
              </div>
            </div>

            {/* استمارة إضافة موظف جديد */}
            {currentUserRole === "ADMIN" && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 border-b pb-2">إضافة موظف عقاري جديد</h3>
                
                <form onSubmit={handleAddEmployee} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">الاسم الكامل *</label>
                    <input 
                      type="text" 
                      name="name"
                      required
                      placeholder="أحمد الغامدي" 
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">البريد الإلكتروني المعتمد *</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      placeholder="sales@alinma-gold.com" 
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">دور الصلاحية والنفاذ *</label>
                    <select 
                      name="role"
                      required
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="SALES_EMPLOYEE">مستشار عقاري (مبيعات)</option>
                      <option value="SALES_MANAGER">مدير مبيعات</option>
                      <option value="MARKETING">إدارة تسويق</option>
                      <option value="READ_ONLY">مشاهدة فقط</option>
                      <option value="ADMIN">المدير العام (Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">كلمة المرور الافتراضية *</label>
                    <input 
                      type="text" 
                      name="password"
                      required
                      defaultValue="123456"
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingCreate || isLimitReached}
                    className={`w-full p-2.5 rounded-xl text-xs font-black text-center transition-all cursor-pointer ${
                      isLimitReached 
                        ? 'bg-gray-100 text-gray-400 border cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    }`}
                  >
                    {loadingCreate ? "جاري إنشاء الحساب..." : "إنشاء حساب الموظف ➔"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* قائمة الموظفين */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* مودال تعديل الصلاحية المصغر */}
            {editingUser && (
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800">تعديل صلاحيات الموظف: <span className="text-amber-600">{editingUser.name}</span></h4>
                  <button onClick={() => setEditingUser(null)} className="text-xs text-gray-400 hover:text-slate-800">✕ إلغاء</button>
                </div>
                <form onSubmit={handleEditRole} className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[9px] font-bold text-gray-500 mb-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      name="name" 
                      defaultValue={editingUser.name}
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[9px] font-bold text-gray-500 mb-1">دور الصلاحية</label>
                    <select 
                      name="role" 
                      defaultValue={editingUser.role}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="SALES_EMPLOYEE">مستشار عقاري (مبيعات)</option>
                      <option value="SALES_MANAGER">مدير مبيعات</option>
                      <option value="MARKETING">إدارة تسويق</option>
                      <option value="READ_ONLY">مشاهدة فقط</option>
                      <option value="ADMIN">المدير العام (Admin)</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    حفظ التغييرات
                  </button>
                </form>
              </div>
            )}

            {/* جدول الموظفين */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="text-xs font-extrabold text-slate-800">قائمة حسابات فريق العمل العقاري</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-gray-150">
                    <tr>
                      <th className="p-4">الاسم والبريد</th>
                      <th className="p-4">الصلاحية</th>
                      <th className="p-4">الحالة</th>
                      {currentUserRole === "ADMIN" && <th className="p-4 text-center">الإجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-extrabold text-slate-800">{user.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">{user.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-bold text-[10px]">
                            {ROLE_TRANSLATIONS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] border ${
                            user.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {user.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        {currentUserRole === "ADMIN" && (
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* تعديل الصلاحيات */}
                              <button
                                onClick={() => setEditingUser(user)}
                                disabled={loadingActionId !== null}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                📝 تعديل
                              </button>
                              
                              {/* تفعيل / تعطيل */}
                              <button
                                onClick={() => handleToggleStatus(user)}
                                disabled={loadingActionId !== null}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                                  user.isActive 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                                }`}
                              >
                                {loadingActionId === user.id ? '...' : user.isActive ? '🚫 تعطيل' : '✔ تفعيل'}
                              </button>

                              {/* حذف موظف */}
                              <button
                                onClick={() => handleDeleteEmployee(user.id)}
                                disabled={loadingActionId !== null}
                                className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  لا يوجد موظفين مسجلين حالياً في منشأتك.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
