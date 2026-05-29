// app/context/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Lang = 'AR' | 'EN';

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Lang>('AR');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: savedTheme }));
    }
    const savedLang = localStorage.getItem('lang') as Lang;
    if (savedLang) {
      setLang(savedLang);
      window.dispatchEvent(new CustomEvent('lang-change', { detail: savedLang }));
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  const toggleLang = () => {
    const nextLang = lang === 'AR' ? 'EN' : 'AR';
    setLang(nextLang);
    localStorage.setItem('lang', nextLang);
    window.dispatchEvent(new CustomEvent('lang-change', { detail: nextLang }));
  };

  // المزامنة اللحظية مع ترويسة HTML والـ direction
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.setAttribute('lang', lang === 'AR' ? 'ar' : 'en');
    root.setAttribute('dir', lang === 'AR' ? 'rtl' : 'ltr');
  }, [theme, lang]);

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
