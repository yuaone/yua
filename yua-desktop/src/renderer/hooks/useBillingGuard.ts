import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/DesktopAuthContext";

type BillingStatus = {
  status: "active" | "pending" | "trial" | "canceled" | "expired";
  graceUntil: string | null;
  tier: "free" | "pro" | "business" | "enterprise";
};

export function useBillingGuard() {
  const { authFetch, status: authStatus } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      if (authStatus !== "authed") return;
      const res = await authFetch("/api/billing/status");
      if (!res || res.status === 401) return;
      const json = await res.json();
      if (!res.ok) return;
      setBilling({
        status: json?.status ?? "active",
        graceUntil: json?.graceUntil ?? null,
        tier: (json?.tier ?? "free") as BillingStatus["tier"],
      });
    } catch {
      return;
    } finally {
      refreshingRef.current = false;
    }
  }, [authFetch, authStatus]);

  useEffect(() => {
    // Session 1-time call only
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const graceRemainingHours = useMemo(() => {
    if (!billing?.graceUntil) return null;
    const t = new Date(billing.graceUntil).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.ceil((t - nowTick) / (1000 * 60 * 60));
  }, [billing, nowTick]);

  const isHardLocked = billing?.status === "expired";
  const isSoftLocked =
    billing?.status === "pending" &&
    graceRemainingHours != null &&
    graceRemainingHours < 12;

  return {
    status: billing?.status ?? "active",
    graceRemainingHours,
    isSoftLocked,
    isHardLocked,
    tier: billing?.tier ?? "free",
  };
}
