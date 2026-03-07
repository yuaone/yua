"use client";

import React from "react";
import { useRouter } from "next/navigation";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 🔥 실서비스 기준: 콘솔 에러 로깅 포인트
    console.error("[YUA ONE ERROR BOUNDARY]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Error UI — 실제 서비스용 */
/* ------------------------------------------------------------------ */

function ErrorFallback({ error }: { error?: Error }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full glass border border-black/10 rounded-2xl shadow-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-black">
          문제가 발생했습니다
        </h1>

        <p className="text-sm text-black/60">
          콘솔 실행 중 예기치 않은 오류가 발생했습니다.
        </p>

        {error?.message && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 break-all">
            {error.message}
          </div>
        )}

        <div className="flex gap-3 pt-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded-lg bg-black text-white"
          >
            새로고침
          </button>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-sm rounded-lg border border-black/20 text-black"
          >
            홈으로
          </button>
        </div>

        <p className="text-[11px] text-black/40 pt-2">
          YUA ONE Console · Error Recovery Layer
        </p>
      </div>
    </div>
  );
}
