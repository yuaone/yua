"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { billingMockUpgrade, type Tier } from "@/lib/api/billing.api";

const PLAN_PRICE: Record<Exclude<Tier, "free">, number> = {
  pro: 17000,
  business: 55000,
  enterprise: 110000,
};

function isTier(v: any): v is Tier {
  return v === "free" || v === "pro" || v === "business" || v === "enterprise";
}

export default function UpgradePage() {
  const { profile, authFetch } = useAuth();
  const params = useSearchParams();

  // ✅ hooks는 항상 최상단 (SSOT)
  const planParam = params.get("plan");
  const returnToParam = params.get("returnTo");

  const selectedPlan = useMemo<Tier>(() => {
    if (isTier(planParam)) return planParam;
    return "business";
  }, [planParam]);

  const safeReturnTo = useMemo(() => {
    if (typeof returnToParam === "string" && returnToParam.startsWith("/")) return returnToParam;
    return "/settings/workspace";
  }, [returnToParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16 text-sm text-gray-500">
        로딩 중…
      </div>
    );
  }

  const currentTier = profile.workspace.plan;

  const canSelectPaid = selectedPlan !== "free";
  const amount = canSelectPaid ? PLAN_PRICE[selectedPlan as Exclude<Tier, "free">] : 0;

  const handleMockPay = async () => {
    if (!canSelectPaid) return;
    setLoading(true);
    setError(null);

    try {
      await billingMockUpgrade(authFetch, {
        user_id: String(profile.user.id),
        plan: selectedPlan as Exclude<Tier, "free">,
        amount,
      });

      alert("✅ (Mock) 결제가 완료되었습니다. 플랜이 반영됩니다.");

      // ✅ 하드 리로드: /me 재동기화 + plan 즉시 갱신
      window.location.assign(safeReturnTo);
    } catch (e: any) {
      setError(e?.message || "mock_payment_failed");
    } finally {
      setLoading(false);
    }
  };

  const PlanCard = ({
    tier,
    title,
    price,
    desc,
    features,
    highlighted,
  }: {
    tier: Exclude<Tier, "free">;
    title: string;
    price: string;
    desc: string;
    features: string[];
    highlighted?: boolean;
  }) => {
    const active = selectedPlan === tier;
    return (
      <a
        href={`/upgrade?plan=${tier}&returnTo=${encodeURIComponent(safeReturnTo)}`}
        className={[
          "block rounded-2xl border dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6 transition",
          highlighted ? "ring-2 ring-black dark:ring-white" : "",
          active ? "border-black dark:border-white" : "hover:border-gray-300 dark:hover:border-gray-500",
        ].join(" ")}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</div>
          </div>
          {active && (
            <span className="rounded-full bg-black px-2.5 py-1 text-xs text-white">
              선택됨
            </span>
          )}
        </div>

        <div className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">{price}</div>

        <ul className="mt-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
      </a>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-16 space-y-8 md:space-y-10 bg-[#faf9f7] dark:bg-[#111] min-h-screen">
      {/* Header */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">업그레이드</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          워크스페이스 기능과 사용량을 확장하세요. (현재는 Mock 결제)
        </p>
      </header>

      {/* Current Context */}
      <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 sm:p-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">현재 워크스페이스</div>
        <div className="mt-1 text-lg font-medium text-gray-900 dark:text-white">{profile.workspace.name}</div>
        <div className="mt-1 text-sm">
          현재 플랜: <b className="uppercase">{currentTier}</b>
        </div>
      </section>

      {/* Plans */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PlanCard
          tier="pro"
          title="Pro"
          price="₩17,000 / 월"
          desc="개인 생산성 플랜"
          features={["더 많은 사용량", "개인 프로젝트 1개", "기본 지원"]}
          highlighted
        />
        <PlanCard
          tier="business"
          title="Business"
          price="₩55,000 / 월"
          desc="팀 협업 플랜"
          features={["워크스페이스", "팀원 관리", "우선 지원"]}
        />
        <PlanCard
          tier="enterprise"
          title="Enterprise"
          price="₩110,000 / 월"
          desc="조직 고급 플랜"
          features={["고급 보안", "전용 지원", "SLA 제공"]}
        />
      </section>

      {/* CTA */}
      <section className="rounded-2xl border dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">선택 플랜</div>
            <div className="text-lg font-semibold uppercase text-gray-900 dark:text-white">{selectedPlan}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              결제 금액: <b>{amount.toLocaleString()}원</b> / 월
            </div>
          </div>

          <button
            type="button"
            onClick={handleMockPay}
            disabled={loading || !canSelectPaid}
            className="rounded-xl bg-black px-6 py-3 text-sm text-white disabled:opacity-60"
          >
            {loading ? "처리 중…" : "결제 진행 (Mock)"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400">
          * 현재는 토스 실결제 연동 전이므로 MOCK 모드로만 동작합니다.
        </p>
      </section>
    </div>
  );
}
