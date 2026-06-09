import React from 'react';

export const metadata = {
  title: 'سياسة الخصوصية والأمان - أوركا CRM',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">سياسة الخصوصية والأمان</h1>
        <div className="space-y-4 text-sm leading-relaxed opacity-80">
          <p>نحن في منصة أوركا CRM نلتزم بحماية خصوصية مستخدمينا وبياناتهم.</p>
          <p>يتم جمع البيانات التالية لغرض تقديم الخدمة:<br/>- الاسم، رقم الجوال، البريد الإلكتروني<br/>- بيانات الشركة والسجل التجاري<br/>- سجلات النشاط داخل المنصة</p>
          <p>لا يتم مشاركة بيانات العملاء مع أطراف ثالثة دون موافقة صريحة.<br/>جميع البيانات مشفرة أثناء النقل والتخزين.</p>
          <p>للاستفسارات: privacy@orca-crm.com</p>
        </div>
      </div>
    </div>
  );
}
