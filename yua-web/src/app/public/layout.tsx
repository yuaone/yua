// app/(public)/layout.tsx
"use client";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-screen bg-gray-50 flex">
      <div className="m-auto w-full max-w-[420px] px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="text-2xl font-semibold tracking-tight">YUA</div>
          <div className="mt-2 text-sm text-gray-500">
            AI 기반 워크스페이스 · 대화 · 프로젝트
          </div>
        </div>

        <div className="rounded-2xl border bg-white px-6 py-6 sm:px-8 sm:py-8 shadow-sm">
          {children}
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} YUA
        </div>
      </div>
    </div>
  );
}
