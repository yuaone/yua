import type { Metadata } from "next";
import "./globals.css";
import AdminSidebar from "@/components/AdminSidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "YUA Admin",
  description: "YUA Internal Admin -- user management, system health, moderation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen antialiased">
        <AdminSidebar />
        <div id="main-wrapper" style={{ marginLeft: 220, minHeight: "100vh", transition: "margin-left 0.2s ease" }}>
          <TopBar />
          <main style={{ padding: "20px 28px", maxWidth: 1440, margin: "0 auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
