import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider, LanguageProvider } from "@/app/context/AppContext";
import { UIBusProvider } from "@/app/context/UIBusContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: 'ORCA CRM',
  description: 'نظام إدارة علاقات العملاء العقاري - مؤسسة أبعاد السكنية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        {/* Google Fonts: Cairo for Arabic, Inter for English/Numbers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Phosphor Icons */}
        <script src="https://unpkg.com/@phosphor-icons/web"></script>
      </head>
      <body className="font-sans bg-lightBg dark:bg-void text-slate-900 dark:text-white transition-colors duration-300 min-h-screen relative antialiased selection:bg-[#8EB1D1] selection:text-white">
        {/* Ambient Glow Elements */}
        <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/5 blur-[100px] pointer-events-none z-0 transition-colors duration-300" />
        <div className="fixed -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/5 blur-[130px] pointer-events-none z-0 transition-colors duration-300" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <LanguageProvider>
            <ThemeProvider>
              <UIBusProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </UIBusProvider>
            </ThemeProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}
