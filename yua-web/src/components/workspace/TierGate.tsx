"use client";

import { Lock, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Tier } from "./types";

type Props = {
  requiredTier: "business" | "enterprise";
  currentTier: Tier;
  featureName: string;
  children: React.ReactNode;
};

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

export default function TierGate({
  requiredTier,
  currentTier,
  featureName,
  children,
}: Props) {
  if (TIER_RANK[currentTier] >= TIER_RANK[requiredTier]) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
          <Lock size={22} className="text-violet-600 dark:text-violet-400" />
        </div>

        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {featureName}
        </h3>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          This feature requires the{" "}
          <span className="font-medium capitalize text-[var(--text-primary)]">
            {requiredTier}
          </span>{" "}
          plan. Upgrade to unlock.
        </p>

        <Link
          href="/upgrade"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-violet-700 active:scale-[0.97]"
        >
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
