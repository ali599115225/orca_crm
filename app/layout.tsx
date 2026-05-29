// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { AppProvider } from "@/app/context/AppContext";

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
    <html lang="ar" dir="rtl" translate="no" className="notranslate dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var savedTheme = localStorage.getItem('theme') || 'dark';
              var savedLang = localStorage.getItem('lang') || 'AR';
              var root = document.documentElement;
              root.classList.remove('dark', 'light');
              root.classList.add(savedTheme);
              root.setAttribute('lang', savedLang === 'AR' ? 'ar' : 'en');
              root.setAttribute('dir', savedLang === 'AR' ? 'rtl' : 'ltr');
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}