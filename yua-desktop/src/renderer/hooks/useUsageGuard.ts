import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/DesktopAuthContext";

export function useUsageGuard() {
  const { authFetch } = useAuth();

  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [wasLocked, setWasLocked] = useState<boolean | null>(null);
  const [justLocked, setJustLocked] = useState(false);

  /* =========================
     1. Initial load
  ========================= */
  useEffect(() => {
    async function load() {
      const res = await authFetch("/api/usage/status");
      if (!res || !res.ok) return;

      const json = await res.json();
      setData(json);
    }
    load();
  }, [authFetch]);

  /* =========================
     2. 1-second timer (cooldown calculation)
  ========================= */
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* =========================
     3. Remaining cooldown seconds
  ========================= */
  const cooldownRemaining =
    data?.cooldownUntil
      ? Math.max(
          0,
          Math.floor(
            (new Date(data.cooldownUntil).getTime() - now) / 1000
          )
        )
      : null;

  const isLocked =
    data?.locked &&
    cooldownRemaining != null &&
    cooldownRemaining > 0;

  /* =========================
     4. Detect "first locked" moment
  ========================= */
  useEffect(() => {
    // Initial load sets baseline only (no modal)
    if (wasLocked === null) {
      setWasLocked(isLocked);
      return;
    }

    // Detect false -> true transition only
    if (!wasLocked && isLocked) {
      setJustLocked(true);
    }

    setWasLocked(isLocked);
  }, [isLocked, wasLocked]);

  /* =========================
     5. Auto re-check when cooldown ends
  ========================= */
  useEffect(() => {
    if (!cooldownRemaining || cooldownRemaining > 0) return;

    async function reload() {
      const res = await authFetch("/api/usage/status");
      if (!res || !res.ok) return;

      const json = await res.json();
      setData(json);
    }

    reload();
  }, [cooldownRemaining, authFetch]);

  /* =========================
     RETURN
  ========================= */
  return {
    isLocked,
    cooldownRemaining,
    tier: data?.tier ?? "free",
    justLocked,
    cooldownKey: data?.cooldownUntil
      ? `usage_modal_${new Date(data.cooldownUntil).getTime()}`
      : null,
  };
}
