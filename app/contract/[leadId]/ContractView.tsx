// app/contract/[leadId]/ContractView.tsx
'use client';

import React, { useState } from 'react';
import { saveContractTermsAction } from '@/app/actions/contract';
import SmartCard from '@/components/ui/SmartCard';
import { toast } from '@/app/context/ToastContext';

const DEFAULT_TERMS = 
`1. يعتبر هذا الحجز مبدئياً وصالحاً لمدة (15) يوماً من تاريخ إصدار هذه الوثيقة لاستكمال الإجراءات البنكية.
2. يلتزم الطرف الثاني (العميل) بتقديم كافة الأوراق والمستندات والتعريف بالراتب لمستشار المبيعات خلال المدة المحددة.
3. يعد مبلغ العربون جزءاً من الدفعة الأولى ولا يمكن استرداده في حال تراجع العميل عن الشراء بعد مضي المدة النظامية.
4. تلتزم المنشأة العقارية بحفظ وتجميد الوحدة المحجوزة وعدم عرضها لمشترين آخرين طوال فترة سريان العقد المبدئي.`;

export function ContractView({ lead, tenant, isAdmin }: { lead: any; tenant: any; isAdmin: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [terms, setTerms] = useState(tenant.contractTerms || DEFAULT_TERMS);
  const [loading, setLoading] = useState(false);

  const handleSaveTerms = async () => {
    setLoading(true);
    const result = await saveContractTermsAction(terms);
    setLoading(false);
    if (result.success) {
      setIsEditing(false);
    } else {
      toast.error("فشل حفظ البنود: " + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-lightBg dark:bg-void py-6 px-4 md:px-0 print:bg-white print:py-0 text-right font-sans antialiased text-slate-900 dark:text-white transition-colors duration-300" dir="rtl">
      
      {/* هيدر التحكم العلوي - يختفي تلقائياً أثناء الطباعة والحفظ كـ PDF */}
      <SmartCard className="max-w-3xl mx-auto mb-4 p-4 flex items-center justify-between shadow-lg print:hidden border-slate-200/50 dark:border-white/10">
        <div>
          <h3 className="text-xs font-black text-amber-500">وثيقة الحجوزات العقارية المعتمدة</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">تعديل بنود العقد وطباعة وحفظ الوثيقة بصفحة واحدة قياسية (A4)</p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="bg-[var(--nc-surface)] dark:bg-white/5 hover:bg-[var(--nc-surface)] dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300/50 dark:border-white/10 cursor-pointer transition-all"
            >
              {isEditing ? 'إلغاء التعديل ✕' : '📝 تعديل بنود الشروط'}
            </button>
          )}
          <button 
            onClick={() => window.print()}
            className="bg-corporate-blue dark:bg-cyan-glow hover:opacity-95 text-white dark:text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
          >
            🖨️ طباعة وحفظ كـ PDF
          </button>
        </div>
      </SmartCard>

      {/* نموذج وثيقة عقد الحجز الموحد المطور والمصمم ليتسع بدقة بصفحة واحدة (A4 Layout) */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-[var(--nc-surface)] p-8 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-xl print:shadow-none print:border-none print:p-0 space-y-5 relative text-slate-900 dark:text-white">
        
        {/* هيدر الوثيقة الرسمي */}
        <div className="flex items-center justify-between border-b border-slate-900 dark:border-white/20 pb-4">
          <div className="space-y-1">
            <h1 className="text-base font-black text-slate-900 dark:text-white">{tenant.companyName}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-bold">إدارة المبيعات والتسويق العقاري</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">تاريخ الإصدار: {new Date(lead.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>
          
          <div className="text-left space-y-1">
            <h2 className="text-base font-black text-amber-600">وثيقة حجز عقاري مبدئي</h2>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">رقم المعاملة: #RE-{lead.id.substring(0, 8).toUpperCase()}</p>
            <span className="inline-block text-[8px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-900/30">
              حجز مؤكد ومستوفى
            </span>
          </div>
        </div>

        {/* تمهيد العقد */}
        <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          بناءً على رغبة الطرف الثاني المذكور أدناه في حجز وحدة سكنية ببرنامج البيع على الخارطة والجاهز، فقد تم الاتفاق والتوثيق المبدئي بين المنشأة العقارية والعميل على شروط الحجز المدرجة في هذه الوثيقة.
        </div>

        {/* 1. بيانات المطور والمشتري بالتناسق */}
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl space-y-1.5 border border-slate-200/50 dark:border-white/5">
            <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1 mb-1.5">بيانات الطرف الأول (المطور):</h3>
            <p className="text-slate-600 dark:text-slate-300">اسم المنشأة: <span className="font-bold text-slate-900 dark:text-white">{tenant.companyName}</span></p>
            <p className="text-slate-600 dark:text-slate-300">مقر الشركة الرئيسي: <span className="font-bold text-slate-900 dark:text-white">{lead.city}</span></p>
            <p className="text-slate-600 dark:text-slate-300">الحالة القانونية: <span className="font-bold text-slate-900 dark:text-white">مطور عقاري مرخص</span></p>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl space-y-1.5 border border-slate-200/50 dark:border-white/5">
            <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1 mb-1.5">بيانات الطرف الثاني (العميل):</h3>
            <p className="text-slate-600 dark:text-slate-300">اسم العميل: <span className="font-bold text-slate-900 dark:text-white">{lead.firstName} {lead.lastName || ""}</span></p>
            <p className="text-slate-600 dark:text-slate-300">رقم الجوال: <span className="font-bold text-slate-900 dark:text-white" dir="ltr">{lead.phone}</span></p>
            <p className="text-slate-600 dark:text-slate-300">المدينة: <span className="font-bold text-slate-900 dark:text-white">{lead.city}</span></p>
          </div>
        </div>

        {/* 2. تفاصيل الوحدة المحجوزة والأسعار */}
        {lead.project && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">بيانات الوحدة العقارية والمالية:</h3>
            <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-[11px] text-right">
                <thead className="bg-slate-50 dark:bg-[var(--nc-surface)] text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-2">المشروع العقاري</th>
                    <th className="px-4 py-2">المدينة</th>
                    <th className="px-4 py-2">قيمة العقار التقريبية</th>
                    <th className="px-4 py-2">العربون المدفوع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="text-slate-900 dark:text-slate-200">
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{lead.project.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{lead.project.city}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                      {lead.project.minPrice ? `${Number(lead.project.minPrice).toLocaleString('ar-SA')} ر.س` : 'غير محدد'}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">5,000 ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. الشروط والأحكام - تدعم التعديل الحي والمستمر للمدراء وسحبها سحابياً */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">الشروط والأحكام العامة للحجز:</h3>
          
          {isEditing ? (
            /* نموذج التعديل الحي لمدير المنشأة */
            <div className="space-y-2 print:hidden">
              <textarea 
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                className="w-full bg-white dark:bg-[var(--nc-surface)] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[10px] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="اكتب بنود عقد شركتك المخصصة هنا (كل بند في سطر مستقل)..."
              />
              <button 
                onClick={handleSaveTerms}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                {loading ? 'جاري حفظ التعديل...' : '✔ حفظ وتثبيت البنود سحابياً'}
              </button>
            </div>
          ) : (
            /* استعراض البنود من قاعدة البيانات المحدثة */
            <ul className="text-[10px] text-slate-600 dark:text-slate-350 space-y-1.5 list-decimal list-inside leading-relaxed">
              {terms.split('\n').map((term: string, idx: number) => (
                <li key={idx}>{term}</li>
              ))}
            </ul>
          )}
        </div>

        {/* 4. التوقيعات المعتمدة - منسقة لتظهر في نفس الصفحة */}
        <div className="grid grid-cols-2 gap-12 pt-6 text-[11px] border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-4 text-center">
            <p className="font-bold text-slate-900 dark:text-white">توقيع ومصادقة الطرف الأول (المطور):</p>
            <div className="h-12 flex items-center justify-center border-b border-dashed border-slate-300 dark:border-slate-700 max-w-[180px] mx-auto text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
              [ ختم المنشأة الإلكتروني ]
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">{tenant.companyName}</p>
          </div>

          <div className="space-y-4 text-center">
            <p className="font-bold text-slate-900 dark:text-white">توقيع ومصادقة الطرف الثاني (العميل):</p>
            <div className="h-12 border-b border-dashed border-slate-300 dark:border-slate-700 max-w-[180px] mx-auto" />
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">{lead.firstName} {lead.lastName || ""}</p>
          </div>
        </div>

        {/* الفوتر الجمالي */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-[8px] text-slate-400 dark:text-slate-500">
          هذه الوثيقة تم توليدها آلياً بشكل مشفر من نظام ORCA العقاري المعتمد وتخضع للوائح الهيئة العامة للعقار بالمملكة العربية السعودية.
        </div>

      </div>
    </div>
  );
}
