import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

import ClientLayout from "./ClientLayout";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "YUA ONE Developer Platform",
  description: "YUA ONE · AI Platform · Console · API · Keys",
};

// ✅ MOBILE SSOT (데스크탑 영향 0)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black antialiased">
        {/* 배경 */}
        <div className="fixed inset-0 -z-10 bg-white/70 backdrop-blur-2xl" />

        {/* 🔒 Providers → ClientLayout → UI */}
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
