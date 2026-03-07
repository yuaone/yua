"use client";

import { useState } from "react";
import PricingCard from "./PricingCard";
import type { Plan } from "yua-shared";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/store/store/useLoginModal";

const PLANS: Plan[] = [
  "FREE",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

export default function PricingSection() {
  const { status } = useAuth();
  const { openModal } = useLoginModal();

  const [selected, setSelected] = useState<Plan | null>(
    null
  );

  const handleSelect = (plan: Plan) => {
    setSelected(plan);

    const returnTo = encodeURIComponent(
      "/settings/workspace"
    );

    if (status !== "authed") {
      openModal({
        title: `${plan} 플랜을 사용하려면 로그인하세요`,
        afterLogin: () => {
          window.location.href = `/upgrade?plan=${plan.toLowerCase()}&returnTo=${returnTo}`;
        },
      });
      return;
    }

    window.location.href = `/upgrade?plan=${plan.toLowerCase()}&returnTo=${returnTo}`;
  };

  return (
    <section className="px-4 sm:px-6 pb-20 md:pb-32">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan}
            plan={plan}
            selected={selected === plan}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </section>
  );
}
