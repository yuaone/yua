"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function BillingFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pid = searchParams.get("pid");
  const reason = searchParams.get("reason") ?? "unknown";

  function describe(reason: string): string {
    switch (reason) {
      case "approve_error":
        return "결제 승인 과정에서 오류가 발생했습니다.";
      case "missing_params":
        return "필수 결제 정보가 누락되었습니다.";
      case "payment_not_found":
        return "결제 정보가 존재하지 않습니다.";
      case "already_processed":
        return "이미 처리된 결제입니다.";
      default:
        return "결제가 정상적으로 처리되지 않았습니다.";
    }
  }

  return (
    <div className="p-10 text-black max-w-2xl mx-auto">
      <div
        className="
        bg-white/80 backdrop-blur-xl border border-black/10
        rounded-2xl p-10 shadow text-center animate-fade-in
      "
      >
        <h1 className="text-3xl font-bold text-red-600 mb-3">결제 실패</h1>

        <p className="text-black/70 mb-6">{describe(reason)}</p>

        {/* Info Card */}
        <div
          className="
          bg-white/70 border border-black/10 rounded-xl p-5
          text-left mb-6
        "
        >
          <p className="text-sm text-black/60 mb-1">Payment ID</p>
          <p className="font-mono text-black text-lg">{pid ?? "-"}</p>

          <p className="text-sm text-black/60 mt-4 mb-1">Reason</p>
          <p className="font-mono text-black">{reason}</p>
        </div>

        <button
          onClick={() => router.push("/billing")}
          className="
          mt-4 bg-black text-white px-5 py-2.5 rounded-lg 
          hover:bg-black/80 transition
        "
        >
          Billing 페이지로 돌아가기
        </button>
      </div>

      <p className="text-black/40 text-center mt-6 text-xs">
        * 결제 실패 시 관리자에게 Payment ID를 전달해주세요.
      </p>
    </div>
  );
}
