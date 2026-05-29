// app/context/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Lang = 'AR' | 'EN';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: savedTheme }));
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('AR');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Lang;
    if (savedLang) {
      setLang(savedLang);
      window.dispatchEvent(new CustomEvent('lang-change', { detail: savedLang }));
    }
  }, []);

  const toggleLang = () => {
    const nextLang = lang === 'AR' ? 'EN' : 'AR';
    setLang(nextLang);
    localStorage.setItem('lang', nextLang);
    window.dispatchEvent(new CustomEvent('lang-change', { detail: nextLang }));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('lang', lang === 'AR' ? 'ar' : 'en');
    root.setAttribute('dir', lang === 'AR' ? 'rtl' : 'ltr');
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </LanguageProvider>
  );
}

export function useApp() {
  const themeContext = useContext(ThemeContext);
  const langContext = useContext(LanguageContext);
  if (!themeContext || !langContext) {
    throw new Error('useApp must be used within AppProvider/ThemeProvider/LanguageProvider');
  }
  return {
    theme: themeContext.theme,
    toggleTheme: themeContext.toggleTheme,
    lang: langContext.lang,
    toggleLang: langContext.toggleLang,
  };
}
