// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "YUA",
  description: "AI workspace project and chat system",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/icon-512.svg", type: "image/svg+xml", sizes: "180x180" }],
    other: [
      {
        rel: "icon",
        url: "/icon-192.svg",
        type: "image/svg+xml",
        sizes: "192x192",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try{
    const mode = localStorage.getItem("yua.theme");
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const isDark =
      mode === "dark" ||
      (mode === "system" && mql.matches);

    if(isDark){
      document.documentElement.classList.add("dark");
    }
  }catch(e){}
})();
(function () {
  try {
    var mode = localStorage.getItem("yua.theme");
    var mql = window.matchMedia("(prefers-color-scheme: dark)");

    var isDark =
      mode === "dark" ||
      (!mode && mql.matches) ||
      (mode === "system" && mql.matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();

            `,
          }}
        />
      </head>
      <body
        className="
          h-dvh w-full
          antialiased bg-[var(--app-bg)] text-[var(--ink-2)]
        "
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
