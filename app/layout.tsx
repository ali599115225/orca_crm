// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider, LanguageProvider } from "@/app/context/AppContext";
import RootHtml from "@/app/components/RootHtml";

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
    <LanguageProvider>
      <ThemeProvider>
        <RootHtml>
          {children}
        </RootHtml>
      </ThemeProvider>
    </LanguageProvider>
  );
}