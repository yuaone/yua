import { create } from "zustand";

/* ==============================
   Types
============================== */

type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface UsageGuardState {
  isLocked: boolean;
  remaining: number;
  tier: string; // "free" | "pro" | "team"
  dailyLimit: number;
  cooldownEnd: number | null; // timestamp ms
  loading: boolean;

  /* ---- Actions ---- */
  check: (authFetch: AuthFetchFn) => Promise<void>;
  canSend: () => boolean;
  formatRemaining: () => string;
}

/* ==============================
   Store
============================== */

export const useUsageGuardStore = create<UsageGuardState>((set, get) => ({
  isLocked: false,
  remaining: Infinity,
  tier: "free",
  dailyLimit: 0,
  cooldownEnd: null,
  loading: false,

  check: async (authFetch) => {
    set({ loading: true });
    try {
      const res = await authFetch("/api/me");
      if (!res.ok) {
        set({ loading: false });
        return;
      }

      const data = await res.json();

      const tier: string = data.plan ?? data.tier ?? "free";
      const remaining: number = data.remaining ?? data.dailyRemaining ?? Infinity;
      const dailyLimit: number = data.dailyLimit ?? 0;
      const cooldownEnd: number | null = data.cooldownEnd ?? null;

      const now = Date.now();
      const cooldownActive = cooldownEnd !== null && cooldownEnd > now;

      set({
        tier,
        remaining,
        dailyLimit,
        cooldownEnd,
        isLocked: cooldownActive || remaining <= 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  canSend: () => {
    const { isLocked, remaining } = get();
    return !isLocked && remaining > 0;
  },

  formatRemaining: () => {
    const { remaining, cooldownEnd } = get();
    const now = Date.now();

    if (cooldownEnd !== null && cooldownEnd > now) {
      const diffMin = Math.ceil((cooldownEnd - now) / 60_000);
      return `쿨다운 중 (${diffMin}m)`;
    }

    if (remaining <= 0) return "제한 초과";

    if (remaining === Infinity) return "무제한";

    return `${remaining}회 남음`;
  },
}));
