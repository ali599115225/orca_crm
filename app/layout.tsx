import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  LanguageProvider,
  ThemeProvider,
} from "@/app/context/AppContext";

export const metadata: Metadata = {
  title: "ORCA — The Operating System for Real Estate",
  description:
    "منصة ORCA لإدارة وتشغيل الأصول والمشاريع والعلاقات العقارية.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: dark)",
      color: "#0B1120",
    },
    {
      media: "(prefers-color-scheme: light)",
      color: "#F8FAFC",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="dark"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <LanguageProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
