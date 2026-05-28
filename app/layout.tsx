import type { Metadata } from "next";
import "./globals.css";
import Script from 'next/script';
import { AppHeader } from '@/components/AppHeader';

export const metadata: Metadata = {
  title: "Oracle-X | 아시아 No.1 예측마켓",
  description: "XRP·크립토·거시경제 이슈에 특화된 예측시장. 텔레그램 미니앱으로 즐기세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1e] px-4 py-2 flex justify-center">
          <AppHeader />
        </div>
        <main className="pt-20 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}