import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  Building2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Check,
  RefreshCw,
} from "lucide-react";
import { useSettingsUI } from "@/stores/useSettingsUI";
import { useThemePreference, type ThemeMode } from "@/hooks/useThemePreference";
import { useLocale, type Locale } from "@/lib/i18n";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { desktop, isDesktop } from "@/lib/desktop-bridge";
import { scheduleDowngrade, cancelDowngrade } from "@/lib/api/billing.api";
import {
  fetchMemorySummary,
  fetchMemoryList,
  updateMemory,
  deleteMemory,
  type MemoryRecord,
  type MemorySummary,
} from "@/lib/api/memory";
import SettingsSidebar from "./SettingsSidebar";

/* ─────────────────────────────────────────────
   Panel: Personalization (Theme)
   ───────────────────────────────────────────── */
function Personalization() {
  const { mode, setMode } = useThemePreference();
  const { locale, setLocale, t } = useLocale();

  const themes: { value: ThemeMode; label: string }[] = [
    { value: "light", label: t("settings.theme_light") },
    { value: "dark", label: t("settings.theme_dark") },
    { value: "system", label: t("settings.theme_system") },
  ];

  const languages: { value: Locale; label: string }[] = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
  ];

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        {t("settings.personalization")}
      </h2>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
            {t("settings.theme")}
          </label>
          <div className="flex gap-3">
            {themes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`
                  rounded-lg px-4 py-2 text-sm border transition
                  ${
                    mode === value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-400"
                      : "border-gray-200 dark:border-[var(--line)] hover:bg-gray-50 dark:hover:bg-white/5"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
            {t("settings.language")}
          </label>
          <div className="flex gap-3">
            {languages.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLocale(value)}
                className={`
                  rounded-lg px-4 py-2 text-sm border transition
                  ${
                    locale === value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-400"
                      : "border-gray-200 dark:border-[var(--line)] hover:bg-gray-50 dark:hover:bg-white/5"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Panel: Notifications
   ───────────────────────────────────────────── */
function Notifications() {
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        알림
      </h2>

      <div className="space-y-4">
        <ToggleRow
          label="데스크톱 알림"
          description="시스템 알림으로 새 메시지를 받습니다"
          checked={desktopNotif}
          onChange={setDesktopNotif}
        />
        <ToggleRow
          label="알림음"
          description="알림 시 사운드를 재생합니다"
          checked={soundEnabled}
          onChange={setSoundEnabled}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Panel: About
   ───────────────────────────────────────────── */
function About() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        정보
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-[var(--line)]">
          <span className="text-[var(--text-secondary)]">앱 이름</span>
          <span className="text-[var(--text-primary)] font-medium">YUA Desktop</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-[var(--line)]">
          <span className="text-[var(--text-secondary)]">버전</span>
          <span className="text-[var(--text-primary)] font-medium">1.0.0</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-[var(--line)]">
          <span className="text-[var(--text-secondary)]">플랫폼</span>
          <span className="text-[var(--text-primary)] font-medium">
            {isDesktop ? desktop!.platform : "web"}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-[var(--text-secondary)]">웹사이트</span>
          <a
            href="https://yuaone.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-[#8ab4ff]"
          >
            yuaone.com
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Panel: Desktop (desktop-specific settings)
   ───────────────────────────────────────────── */
function DesktopPanel() {
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);

  const handleAlwaysOnTop = useCallback(async () => {
    if (!isDesktop) return;
    const next = await desktop!.toggleAlwaysOnTop();
    setAlwaysOnTop(next);
  }, []);

  const handleAutoUpdate = useCallback((value: boolean) => {
    setAutoUpdate(value);
    try {
      if (typeof window !== "undefined")
        localStorage.setItem("yua.auto-update", value ? "true" : "false");
    } catch {
      // ignore
    }
  }, []);

  // Load saved auto-update preference
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("yua.auto-update");
        if (saved === "false") setAutoUpdate(false);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        데스크톱
      </h2>

      <div className="space-y-4">
        <ToggleRow
          label="항상 위에 표시"
          description="YUA 창을 다른 창 위에 항상 표시합니다"
          checked={alwaysOnTop}
          onChange={handleAlwaysOnTop}
        />
        <ToggleRow
          label="자동 업데이트"
          description="새 버전이 있으면 자동으로 업데이트합니다"
          checked={autoUpdate}
          onChange={handleAutoUpdate}
        />
      </div>

      {isDesktop && (
        <div className="mt-8">
          <button
            onClick={() => desktop?.checkUpdate()}
            className="rounded-lg border border-gray-200 dark:border-[var(--line)] px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            업데이트 확인
          </button>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────
   Shared: Toggle Row Component
   ───────────────────────────────────────────── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[var(--line)]">
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">
          {description}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel: DataPanel (데이터 제어)
   ───────────────────────────────────────────── */
function DataPanel() {
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">데이터 제어</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
          데이터 사용 및 저장 방식을 관리합니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          보기 설정
        </h2>
        <label className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm dark:border-[var(--line)]">
          <div>
            <div className="font-medium text-[var(--text-primary)]">최근 대화만 표시</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-[var(--text-secondary)]">
              목록에서 최근 대화만 보이도록 정리합니다.
            </div>
          </div>
          <input type="checkbox" className="h-4 w-4" />
        </label>
        <p className="text-xs text-gray-400 dark:text-[var(--text-muted)]">
          현재는 UI만 제공됩니다. 실제 필터링은 추후 연동됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          데이터 관리
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            데이터 내보내기 (준비 중)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            대화 기록 삭제 (준비 중)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            프로젝트 데이터 삭제 (준비 중)
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          데이터 처리 안내
        </h2>
        <div className="rounded-lg border px-4 py-4 text-sm text-gray-600 dark:text-[var(--text-secondary)] dark:border-[var(--line)]">
          자세한 내용은 개인정보처리방침과 이용약관을 확인하세요.
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel: SecurityPanel (보안)
   ───────────────────────────────────────────── */
function SecurityPanel() {
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">보안</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
          계정 및 접근 보안 설정을 관리합니다.
        </p>
      </header>

      <div className="rounded-lg border px-4 py-4 text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)]">
        보안 설정은 추후 제공됩니다.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel: WorkspacePanel (워크스페이스)
   ───────────────────────────────────────────── */
function WorkspacePanel() {
  const { profile } = useAuth();

  const plan = profile?.workspace?.plan ?? "free";
  const isBizPlus = plan === "business" || plan === "enterprise";

  if (!isBizPlus) {
    return (
      <div className="max-w-3xl py-8 text-center">
        <Building2 size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          워크스페이스 관리
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Business 이상 플랜에서 사용 가능합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl py-8 text-center">
      <Building2 size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        워크스페이스 관리
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        워크스페이스 설정이 새 페이지로 이동했습니다.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel: BillingPanel
   ───────────────────────────────────────────── */

type BillingStatus = {
  workspaceId: string;
  tier: "free" | "pro" | "business" | "enterprise";
  plan: string;
  status: "active" | "pending" | "trial" | "canceled" | "expired";
  nextBillingAt: string | null;
  graceUntil: string | null;
  renewalAttempts: number;
  scheduledDowngradePlan: string | null;
};

type UsageStatus = {
  tier: "free" | "pro" | "business" | "enterprise";
  usedTokens: number;
  monthlyLimit: number;
};

function billingFormatDate(input?: string | null) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR")
    .format(d)
    .replace(/\./g, "-")
    .replace(/\s/g, "")
    .slice(0, 10);
}

function BillingPanel() {
  const { authFetch } = useAuth();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<BillingStatus | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageStatus | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<
    { plan: string; status: "active" | "failed" | "canceled"; amount: number; createdAt: string }[]
  >([]);
  const [historyView, setHistoryView] = useState<"timeline" | "table">("timeline");
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const refreshingBillingRef = useRef(false);
  const refreshingUsageRef = useRef(false);
  const refreshingHistoryRef = useRef(false);

  function normalizeError(e: any): string {
    const msg = String(e?.message ?? e ?? "");
    if (msg.includes("billing_status_failed")) return "결제 상태를 불러올 수 없습니다.";
    if (msg.includes("usage_status_failed")) return "사용량 정보를 불러올 수 없습니다.";
    if (msg.includes("billing_history_failed")) return "결제 이력을 불러올 수 없습니다.";
    if (msg.includes("schedule_downgrade_failed")) return "다운그레이드 예약에 실패했습니다.";
    if (msg.includes("cancel_downgrade_failed")) return "예약 취소에 실패했습니다.";
    return "알 수 없는 오류가 발생했습니다.";
  }

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const refreshBilling = useCallback(async () => {
    if (refreshingBillingRef.current) return;
    refreshingBillingRef.current = true;
    try {
      const res = await authFetch("/api/billing/status");
      const json = await res.json();
      if (!res.ok) throw new Error("billing_status_failed");
      setData(json as BillingStatus);
    } catch {
      return;
    } finally {
      refreshingBillingRef.current = false;
    }
  }, [authFetch]);

  const refreshUsage = useCallback(
    async (silent: boolean = true) => {
      if (refreshingUsageRef.current) return;
      refreshingUsageRef.current = true;
      if (!silent) setUsageLoading(true);
      try {
        const res = await authFetch("/api/usage-status");
        const json = await res.json();
        if (!res.ok) throw new Error("usage_status_failed");
        setUsageData(json as UsageStatus);
      } catch {
        setUsageData(null);
      } finally {
        if (!silent) setUsageLoading(false);
        refreshingUsageRef.current = false;
      }
    },
    [authFetch]
  );

  const refreshHistory = useCallback(async () => {
    if (refreshingHistoryRef.current) return;
    refreshingHistoryRef.current = true;
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await authFetch("/api/billing/history");
      const json = await res.json();
      if (!res.ok) throw new Error("billing_history_failed");
      setHistoryData(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setHistoryError(e?.message || "billing_history_failed");
    } finally {
      setHistoryLoading(false);
      refreshingHistoryRef.current = false;
    }
  }, [authFetch]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await authFetch("/api/billing/status");
        const json = await res.json();
        if (!res.ok) throw new Error("billing_status_failed");
        setData(json as BillingStatus);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshUsage(false);
    };
    run();
    return () => { mounted = false; };
  }, [refreshUsage]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshHistory();
    };
    run();
    return () => { mounted = false; };
  }, [refreshHistory]);

  const graceActive = useMemo(() => {
    if (!data?.graceUntil) return false;
    if (data.status !== "pending") return false;
    const t = new Date(data.graceUntil).getTime();
    return Number.isFinite(t) && t > nowTick;
  }, [data, nowTick]);

  const graceRemainingMs = useMemo(() => {
    if (!data?.graceUntil) return null;
    const t = new Date(data.graceUntil).getTime();
    if (!Number.isFinite(t)) return null;
    return t - nowTick;
  }, [data, nowTick]);

  const graceRemainingDays = useMemo(() => {
    if (graceRemainingMs == null) return null;
    return Math.ceil(graceRemainingMs / (1000 * 60 * 60 * 24));
  }, [graceRemainingMs]);

  const graceRemainingHours = useMemo(() => {
    if (graceRemainingMs == null) return null;
    return Math.ceil(graceRemainingMs / (1000 * 60 * 60));
  }, [graceRemainingMs]);

  const tier = data?.tier ?? "free";
  const nextBilling = billingFormatDate(data?.nextBillingAt);
  const graceUntil = billingFormatDate(data?.graceUntil);
  const usedTokens = usageData?.usedTokens ?? 0;
  const monthlyLimit = usageData?.monthlyLimit ?? 0;
  const hasLimit = monthlyLimit > 0;
  const percent = hasLimit ? Math.min(100, (usedTokens / monthlyLimit) * 100) : 0;
  const barColor =
    percent < 70 ? "bg-green-500" : percent < 90 ? "bg-yellow-500" : "bg-red-500";

  const handleScheduleDowngrade = async (targetPlan: "free" | "pro" | "business") => {
    const ok = window.confirm("다음 결제일부터 다운그레이드됩니다. 진행하시겠습니까?");
    if (!ok) return;
    setDowngradeError(null);
    setDowngradeLoading(true);
    try {
      await scheduleDowngrade(authFetch, targetPlan);
      await refreshBilling();
      setToast({ type: "success", message: "다운그레이드가 예약되었습니다." });
    } catch (e: any) {
      const msg = normalizeError(e);
      setDowngradeError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleCancelDowngrade = async () => {
    setDowngradeError(null);
    setDowngradeLoading(true);
    try {
      await cancelDowngrade(authFetch);
      await refreshBilling();
      setToast({ type: "success", message: "다운그레이드 예약이 취소되었습니다." });
    } catch (e: any) {
      const msg = normalizeError(e);
      setDowngradeError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setDowngradeLoading(false);
    }
  };

  // Grace period expiry check
  useEffect(() => {
    if (data?.status !== "pending") return;
    if (graceRemainingMs == null) return;
    if (graceRemainingMs <= 0) {
      (async () => {
        try {
          const res = await authFetch("/api/billing/status");
          const json = await res.json();
          if (res.ok) {
            setData(json as BillingStatus);
            if ((json as BillingStatus)?.status === "expired") {
              setToast({ type: "error", message: "유예기간이 종료되었습니다." });
            }
          }
        } catch {}
      })();
    }
  }, [data?.status, graceRemainingMs, authFetch]);

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div
          className={[
            "fixed top-6 right-6 z-50 rounded-lg px-4 py-3 shadow-sm text-sm",
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700",
          ].join(" ")}
        >
          {toast.message}
        </div>
      )}
      {loading && (
        <div className="space-y-3">
          <div className="h-6 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
          <div className="h-6 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
          <div className="h-6 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Billing 정보를 불러오지 못했습니다.
        </div>
      )}

      {!loading && !error && data && (
        <>
          {graceActive && (
            <div
              className={[
                "rounded-lg p-4 space-y-2 border",
                graceRemainingHours != null && graceRemainingHours < 24
                  ? "bg-red-50 border-red-200 text-red-700 animate-pulse"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800",
              ].join(" ")}
            >
              <div className="font-semibold">결제 실패</div>
              <div className="text-sm">3일 유예기간이 적용되었습니다.</div>
              <div className="text-sm">유예 종료일: {graceUntil}</div>
              {graceRemainingDays != null && graceRemainingHours != null && (
                <div className="text-sm font-medium">
                  유예 종료까지 D-{graceRemainingDays} ({graceRemainingHours}시간 남음)
                </div>
              )}
              <button
                onClick={() => window.open("https://yuaone.com/upgrade", "_blank")}
                className="mt-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                재결제하기
              </button>
            </div>
          )}

          {/* Current Plan */}
          <div className="bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--line)] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]">현재 플랜</div>
              <span
                className={[
                  "text-xs px-2 py-1 rounded-full font-medium",
                  data.status === "active"
                    ? "bg-green-100 text-green-700"
                    : data.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : data.status === "trial"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700",
                ].join(" ")}
              >
                {data.status === "active"
                  ? "Active"
                  : data.status === "pending"
                  ? "Payment Pending"
                  : data.status === "trial"
                  ? "Trial"
                  : data.status === "canceled"
                  ? "Canceled"
                  : "Expired"}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">Current Plan: {tier.toUpperCase()}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-[var(--text-secondary)]">Next Billing: {nextBilling}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              Renewal Attempts: {data.renewalAttempts}
            </div>
            {data.status === "pending" && data.renewalAttempts > 0 && (
              <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
                자동 재시도 중 (시도 횟수: {data.renewalAttempts})
              </div>
            )}
            {data.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => window.open("https://yuaone.com/upgrade", "_blank")}
                  className="border border-gray-300 dark:border-[var(--line)] px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  결제수단 변경
                </button>
                <button
                  onClick={() => window.open("https://yuaone.com/upgrade", "_blank")}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  재결제하기
                </button>
              </div>
            )}

            {data.scheduledDowngradePlan && (
              <div className="mt-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-[var(--line)] p-3 rounded-lg text-sm text-gray-600 dark:text-[var(--text-secondary)] flex items-start gap-2">
                <span className="mt-0.5">i</span>
                <span>
                  현재 요금제는 다음 결제일부터 {data.scheduledDowngradePlan} 으로 변경됩니다.
                </span>
              </div>
            )}
          </div>

          {/* Plan Change */}
          <div className="bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--line)] rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]">플랜 변경</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              필요에 따라 업그레이드하거나 예약 다운그레이드를 설정할 수 있습니다.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tier !== "enterprise" && tier === "free" && (
                <button
                  onClick={() => window.open("https://yuaone.com/upgrade?plan=pro", "_blank")}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  Upgrade to Pro
                </button>
              )}

              {tier !== "enterprise" && tier === "pro" && (
                <>
                  <button
                    onClick={() => window.open("https://yuaone.com/upgrade?plan=business", "_blank")}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    Upgrade to Business
                  </button>
                  <button
                    onClick={() => window.open("https://yuaone.com/upgrade?plan=enterprise", "_blank")}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    Upgrade to Enterprise
                  </button>
                </>
              )}

              {tier !== "enterprise" && tier === "business" && (
                <button
                  onClick={() => window.open("https://yuaone.com/upgrade?plan=enterprise", "_blank")}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  Upgrade to Enterprise
                </button>
              )}

              {!data.scheduledDowngradePlan && tier !== "free" && (
                <button
                  onClick={() => handleScheduleDowngrade("free")}
                  disabled={downgradeLoading}
                  className="border border-gray-300 dark:border-[var(--line)] px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-60"
                >
                  {downgradeLoading ? "처리 중..." : "예약 다운그레이드 설정"}
                </button>
              )}

              {data.scheduledDowngradePlan && (
                <button
                  onClick={handleCancelDowngrade}
                  disabled={downgradeLoading}
                  className="border border-gray-300 dark:border-[var(--line)] px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-60"
                >
                  {downgradeLoading ? "처리 중..." : "예약 취소"}
                </button>
              )}
            </div>

            {downgradeError && (
              <div className="mt-3 text-sm text-red-600">
                {downgradeError}
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--line)] rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]">이번 달 사용량</div>
            {usageLoading && (
              <div className="mt-4 h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" />
            )}
            {!usageLoading && hasLimit && (
              <>
                <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
                  Tokens: {usedTokens.toLocaleString()} / {monthlyLimit.toLocaleString()}
                </div>
                <div className="mt-3 bg-gray-100 dark:bg-white/10 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {percent >= 100 ? (
                  <div className="mt-2 text-sm text-red-600">월 사용 한도를 초과했습니다.</div>
                ) : percent >= 90 ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-sm text-red-600">사용 한도에 거의 도달했습니다.</div>
                    {tier !== "enterprise" && (
                      <button
                        onClick={() => window.open("https://yuaone.com/upgrade", "_blank")}
                        className="bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition text-sm"
                      >
                        Upgrade Now
                      </button>
                    )}
                  </div>
                ) : null}
              </>
            )}
            {!usageLoading && !hasLimit && (
              <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">제한 없음</div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--line)] rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]">결제 이력</div>
            <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              <button
                onClick={() => setHistoryView((v) => (v === "timeline" ? "table" : "timeline"))}
                className="text-xs rounded border border-gray-300 dark:border-[var(--line)] px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                {historyView === "timeline" ? "표 보기" : "타임라인 보기"}
              </button>
            </div>

            {historyLoading && (
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full" />
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full" />
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full" />
              </div>
            )}

            {!historyLoading && historyError && (
              <div className="mt-3 text-sm text-red-600">
                결제 이력을 불러오지 못했습니다.
              </div>
            )}

            {!historyLoading && !historyError && historyData.length === 0 && (
              <div className="mt-3 text-sm text-gray-500 dark:text-[var(--text-secondary)]">결제 이력이 없습니다.</div>
            )}

            {!historyLoading && !historyError && historyData.length > 0 && historyView === "timeline" && (
              <div className="mt-6 relative border-l border-gray-200 dark:border-[var(--line)]">
                {data?.status === "pending" && (
                  <div className="relative pl-6 pb-6">
                    <span className="absolute left-[-6px] top-1.5 h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">유예 시작</div>
                  </div>
                )}
                {historyData.map((h, i) => {
                  const dotColor =
                    h.status === "active"
                      ? "bg-green-500"
                      : h.status === "failed"
                      ? "bg-red-500"
                      : "bg-gray-400";
                  const label =
                    h.status === "active"
                      ? "결제 완료"
                      : h.status === "failed"
                      ? "결제 실패"
                      : "구독 취소";
                  return (
                    <div key={`${h.createdAt}-${i}`} className="relative pl-6 pb-6">
                      <span
                        className={`absolute left-[-6px] top-1.5 h-3 w-3 rounded-full ${dotColor}`}
                      />
                      <div className="text-xs text-gray-400 dark:text-[var(--text-muted)]">{billingFormatDate(h.createdAt)}</div>
                      <div className="mt-1 text-sm text-gray-800 dark:text-[var(--text-primary)]">{label}</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-[var(--text-secondary)]">
                        {String(h.plan).toUpperCase()} {Number(h.amount).toLocaleString("ko-KR")}원
                      </div>
                    </div>
                  );
                })}
                {data?.status === "expired" && (
                  <div className="relative pl-6 pb-2">
                    <span className="absolute left-[-6px] top-1.5 h-3 w-3 rounded-full bg-red-500" />
                    <div className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">유예 종료</div>
                  </div>
                )}
              </div>
            )}

            {!historyLoading && !historyError && historyData.length > 0 && historyView === "table" && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 dark:text-[var(--text-muted)]">
                      <th className="py-2 font-medium">날짜</th>
                      <th className="py-2 font-medium">플랜</th>
                      <th className="py-2 font-medium">상태</th>
                      <th className="py-2 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((h, i) => (
                      <tr key={`${h.createdAt}-${i}`} className="border-t border-gray-100 dark:border-[var(--line)]">
                        <td className="py-2 text-gray-600 dark:text-[var(--text-secondary)]">{billingFormatDate(h.createdAt)}</td>
                        <td className="py-2 text-gray-700 dark:text-[var(--text-primary)]">{String(h.plan).toUpperCase()}</td>
                        <td className="py-2">
                          <span
                            className={[
                              "text-xs px-2 py-1 rounded-full font-medium",
                              h.status === "active"
                                ? "bg-green-100 text-green-700"
                                : h.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700",
                            ].join(" ")}
                          >
                            {h.status === "active"
                              ? "Active"
                              : h.status === "failed"
                              ? "Failed"
                              : "Canceled"}
                          </span>
                        </td>
                        <td className="py-2 text-gray-700 dark:text-[var(--text-primary)]">
                          {Number(h.amount).toLocaleString("ko-KR")}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel: MemoryPanel (메모리)
   ───────────────────────────────────────────── */

const SCOPE_LABELS: Record<string, { label: string; icon: string }> = {
  user_profile: { label: "프로필", icon: "\u{1F464}" },
  user_preference: { label: "선호 설정", icon: "\u{2699}\u{FE0F}" },
  user_research: { label: "리서치", icon: "\u{1F52C}" },
  project_architecture: { label: "프로젝트 구조", icon: "\u{1F3D7}\u{FE0F}" },
  project_decision: { label: "결정사항", icon: "\u{1F4CB}" },
  general_knowledge: { label: "일반 지식", icon: "\u{1F4DA}" },
};

function getScopeDisplay(scope: string) {
  return (
    SCOPE_LABELS[scope] ?? {
      label: scope.replace(/_/g, " "),
      icon: "\u{1F4C4}",
    }
  );
}

function confidenceColor(c: number): string {
  if (c >= 0.7) return "var(--confidence-high, #22c55e)";
  if (c >= 0.4) return "var(--confidence-mid, #eab308)";
  return "var(--confidence-low, #ef4444)";
}

function confidenceLabel(c: number): string {
  if (c >= 0.7) return "높음";
  if (c >= 0.4) return "보통";
  return "낮음";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

function MemoryPanel() {
  const { authFetch } = useAuth();

  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [memoriesByScope, setMemoriesByScope] = useState<
    Record<string, MemoryRecord[]>
  >({});
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set());
  const [loadingScopes, setLoadingScopes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* Load summary */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMemorySummary(authFetch);
      setSummary(data);
    } catch {
      setError("메모리 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  /* Toggle scope accordion */
  const toggleScope = useCallback(
    async (scope: string) => {
      const next = new Set(expandedScopes);
      if (next.has(scope)) {
        next.delete(scope);
        setExpandedScopes(next);
        return;
      }

      next.add(scope);
      setExpandedScopes(next);

      if (!memoriesByScope[scope]) {
        setLoadingScopes((prev) => new Set(prev).add(scope));
        try {
          const list = await fetchMemoryList(authFetch, scope);
          setMemoriesByScope((prev) => ({ ...prev, [scope]: list }));
        } catch {
          // silent
        } finally {
          setLoadingScopes((prev) => {
            const s = new Set(prev);
            s.delete(scope);
            return s;
          });
        }
      }
    },
    [expandedScopes, memoriesByScope, authFetch]
  );

  /* Actions */
  const handleEdit = (mem: MemoryRecord) => {
    setEditingId(mem.id);
    setEditContent(mem.content);
  };

  const handleEditSave = async (mem: MemoryRecord) => {
    if (editContent.trim() === mem.content) {
      setEditingId(null);
      return;
    }
    try {
      await updateMemory(authFetch, mem.id, { content: editContent.trim() });
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].map((m) =>
            m.id === mem.id ? { ...m, content: editContent.trim() } : m
          );
        }
        return updated;
      });
      setEditingId(null);
    } catch {
      // keep editing state on failure
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleToggleLock = async (mem: MemoryRecord) => {
    try {
      await updateMemory(authFetch, mem.id, { locked: !mem.locked });
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].map((m) =>
            m.id === mem.id ? { ...m, locked: !mem.locked } : m
          );
        }
        return updated;
      });
    } catch {
      // silent
    }
  };

  const handleDelete = async (mem: MemoryRecord) => {
    try {
      await deleteMemory(authFetch, mem.id);
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].filter((m) => m.id !== mem.id);
        }
        return updated;
      });
      setDeletingId(null);
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scopes: prev.scopes.map((s) =>
            s.scope === mem.scope ? { ...s, count: Math.max(0, s.count - 1) } : s
          ),
        };
      });
    } catch {
      // silent
    }
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded" style={{ background: "var(--line)" }} />
          <div className="h-4 w-full max-w-md animate-pulse rounded" style={{ background: "var(--wash)" }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-12 w-full animate-pulse rounded-lg" style={{ background: "var(--wash)" }} />
          </div>
        ))}
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            메모리
          </h1>
        </header>
        <div
          className="flex flex-col items-center gap-4 rounded-xl p-8 text-center"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {error}
          </p>
          <button
            onClick={loadSummary}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-80"
            style={{
              background: "var(--sb-active-bg)",
              color: "var(--sb-active-ink)",
            }}
          >
            <RefreshCw size={14} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totalCount = summary?.scopes.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const lastUpdated = summary?.scopes
    .map((s) => s.last_updated)
    .filter(Boolean)
    .sort()
    .pop();

  /* Render */
  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            메모리
          </h1>
          <button
            onClick={() => {
              setMemoriesByScope({});
              loadSummary();
            }}
            className="rounded-md p-2 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          YUA가 대화에서 학습한 정보를 확인하고 관리할 수 있습니다.
        </p>

        {/* Summary stats */}
        <div
          className="mt-4 flex items-center gap-6 rounded-lg px-4 py-3 text-xs"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <div>
            <span style={{ color: "var(--text-muted)" }}>총 메모리</span>
            <span className="ml-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              {totalCount}개
            </span>
          </div>
          <div className="h-3 w-px" style={{ background: "var(--line)" }} />
          <div>
            <span style={{ color: "var(--text-muted)" }}>마지막 업데이트</span>
            <span className="ml-2 font-medium" style={{ color: "var(--text-primary)" }}>
              {lastUpdated ? relativeTime(lastUpdated) : "-"}
            </span>
          </div>
          <div className="h-3 w-px" style={{ background: "var(--line)" }} />
          <div>
            <span style={{ color: "var(--text-muted)" }}>스코프</span>
            <span className="ml-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              {summary?.scopes.length ?? 0}개
            </span>
          </div>
        </div>
      </header>

      {/* Empty state */}
      {totalCount === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl p-10 text-center"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <div className="text-3xl opacity-40">{"\u{1F9E0}"}</div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            저장된 메모리가 없습니다
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            대화를 하면 YUA가 자동으로 중요한 정보를 기억합니다.
          </p>
        </div>
      )}

      {/* Scope groups */}
      {summary?.scopes
        .filter((s) => s.count > 0)
        .map(({ scope, count, last_updated }) => {
          const { label, icon } = getScopeDisplay(scope);
          const isExpanded = expandedScopes.has(scope);
          const isLoading = loadingScopes.has(scope);
          const memories = memoriesByScope[scope] ?? [];

          return (
            <section key={scope}>
              {/* Scope header (accordion toggle) */}
              <button
                onClick={() => toggleScope(scope)}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition hover:opacity-80"
                style={{
                  background: "var(--wash)",
                  border: "1px solid var(--line)",
                  color: "var(--text-primary)",
                }}
              >
                <span className="text-base">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-normal"
                  style={{
                    background: "var(--line)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {count}
                </span>
                <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                  {relativeTime(last_updated)}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                ) : (
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-2 space-y-2 pl-2">
                  {isLoading && (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-20 w-full animate-pulse rounded-lg"
                          style={{ background: "var(--wash)" }}
                        />
                      ))}
                    </div>
                  )}

                  {!isLoading && memories.length === 0 && (
                    <div
                      className="rounded-lg px-4 py-6 text-center text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      이 스코프에 메모리가 없습니다.
                    </div>
                  )}

                  {!isLoading &&
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="rounded-lg p-3 transition"
                        style={{
                          background: "var(--wash)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {/* Content */}
                        {editingId === mem.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="w-full resize-none rounded-md px-3 py-2 text-sm outline-none"
                              style={{
                                background: "var(--card-bg)",
                                border: "1px solid var(--line)",
                                color: "var(--text-primary)",
                              }}
                            />
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleEditSave(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--confidence-high, #22c55e)" }}
                                title="저장"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--text-muted)" }}
                                title="취소"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {mem.content}
                          </p>
                        )}

                        {/* Meta row */}
                        {editingId !== mem.id && (
                          <div className="mt-2 flex items-center gap-3">
                            {/* Confidence bar */}
                            <div className="flex items-center gap-2">
                              <div
                                className="h-1 w-16 rounded-full overflow-hidden"
                                style={{ background: "var(--line)" }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.round(mem.confidence * 100)}%`,
                                    background: confidenceColor(mem.confidence),
                                  }}
                                />
                              </div>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {confidenceLabel(mem.confidence)} ({Math.round(mem.confidence * 100)}%)
                              </span>
                            </div>

                            <div className="flex-1" />

                            {/* Access info */}
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {mem.access_count > 0
                                ? `${mem.access_count}회 참조`
                                : "미참조"}
                            </span>

                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {relativeTime(mem.updated_at)}
                            </span>

                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleToggleLock(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{
                                  color: mem.locked
                                    ? "var(--sb-active-ink)"
                                    : "var(--text-muted)",
                                }}
                                title={mem.locked ? "잠금 해제" : "잠금"}
                              >
                                {mem.locked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                              <button
                                onClick={() => handleEdit(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--text-muted)" }}
                                title="수정"
                              >
                                <Edit3 size={13} />
                              </button>

                              {deletingId === mem.id ? (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => handleDelete(mem)}
                                    className="rounded-md p-1.5 transition hover:opacity-70"
                                    style={{ color: "var(--confidence-low, #ef4444)" }}
                                    title="삭제 확인"
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="rounded-md p-1.5 transition hover:opacity-70"
                                    style={{ color: "var(--text-muted)" }}
                                    title="취소"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(mem.id)}
                                  className="rounded-md p-1.5 transition hover:opacity-70"
                                  style={{ color: "var(--text-muted)" }}
                                  title="삭제"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </section>
          );
        })}

      {/* Cross-thread memories */}
      {summary?.crossThreadMemories && summary.crossThreadMemories.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            크로스 스레드 메모리
          </h2>
          <div className="space-y-2">
            {summary.crossThreadMemories.map((ctm) => (
              <div
                key={ctm.id}
                className="rounded-lg p-3"
                style={{
                  background: "var(--wash)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: "var(--sb-active-bg)",
                      color: "var(--sb-active-ink)",
                    }}
                  >
                    {ctm.type}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {relativeTime(ctm.created_at)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {ctm.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        메모리는 대화 중 자동으로 업데이트됩니다. 잠금된 메모리는 자동 삭제되지 않습니다.
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main: Settings Modal
   ───────────────────────────────────────────── */
export default function SettingsModal() {
  const { open, tab, closeSettings } = useSettingsUI();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeSettings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={closeSettings}
      />

      {/* Panel */}
      <div
        className="
          relative z-10 flex
          h-[82vh] w-[920px]
          rounded-2xl bg-white dark:bg-[#1b1b1b] dark:text-[var(--text-primary)]
          shadow-[0_20px_60px_rgba(0,0,0,0.25)]
          overflow-hidden
          animate-[fadeIn_0.15s_ease-out]
        "
      >
        {/* Sidebar */}
        <SettingsSidebar />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 text-[var(--text-secondary)]">
          {tab === "personalization" && <Personalization />}
          {tab === "notifications" && <Notifications />}
          {tab === "data" && <DataPanel />}
          {tab === "security" && <SecurityPanel />}
          {tab === "workspace" && <WorkspacePanel />}
          {tab === "billing" && <BillingPanel />}
          {tab === "memory" && <MemoryPanel />}
          {tab === "desktop" && <DesktopPanel />}
        </div>

        {/* Close */}
        <button
          onClick={closeSettings}
          aria-label="설정 닫기"
          className="
            absolute right-4 top-4
            rounded-full p-2
            text-gray-500 dark:text-[var(--text-muted)]
            hover:bg-gray-100 hover:text-black
            dark:hover:bg-white/10 dark:hover:text-[var(--text-primary)]
            transition
          "
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
