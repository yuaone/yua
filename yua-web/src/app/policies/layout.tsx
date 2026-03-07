"use client";

import Link from "next/link";
import type { Route } from "next";

export default function PoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111]">
      <header className="border-b bg-white dark:bg-[#1a1a1a] dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4">
          <Link href={"/" as Route} className="text-lg font-semibold text-gray-900 dark:text-white">
            YUA
          </Link>

          <nav className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <Link href={"/policies/terms" as Route} className="hover:text-gray-900 dark:hover:text-white transition">
              이용약관
            </Link>
            <Link href={"/policies/privacy" as Route} className="hover:text-gray-900 dark:hover:text-white transition">
              개인정보처리방침
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </div>

      <footer className="mt-20 border-t bg-white dark:bg-[#1a1a1a] dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} 유아원 (YuaOne). All rights reserved.
        </div>
      </footer>
    </div>
  );
}
