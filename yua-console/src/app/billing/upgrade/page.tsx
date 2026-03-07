// 📂 src/app/billing/upgrade/page.tsx
"use client";

import { useState } from "react";

export default function BillingUpgradePage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade(tier: string, amount: number) {
    setLoading(true);

    const res = await fetch("/api/billing/toss", {
      method: "POST",
      body: JSON.stringify({ tier, amount }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      window.location.href = data.checkoutUrl; // Toss Payment URL 이동
    } else {
      alert("Error: " + data.message);
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-semibold mb-6">Upgrade Plan</h1>

      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">

        {/* Free (기본) */}
        <PlanCard title="Free" price={0} onClick={() => {}} />

        {/* Pro */}
        <PlanCard 
          title="Pro" 
          price={9900}
          onClick={() => handleUpgrade("pro", 9900)}
        />

        {/* Ultra */}
        <PlanCard 
          title="Ultra" 
          price={29900}
          onClick={() => handleUpgrade("ultra", 29900)}
        />

      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  onClick,
}: {
  title: string;
  price: number;
  onClick: () => void;
}) {
  return (
    <div
      className="
        bg-white/70 backdrop-blur-xl shadow 
        border border-black/10 rounded-xl p-6
        flex flex-col items-start gap-3
      "
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-black/60 text-sm">{price} KRW / month</p>

      {price > 0 && (
        <button
          className="
            bg-black text-white rounded-lg px-4 py-2 
            hover:bg-black/80 transition-all
          "
          onClick={onClick}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
