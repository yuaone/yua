"use client";

import type { Plan } from "yua-shared";

const PLAN_META: Record<
  Plan,
  {
    title: string;
    price: string;
    description: string;
    features: string[];
    highlighted?: boolean;
  }
> = {
  FREE: {
    title: "Free",
    price: "₩0",
    description: "가볍게 YUA 체험하기",
    features: [
      "하루 최대 20회 대화",
      "월 최대 400회 사용",
      "프로젝트 1개",
      "프로젝트 메모리 미지원",
      "이미지 생성 2회",
    ],
  },

  PRO: {
    title: "Pro",
    price: "₩19,000 / 월",
    description: "제한 없이 집중하는 개인 플랜",
    features: [
      "월 최대 1,000회 대화",
      "프로젝트 3개",
      "프로젝트 메모리 사용",
      "Deep 모드 사용",
      "이미지 생성 20회",
    ],
    highlighted: true,
  },

  BUSINESS: {
    title: "Business",
    price: "₩55,000 / 월",
    description: "팀 생산성 플랜",
    features: [
      "월 최대 4,000회 대화",
      "프로젝트 무제한",
      "프로젝트 메모리 사용",
      "이미지 생성 100회",
      "팀원 관리",
      "우선 처리",
    ],
  },

  ENTERPRISE: {
    title: "Enterprise",
    price: "₩140,000 / 월",
    description: "조직 단위 고급 사용",
    features: [
      "Business 포함 모든 기능",
      "프로젝트 메모리 고급 기능",
      "고급 보안",
      "전용 지원",
      "SLA 제공",
    ],
  },
};

export default function PricingCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected?: boolean;
  onSelect?: (plan: Plan) => void;
}) {
  const meta = PLAN_META[plan];

  const isMain = meta.highlighted;

  return (
    <div
      onClick={() => onSelect?.(plan)}
      className={`
        relative cursor-pointer rounded-2xl border dark:border-gray-700 p-8 transition-all duration-300
        ${
          selected
            ? "ring-2 ring-black dark:ring-white scale-[1.02]"
            : "hover:scale-[1.01] hover:shadow-xl"
        }
        ${
          isMain
            ? "bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#222]"
            : "bg-white dark:bg-[#1a1a1a]"
        }
      `}
    >
      {/* Badge */}
      {isMain && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full">
          가장 인기
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {meta.title}
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {meta.description}
      </p>

      <div className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">
        {meta.price}
      </div>

      <button
        type="button"
        className={`
          mt-6 w-full rounded-xl py-2.5 text-sm font-medium transition
          ${
            selected
              ? "bg-black text-white"
              : "bg-gray-900 text-white hover:opacity-90"
          }
        `}
      >
        {plan === "FREE"
          ? "무료로 시작하기"
          : selected
          ? "선택됨"
          : "플랜 선택"}
      </button>

      <ul className="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        {meta.features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
    </div>
  );
}