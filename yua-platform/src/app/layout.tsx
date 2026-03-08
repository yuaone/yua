import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YUA Platform",
  description: "YUA Developer Platform — API keys, billing, docs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
