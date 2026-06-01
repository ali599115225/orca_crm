'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';
import { usePathname } from 'next/navigation';
import TopBarClient from './TopBarClient';
import { logoutAction } from '@/app/actions/auth';

export default function RootHtml({ 
  children,
  initialName = "",
  userRoleKey = "READ_ONLY",
  isSuperAdmin = false,
}: { 
  children: React.ReactNode;
  initialName?: string;
  userRoleKey?: string;
  isSuperAdmin?: boolean;
}) {
  const { theme, lang } = useApp();
  const currentLang = lang === 'AR' ? 'ar' : 'en';
  const currentTheme = theme;
  const pathname = usePathname();
  const isOperations = pathname?.startsWith('/operations');

  const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
    AR: {
      ADMIN: "المدير العام",
      SALES_MANAGER: "مدير المبيعات",
      SALES_EMPLOYEE: "مستشار عقاري",
      MARKETING: "إدارة التسويق",
      READ_ONLY: "مشاهدة فقط",
    },
    EN: {
      ADMIN: "General Manager",
      SALES_MANAGER: "Sales Manager",
      SALES_EMPLOYEE: "Real Estate Consultant",
      MARKETING: "Marketing Department",
      READ_ONLY: "Read Only",
    }
  };

  const roleTranslated = ROLE_TRANSLATIONS[lang]?.[userRoleKey] || ROLE_TRANSLATIONS.AR[userRoleKey] || userRoleKey;

  return (
    <html lang={currentLang} dir={currentLang === 'ar' ? 'rtl' : 'ltr'} className={currentTheme}>
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
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen antialiased flex flex-col">
        {isOperations && (
          <TopBarClient 
            initialName={initialName} 
            initialRole={roleTranslated} 
            isSuperAdmin={isSuperAdmin}
            logoutAction={logoutAction}
          />
        )}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}
