'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';

export default function RootHtml({ children }: { children: React.ReactNode }) {
  const { theme, lang } = useApp();
  const currentLang = lang === 'AR' ? 'ar' : 'en';
  const currentTheme = theme;

  return (
    <html 
      lang={currentLang} 
      dir={currentLang === 'AR' ? 'rtl' : 'ltr'} 
      translate="no" 
      className={`notranslate ${currentTheme}`}
      {...{ class: currentTheme }}
    >
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
        {children}
      </body>
    </html>
  );
}
