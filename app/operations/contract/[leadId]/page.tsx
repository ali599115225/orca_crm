// app/operations/contract/[leadId]/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getActiveTenant } from '@/lib/tenant';
import { PrintButton } from './PrintButton'; // 1. استدعاء الزر التفاعلي الجديد بـ Vercel [1.1.2]

export const metadata = {
  title: "عقد الحجز العقاري المبدئي - أوركا",
};

export default async function ContractPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const tenant = await getActiveTenant();
  const resolvedParams = await params;
  const leadId = resolvedParams.leadId;

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: tenant.id,
    },
    include: {
      project: true,
    }
  });

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500">
        عذراً، لم يتم العثور على وثيقة العقد لهذا العميل أو أنك لا تملك صلاحية الوصول إليها.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 md:px-0 print:bg-white print:py-0 text-right font-sans" dir="rtl">
      
      {/* هيدر التحكم العلوي - يظهر في المتصفح ويختفي تلقائياً أثناء الطباعة */}
      <div className="max-w-3xl mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg print:hidden">
        <div>
          <h3 className="text-xs font-black text-amber-500">منظومة الحجوزات العقارية الموحدة</h3>
          <p className="text-[10px] text-slate-300 mt-1">توليد عقود الحجوزات السكنية والتجارية آلياً من قاعدة البيانات</p>
        </div>
        
        {/* 2. استبدال الزر القديم بزر الطباعة التفاعلي والمستقر سحابياً */}
        <PrintButton />
      </div>

      {/* نموذج وثيقة عقد الحجز الموحد بالمملكة (A4 Layout) */}
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl border border-gray-200 shadow-xl print:shadow-none print:border-none print:p-0 space-y-8 relative">
        
        {/* هيدر الوثيقة الرسمي */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-800">{tenant.companyName}</h1>
            <p className="text-[10px] text-slate-500 font-bold">قسم المبيعات والتسويق العقاري</p>
            <p className="text-[9px] text-slate-400">تاريخ الإصدار: {new Date(lead.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>
          
          <div className="text-left space-y-1">
            <h2 className="text-lg font-black text-amber-600">وثيقة حجز مبدئي</h2>
            <p className="text-[10px] text-slate-500 font-bold">رقم المعاملة: #RE-{lead.id.substring(0, 8).toUpperCase()}</p>
            <span className="inline-block text-[8px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded font-bold border border-emerald-200">
              مقبول ومؤكد
            </span>
          </div>
        </div>

        {/* تمهيد العقد */}
        <div className="text-xs leading-relaxed text-slate-700">
          بناءً على رغبة الطرف الثاني المذكور أدناه في حجز وحدة سكنية ببرنامج البيع على الخارطة والجاهز، فقد تم الاتفاق والتوثيق المبدئي بين المنشأة العقارية والعميل على شروط الحجز المدرجة في هذه الوثيقة.
        </div>

        {/* 1. بيانات الطرف الأول (المطور) والطرف الثاني (المشتري) */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
            <h3 className="font-bold text-slate-800 border-b pb-1.5 mb-2">بيانات الطرف الأول (المطور):</h3>
            <p>اسم المنشأة: <span className="font-bold text-slate-700">{tenant.companyName}</span></p>
            <p>مقر الشركة الرئيسي: <span className="font-bold text-slate-700">{lead.city}</span></p>
            <p>الحالة القانونية: <span className="font-bold text-slate-700">مطور عقاري مرخص</span></p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
            <h3 className="font-bold text-slate-800 border-b pb-1.5 mb-2">بيانات الطرف الثاني (العميل):</h3>
            <p>اسم العميل: <span className="font-bold text-slate-700">{lead.firstName} {lead.lastName || ""}</span></p>
            <p>رقم الجوال: <span className="font-bold text-slate-700" dir="ltr">{lead.phone}</span></p>
            <p>المدينة: <span className="font-bold text-slate-700">{lead.city}</span></p>
          </div>
        </div>

        {/* 2. تفاصيل الوحدة المحجوزة والأسعار */}
        {lead.project && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 border-b pb-2">بيانات الوحدة العقارية والمالية:</h3>
            <div className="overflow-hidden border border-gray-100 rounded-xl">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">المشروع العقاري</th>
                    <th className="px-4 py-2.5">المدينة</th>
                    <th className="px-4 py-2.5">قيمة العقار التقريبية</th>
                    <th className="px-4 py-2.5">العربون المدفوع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{lead.project.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.project.city}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {lead.project.minPrice ? `${Number(lead.project.minPrice).toLocaleString('ar-SA')} ر.س` : 'غير محدد'}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-emerald-600">5,000 ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. الشروط والأحكام المعتمدة */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 border-b pb-2">الشروط والأحكام العامة للحجز:</h3>
          <ul className="text-[10px] text-slate-500 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>يعتبر هذا الحجز مبدئياً وصالحاً لمدة (15) يوماً من تاريخ إصدار هذه الوثيقة لاستكمال الإجراءات البنكية.</li>
            <li>يلتزم الطرف الثاني (العميل) بتقديم كافة الأوراق والمستندات والتعريف بالراتب لمستشار المبيعات خلال المدة المحددة.</li>
            <li>يعد مبلغ العربون جزءاً من الدفعة الأولى ولا يمكن استرداده في حال تراجع العميل عن الشراء بعد مضي المدة النظامية.</li>
            <li>تلتزم المنشأة العقارية بحفظ وتجميد الوحدة المحجوزة وعدم عرضها لمشترين آخرين طوال فترة سريان العقد المبدئي.</li>
          </ul>
        </div>

        {/* 4. التوقيعات المعتمدة */}
        <div className="grid grid-cols-2 gap-12 pt-10 text-xs border-t">
          <div className="space-y-6 text-center">
            <p className="font-bold text-slate-800">توقيع ومصادقة الطرف الأول (المطور):</p>
            <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300 max-w-[200px] mx-auto text-slate-300 font-medium">
              [ ختم المنشأة الإلكتروني ]
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">{tenant.companyName}</p>
          </div>

          <div className="space-y-6 text-center">
            <p className="font-bold text-slate-800">توقيع ومصادقة الطرف الثاني (العميل):</p>
            <div className="h-16 border-b border-dashed border-slate-300 max-w-[200px] mx-auto" />
            <p className="text-[10px] text-slate-500 font-semibold">{lead.firstName} {lead.lastName || ""}</p>
          </div>
        </div>

        {/* الفوتر الجمالي للوثيقة */}
        <div className="pt-8 border-t text-center text-[8px] text-slate-400">
          هذه الوثيقة تم توليدها آلياً بشكل مشفر من نظام ORCA العقاري المعتمد وتخضع للوائح الهيئة العامة للعقار بالمملكة العربية السعودية.
        </div>

      </div>
    </div>
  );
}