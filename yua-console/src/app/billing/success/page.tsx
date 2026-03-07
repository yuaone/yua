"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pid = searchParams.get("pid");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // 🔥 Soft redirect + Animation
  useEffect(() => {
    if (!pid) {
      router.replace("/billing");
      return;
    }

    setLoading(false);

    const timer = setInterval(() => {
      setCountdown((sec) => {
        if (sec <= 1) {
          router.replace("/billing?refresh=1");
          return 0;
        }
        return sec - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pid, router]);

  if (loading) {
    return (
      <div className="p-10 text-black">
        <p className="animate-pulse text-black/60">결제 검증 중...</p>
      </div>
    );
  }

  return (
    <div className="p-10 text-black max-w-2xl mx-auto">
      <div
        className="
        bg-white/80 backdrop-blur-xl border border-black/10 
        rounded-2xl p-10 shadow text-center animate-fade-in
      "
      >
        <h1 className="text-3xl font-bold mb-3">결제가 완료되었습니다 🎉</h1>

        <p className="text-black/70 mb-6">
          결제가 성공적으로 처리되었습니다.<br />
          새로운 크레딧 및 플랜이 적용되었습니다.
        </p>

        {/* PAYMENT INFO CARD */}
        <div
          className="
          bg-white/70 border border-black/10 rounded-xl p-5
          text-left mb-6
        "
        >
          <p className="text-sm text-black/60 mb-1">Payment ID</p>
          <p className="font-mono text-black text-lg">#{pid}</p>
        </div>

        {/* Redirect Countdown */}
        <p className="text-black/50 text-sm mb-4">
          {countdown}초 후 Billing 페이지로 이동합니다...
        </p>

        <button
          onClick={() => router.push("/billing?refresh=1")}
          className="
          mt-2 bg-black text-white px-5 py-2.5 rounded-lg 
          hover:bg-black/80 transition
        "
        >
          즉시 이동하기
        </button>
      </div>

      <p className="text-black/40 text-center mt-6 text-xs">
        * 결제 관련 문의 시 Payment ID를 전달해주세요.
      </p>
    </div>
  );
}
