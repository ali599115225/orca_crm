import React from 'react';

export const metadata = {
  title: 'إخلاء المسؤولية - أوركا CRM',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">إخلاء المسؤولية</h1>
        <div className="space-y-4 text-sm leading-relaxed opacity-80">
          <p>منصة أوركا CRM هي أداة تقنية لإدارة علاقات العملاء والعمليات العقارية.</p>
          <p>المنصة لا تقدم استشارات قانونية أو مالية.<br/>القرارات التجارية النهائية تقع على مسؤولية المستخدم.</p>
          <p>نحن نسعى لتقديم خدمة دقيقة ولكن لا نضمن خلواً تاماً من الأخطاء.<br/>يتم تقديم الخدمة "كما هي" دون أي ضمانات صريحة أو ضمنية.</p>
        </div>
      </div>
    </div>
  );
}
