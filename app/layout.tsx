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
      <body className="font-sans bg-[#0b1120] text-slate-100 antialiased min-h-screen flex flex-col selection:bg-[#df7b62] selection:text-white">
        <LanguageProvider>
          <ThemeProvider>
            <UIBusProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </UIBusProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
