"use client";

import { useBillingGuard } from "@/hooks/useBillingGuard";
import { useUsageGuard } from "@/hooks/useUsageGuard";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function BillingWarningBanner() {
  const { isSoftLocked, isHardLocked, tier } = useBillingGuard();
  const { isLocked: isUsageLocked, justLocked, cooldownKey } = useUsageGuard();
  const router = useRouter();

  /* =========================
     Billing state
  ========================= */
  const [billingHidden, setBillingHidden] = useState(false);
  const [billingClosing, setBillingClosing] = useState(false);

  const shouldShowBilling = isHardLocked && !billingHidden;

  /* =========================
     Usage 1회 표시 제어
  ========================= */
  const [showUsageModal, setShowUsageModal] = useState(false);

  useEffect(() => {
    if (!justLocked || !cooldownKey) return;

    const alreadyShown = localStorage.getItem(cooldownKey);

    if (!alreadyShown) {
      localStorage.setItem(cooldownKey, "1");
      setShowUsageModal(true);
    }
  }, [justLocked, cooldownKey]);

  /* =========================
     Billing > Usage 우선순위
  ========================= */
  const shouldShowUsage =
    !shouldShowBilling && showUsageModal;

  return (
    <>
      {/* =========================
           Soft Billing Warning (상단 바)
      ========================= */}
      {isSoftLocked && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
              결제 문제가 감지되었습니다.
            </div>
          </div>
        </div>
      )}

      {/* =========================
           Billing Hard Lock Modal
      ========================= */}
      {shouldShowBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
              billingClosing ? "opacity-0" : "opacity-100"
            }`}
          />

          <div
            className={`relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-[var(--line)] shadow-xl p-8 max-md:p-4 text-center transition-all duration-200 ${
              billingClosing
                ? "opacity-0 scale-95"
                : "opacity-100 scale-100"
            }`}
          >
            <div className="text-2xl font-semibold text-gray-900">
              {tier === "free"
                ? "Free 플랜 한도에 도달했습니다."
                : "결제가 만료되었습니다."}
            </div>

            <div className="mt-3 text-base text-gray-600">
              {tier === "free"
                ? "더 많은 사용을 위해 업그레이드하세요."
                : "재결제 후 이용 가능합니다."}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push("/upgrade")}
                className="px-5 py-2.5 bg-gray-700 text-white rounded-xl"
              >
                업그레이드 하기
              </button>

              <button
                onClick={() => {
                  setBillingClosing(true);
                  setTimeout(() => {
                    setBillingHidden(true);
                  }, 180);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
           Usage Modal (1회 표시)
      ========================= */}
      {shouldShowUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-[var(--line)] shadow-xl p-8 max-md:p-4 text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {tier === "free"
                ? "Free 플랜 한도에 도달했습니다."
                : "일일 메시지 한도에 도달했습니다."}
            </div>

            <div className="mt-3 text-base text-gray-600">
              5시간 후 자동으로 다시 사용할 수 있습니다.
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push("/upgrade")}
                className="px-5 py-2.5 bg-gray-700 text-white rounded-xl"
              >
                업그레이드 하기
              </button>

              <button
                onClick={() => setShowUsageModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}