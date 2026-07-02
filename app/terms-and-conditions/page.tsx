import React from 'react';
import { isDedicatedCopyDeployment } from "@/lib/deployment-license";

export const metadata = {
  title: 'الأحكام والشروط - أوركا CRM',
};

export default function TermsPage() {
  const isDedicated = isDedicatedCopyDeployment();

  return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">الأحكام والشروط</h1>
        <div className="space-y-4 text-sm leading-relaxed opacity-80">
          {isDedicated ? (
            <>
              <p>باستخدامك لنسخة أوركا CRM المستقلة فإنك توافق على أحكام الترخيص التالية:</p>
              <p>١. الترخيص: هذه النسخة مرخصة للاستخدام المستقل ضمن النطاق المتفق عليه في عقد الترخيص.<br/>٢. لا يوجد اشتراك شهري أو تجديد تلقائي. الاستخدام يخضع لشروط عقد الترخيص المبرم.<br/>٣. الدعم والتحديثات: يتم تقديم الدعم الفني والتحديثات وفقاً لما هو محدد في عقد الترخيص.<br/>٤. حظر إعادة البيع: يمنع إعادة بيع أو نسخ أو توزيع هذه النسخة دون إذن خطي صريح.<br/>٥. ملكية البيانات: جميع بيانات العميل المدمجة في النظام مملوكة للعميل بالكامل.<br/>٦. الاستخدام القانوني: يجب استخدام المنصة وفقاً للأنظمة والقوانين المعمول بها.</p>
              <p>للاستفسارات: legal@orca-crm.com</p>
            </>
          ) : (
            <>
              <p>باستخدامك لمنصة أوركا CRM فإنك توافق على الأحكام والشروط التالية:</p>
              <p>١. الاشتراك: الخدمة مقدمة بنظام الاشتراك الشهري. يتم تجديد الاشتراك تلقائياً.<br/>٢. الإلغاء: يمكن إلغاء الاشتراك في أي وقت. لا يتم استرداد المبالغ المدفوعة جزئياً.<br/>٣. الاستخدام: يلتزم المستخدم بعدم استخدام المنصة في أي نشاط غير قانوني.<br/>٤. الملكية الفكرية: جميع حقوق المنصة محفوظة لشركة أوركا.</p>
              <p>للاستفسارات: legal@orca-crm.com</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
