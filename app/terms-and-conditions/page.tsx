import React from 'react';

export const metadata = {
  title: 'الأحكام والشروط - أوركا CRM',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">الأحكام والشروط</h1>
        <div className="space-y-4 text-sm leading-relaxed opacity-80">
          <p>باستخدامك لمنصة أوركا CRM فإنك توافق على الأحكام والشروط التالية:</p>
          <p>١. الاشتراك: الخدمة مقدمة بنظام الاشتراك الشهري. يتم تجديد الاشتراك تلقائياً.<br/>٢. الإلغاء: يمكن إلغاء الاشتراك في أي وقت. لا يتم استرداد المبالغ المدفوعة جزئياً.<br/>٣. الاستخدام: يلتزم المستخدم بعدم استخدام المنصة في أي نشاط غير قانوني.<br/>٤. الملكية الفكرية: جميع حقوق المنصة محفوظة لشركة أوركا.</p>
          <p>للاستفسارات: legal@orca-crm.com</p>
        </div>
      </div>
    </div>
  );
}
