// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ORCA CRM - نظام التطوير العقاري",
  description: "النظام التشغيلي العقاري الأول لإدارة العملاء والمبيعات بالمملكة العربية السعودية",
  // 🔒 منع محرك ترجمة جوجل التلقائي من التدخل في الكود نهائياً
  other: {
    google: "notranslate",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🔒 إضافة خصائص المنع القسرية لجميع المتصفحات لمنع ترجمة التنسيقات
    <html lang="ar" dir="rtl" translate="no" className="notranslate">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}