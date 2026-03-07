// 📂 src/components/sidebar/BillingPanel.tsx
"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/** 서버와 완전히 동일한 Tier 타입 */
type BillingTier = "free" | "pro" | "business" | "enterprise";

export default function BillingPanel() {
  const { status, profile, refreshProfile } = useAuth();
  const [msg, setMsg] = useState("");

  if (status === "loading") {
    return <div className="text-sm text-black/60">Loading...</div>;
  }

  if (status !== "authed" || !profile) {
    return (
      <div className="text-sm text-red-600">
        ⚠️ 로그인 후 이용 가능합니다
      </div>
    );
  }

  const { tier } = profile;

  const plans: { id: BillingTier; name: string; price: number }[] = [
    { id: "free", name: "Free", price: 0 },
    { id: "pro", name: "Pro", price: 10000 },
    { id: "business", name: "Business", price: 30000 },
    { id: "enterprise", name: "Enterprise", price: 100000 },
  ];

  async function upgradePlan(targetTier: BillingTier, price: number) {
    setMsg("");

    const res = await apiPost("/api/billing/toss", {
      amount: price,
      tier: targetTier,
    });

    if (res.ok) {
      await refreshProfile(); // 🔥 핵심
      setMsg(`🎉 ${targetTier} 플랜으로 업그레이드 완료되었습니다!`);
    } else {
      setMsg("❌ 결제 실패. 다시 시도해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-5 text-sm text-black">
      <h2 className="text-lg font-semibold">Billing</h2>

      {/* 현재 플랜 */}
      <div className="p-4 rounded-xl bg-white/70 backdrop-blur-xl border border-black/10 shadow">
        <p className="text-sm text-black/60">현재 플랜</p>
        <p className="text-xl font-bold mt-1">{tier}</p>
      </div>

      {/* 플랜 목록 */}
      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <button
            key={p.id}
            disabled={p.id === tier}
            onClick={() => upgradePlan(p.id, p.price)}
            className={`
              w-full text-left p-4 rounded-xl border shadow-sm backdrop-blur-xl transition
              ${
                p.id === tier
                  ? "bg-black text-white cursor-default"
                  : "bg-white/60 border-black/10 hover:bg-white shadow"
              }
            `}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm">
                {p.price === 0 ? "무료" : `${p.price.toLocaleString()}원`}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 메시지 */}
      {msg && <div className="text-sm text-emerald-600 mt-3">{msg}</div>}
    </div>
  );
}
