"use client";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-screen bg-gray-50 flex flex-col">
      <header className="h-12 sm:h-14 flex items-center px-4 sm:px-6 bg-white border-b">
        <span className="text-lg font-semibold tracking-tight">
          YUA
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-sm px-6 py-8 sm:px-10 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
