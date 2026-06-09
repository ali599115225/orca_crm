import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider, LanguageProvider } from "@/app/context/AppContext";
import Script from 'next/script';
import { AuthProvider } from "@/app/context/AuthContext";
import { UIBusProvider } from "@/app/context/UIBusContext";
import { ToastProvider } from "@/app/context/ToastContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: 'ORCA CRM',
  description: 'نظام إدارة علاقات العملاء العقاري - مؤسسة أبعاد السكنية',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  icons: {
    apple: '/logo.png',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://unpkg.com" />
      </head>
      <body className="font-sans text-[var(--nc-text-primary)] transition-colors duration-300 h-screen w-screen overflow-hidden fixed inset-0 antialiased selection:bg-[var(--nc-accent-soft)] selection:text-[var(--nc-accent)]">
        <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--nc-coral-bg)] blur-[100px] pointer-events-none z-0 transition-colors duration-300" />
        <div className="fixed -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-[var(--nc-coral-bg)] blur-[130px] pointer-events-none z-0 transition-colors duration-300" />

        <div className="relative z-10 h-full flex flex-col">
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <UIBusProvider>
                  <ToastProvider>
                    <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                  </ToastProvider>
                </UIBusProvider>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </div>
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="lazyOnload" />
      </body>
    </html>
  )
}

