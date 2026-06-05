// app/contract/[leadId]/ContractView.tsx
'use client';

import React, { useState } from 'react';
import { saveContractTermsAction } from '@/app/actions/contract';

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
      alert("فشل حفظ البنود: " + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:px-0 print:bg-white print:py-0 text-right font-sans antialiased" dir="rtl">
      
      {/* هيدر التحكم العلوي - يختفي تلقائياً أثناء الطباعة والحفظ كـ PDF */}
      <div className="max-w-3xl mx-auto mb-4 bg-[#1C2B48] text-white p-4 rounded-xl flex items-center justify-between shadow-lg print:hidden">
        <div>
          <h3 className="text-xs font-black text-amber-500">وثيقة الحجوزات العقارية المعتمدة</h3>
          <p className="text-[10px] text-[#C4D8E5] font-medium mt-0.5">تعديل بنود العقد وطباعة وحفظ الوثيقة بصفحة واحدة قياسية (A4)</p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="bg-[#1C2B48] hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
            >
              {isEditing ? 'إلغاء التعديل ✕' : '📝 تعديل بنود الشروط'}
            </button>
          )}
          <button 
            onClick={() => window.print()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
          >
            🖨️ طباعة وحفظ كـ PDF
          </button>
        </div>
      </div>

      {/* نموذج وثيقة عقد الحجز الموحد المطور والمصمم ليتسع بدقة بصفحة واحدة (A4 Layout) */}
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-xl print:shadow-none print:border-none print:p-0 space-y-5 relative">
        
        {/* هيدر الوثيقة الرسمي */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="space-y-1">
            <h1 className="text-base font-black text-[#E8ECEF] font-bold">{tenant.companyName}</h1>
            <p className="text-[10px] text-[#C4D8E5] font-medium font-bold">إدارة المبيعات والتسويق العقاري</p>
            <p className="text-[9px] text-[#C4D8E5] font-medium font-semibold">تاريخ الإصدار: {new Date(lead.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>
          
          <div className="text-left space-y-1">
            <h2 className="text-base font-black text-amber-600">وثيقة حجز عقاري مبدئي</h2>
            <p className="text-[9px] text-[#C4D8E5] font-medium font-bold">رقم المعاملة: #RE-{lead.id.substring(0, 8).toUpperCase()}</p>
            <span className="inline-block text-[8px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded font-bold border border-emerald-200">
              حجز مؤكد ومستوفى
            </span>
          </div>
        </div>

        {/* تمهيد العقد */}
        <div className="text-[11px] leading-relaxed text-[#C4D8E5] font-medium">
          بناءً على رغبة الطرف الثاني المذكور أدناه في حجز وحدة سكنية ببرنامج البيع على الخارطة والجاهز، فقد تم الاتفاق والتوثيق المبدئي بين المنشأة العقارية والعميل على شروط الحجز المدرجة في هذه الوثيقة.
        </div>

        {/* 1. بيانات المطور والمشتري بالتناسق */}
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100">
            <h3 className="font-bold text-[#E8ECEF] font-bold border-b pb-1 mb-1.5">بيانات الطرف الأول (المطور):</h3>
            <p>اسم المنشأة: <span className="font-bold text-slate-700">{tenant.companyName}</span></p>
            <p>مقر الشركة الرئيسي: <span className="font-bold text-slate-700">{lead.city}</span></p>
            <p>الحالة القانونية: <span className="font-bold text-slate-700">مطور عقاري مرخص</span></p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100">
            <h3 className="font-bold text-[#E8ECEF] font-bold border-b pb-1 mb-1.5">بيانات الطرف الثاني (العميل):</h3>
            <p>اسم العميل: <span className="font-bold text-slate-700">{lead.firstName} {lead.lastName || ""}</span></p>
            <p>رقم الجوال: <span className="font-bold text-slate-700" dir="ltr">{lead.phone}</span></p>
            <p>المدينة: <span className="font-bold text-slate-700">{lead.city}</span></p>
          </div>
        </div>

        {/* 2. تفاصيل الوحدة المحجوزة والأسعار */}
        {lead.project && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#E8ECEF] font-bold border-b pb-1">بيانات الوحدة العقارية والمالية:</h3>
            <div className="overflow-hidden border border-gray-100 rounded-xl">
              <table className="w-full text-[11px] text-right">
                <thead className="bg-slate-50 text-[#C4D8E5] font-medium">
                  <tr>
                    <th className="px-4 py-2">المشروع العقاري</th>
                    <th className="px-4 py-2">المدينة</th>
                    <th className="px-4 py-2">قيمة العقار التقريبية</th>
                    <th className="px-4 py-2">العربون المدفوع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-[#E8ECEF] font-bold">{lead.project.name}</td>
                    <td className="px-4 py-2.5 text-[#C4D8E5] font-medium">{lead.project.city}</td>
                    <td className="px-4 py-2.5 font-bold text-[#E8ECEF] font-bold">
                      {lead.project.minPrice ? `${Number(lead.project.minPrice).toLocaleString('ar-SA')} ر.س` : 'غير محدد'}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">5,000 ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. الشروط والأحكام - تدعم التعديل الحي والمستمر للمدراء وسحبها سحابياً */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#E8ECEF] font-bold border-b pb-1">الشروط والأحكام العامة للحجز:</h3>
          
          {isEditing ? (
            /* نموذج التعديل الحي لمدير المنشأة */
            <div className="space-y-2 print:hidden">
              <textarea 
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-3 text-[10px] text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
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
            <ul className="text-[10px] text-[#C4D8E5] font-medium space-y-1.5 list-decimal list-inside leading-relaxed">
              {terms.split('\n').map((term: string, idx: number) => (
                <li key={idx}>{term}</li>
              ))}
            </ul>
          )}
        </div>

        {/* 4. التوقيعات المعتمدة - منسقة لتظهر في نفس الصفحة */}
        <div className="grid grid-cols-2 gap-12 pt-6 text-[11px] border-t">
          <div className="space-y-4 text-center">
            <p className="font-bold text-[#E8ECEF] font-bold">توقيع ومصادقة الطرف الأول (المطور):</p>
            <div className="h-12 flex items-center justify-center border-b border-dashed border-slate-300 max-w-[180px] mx-auto text-[#C4D8E5] font-medium font-semibold text-[10px]">
              [ ختم المنشأة الإلكتروني ]
            </div>
            <p className="text-[9px] text-[#C4D8E5] font-medium font-semibold">{tenant.companyName}</p>
          </div>

          <div className="space-y-4 text-center">
            <p className="font-bold text-[#E8ECEF] font-bold">توقيع ومصادقة الطرف الثاني (العميل):</p>
            <div className="h-12 border-b border-dashed border-slate-300 max-w-[180px] mx-auto" />
            <p className="text-[9px] text-[#C4D8E5] font-medium font-semibold">{lead.firstName} {lead.lastName || ""}</p>
          </div>
        </div>

        {/* الفوتر الجمالي */}
        <div className="pt-4 border-t text-center text-[8px] text-[#C4D8E5] font-medium">
          هذه الوثيقة تم توليدها آلياً بشكل مشفر من نظام ORCA العقاري المعتمد وتخضع للوائح الهيئة العامة للعقار بالمملكة العربية السعودية.
        </div>

      </div>
    </div>
  );
}
