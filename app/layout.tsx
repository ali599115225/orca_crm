// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider, LanguageProvider } from "@/app/context/AppContext";
import RootHtml from "@/app/components/RootHtml";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "ORCA CRM - نظام التطوير العقاري",
  description: "النظام التشغيلي العقاري الأول لإدارة العملاء والمبيعات بالمملكة العربية السعودية",
  // 🔒 منع محرك ترجمة جوجل التلقائي من التدخل في الكود نهائياً
  other: {
    google: "notranslate",
  }
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let initialName = "";
  let userRoleKey = "READ_ONLY";
  let isSuperAdmin = false;

  if (session) {
    initialName = session.name as string || "أحمد الغامدي";
    userRoleKey = session.role as string || "READ_ONLY";
    const user = await prisma.user.findUnique({
      where: { id: session.userId as string }
    });
    const userEmail = user?.email || "";
    isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <RootHtml 
          initialName={initialName} 
          userRoleKey={userRoleKey} 
          isSuperAdmin={isSuperAdmin}
        >
          {children}
        </RootHtml>
      </ThemeProvider>
    </LanguageProvider>
  );
}