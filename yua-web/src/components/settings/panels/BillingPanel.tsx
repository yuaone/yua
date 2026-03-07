"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/chat/primitives/Card";
import { scheduleDowngrade, cancelDowngrade } from "@/lib/api/billing.api";
import UpdatePaymentMethodModal from "@/components/billing/UpdatePaymentMethodModal";
import { useBillingGuard } from "@/hooks/useBillingGuard";
import SmartUpgradeModal from "@/components/billing/SmartUpgradeModal";

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

function formatDate(input?: string | null) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR")
    .format(d)
    .replace(/\./g, "-")
    .replace(/\s/g, "")
    .slice(0, 10);
}

export default function BillingPanel() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const { isSoftLocked, isHardLocked, tier: guardTier } = useBillingGuard();
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const refreshingBillingRef = useRef(false);
  const refreshingUsageRef = useRef(false);
  const refreshingHistoryRef = useRef(false);
  const lastEventIdRef = useRef<string | null>(null);

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
    // 🔥 세션 1회만 호출
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
  }, []); // ⬅️ 의존성 제거 (중요)

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshUsage(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [refreshUsage]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshHistory();
    };
    run();
    return () => {
      mounted = false;
    };
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
  const nextBilling = formatDate(data?.nextBillingAt);
  const graceUntil = formatDate(data?.graceUntil);
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

  const handleBillingEvent = useCallback(
    (payload: any) => {
      const id = payload?.id ? String(payload.id) : null;
      if (id && lastEventIdRef.current === id) return;
      if (id) lastEventIdRef.current = id;

      const type = String(payload?.type ?? "");
      if (type === "billing.success") {
        void refreshBilling();
        void refreshUsage();
        setPaymentModalOpen(false);
        setToast({ type: "success", message: "결제가 성공적으로 처리되었습니다." });
      } else if (type === "billing.failed") {
        void refreshBilling();
        setToast({ type: "error", message: "결제에 실패했습니다." });
      } else if (type === "billing.canceled") {
        void refreshBilling();
        setToast({ type: "error", message: "결제가 취소되었습니다." });
      } else if (type === "billing.expired") {
        void refreshBilling();
        setToast({ type: "error", message: "구독이 만료되었습니다." });
      }
    },
    [refreshBilling, refreshUsage]
  );

  useEffect(() => {
    const es = new EventSource("/api/billing/events", { withCredentials: true });
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload?.type) return;
        handleBillingEvent(payload);
      } catch {}
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [handleBillingEvent]);

// ❌ visibility polling 제거

// ❌ 1분 polling 제거

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
      <SmartUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
      <UpdatePaymentMethodModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          setToast({ type: "success", message: "결제수단이 변경되었습니다." });
          void refreshBilling();
        }}
      />
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
          <div className="h-6 bg-gray-100 rounded w-1/2" />
          <div className="h-6 bg-gray-100 rounded w-2/3" />
          <div className="h-6 bg-gray-100 rounded w-1/3" />
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
              <div className="font-semibold">⚠ 결제 실패</div>
              <div className="text-sm">3일 유예기간이 적용되었습니다.</div>
              <div className="text-sm">유예 종료일: {graceUntil}</div>
              {graceRemainingDays != null && graceRemainingHours != null && (
                <div className="text-sm font-medium">
                  유예 종료까지 D-{graceRemainingDays} ({graceRemainingHours}시간 남음)
                </div>
              )}
              <button
                onClick={() => router.push("/upgrade")}
                className="mt-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                재결제하기
              </button>
            </div>
          )}

          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">현재 플랜</div>
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
            <div className="mt-2 text-sm text-gray-500">Current Plan: {tier.toUpperCase()}</div>
            <div className="mt-1 text-sm text-gray-500">Next Billing: {nextBilling}</div>
            <div className="mt-1 text-sm text-gray-500">
              Renewal Attempts: {data.renewalAttempts}
            </div>
            {data.status === "pending" && data.renewalAttempts > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                자동 재시도 중 (시도 횟수: {data.renewalAttempts})
              </div>
            )}
            {data.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  결제수단 변경
                </button>
                <button
                  onClick={() => router.push("/upgrade")}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  재결제하기
                </button>
              </div>
            )}

            {data.scheduledDowngradePlan && (
              <div className="mt-4 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm text-gray-600 flex items-start gap-2">
                <span className="mt-0.5">ℹ</span>
                <span>
                  현재 요금제는 다음 결제일부터 {data.scheduledDowngradePlan} 으로 변경됩니다.
                </span>
              </div>
            )}
          </Card>

          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">플랜 변경</div>
            <div className="mt-1 text-sm text-gray-500">
              필요에 따라 업그레이드하거나 예약 다운그레이드를 설정할 수 있습니다.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tier !== "enterprise" && tier === "free" && (
                <button
                  onClick={() => router.push("/upgrade?plan=pro")}
                  disabled={isSoftLocked || isHardLocked}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
                >
                  Upgrade to Pro
                </button>
              )}

              {tier !== "enterprise" && tier === "pro" && (
                <>
                  <button
                    onClick={() => router.push("/upgrade?plan=business")}
                    disabled={isSoftLocked || isHardLocked}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
                  >
                    Upgrade to Business
                  </button>
                  <button
                    onClick={() => router.push("/upgrade?plan=enterprise")}
                    disabled={isSoftLocked || isHardLocked}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
                  >
                    Upgrade to Enterprise
                  </button>
                </>
              )}

              {tier !== "enterprise" && tier === "business" && (
                <button
                  onClick={() => router.push("/upgrade?plan=enterprise")}
                  disabled={isSoftLocked || isHardLocked}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
                >
                  Upgrade to Enterprise
                </button>
              )}

              {!data.scheduledDowngradePlan && tier !== "free" && (
                <button
                  onClick={() => handleScheduleDowngrade("free")}
                  disabled={downgradeLoading}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                >
                  {downgradeLoading ? "처리 중..." : "예약 다운그레이드 설정"}
                </button>
              )}

              {data.scheduledDowngradePlan && (
                <button
                  onClick={handleCancelDowngrade}
                  disabled={downgradeLoading}
                  className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
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
          </Card>

          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">이번 달 사용량</div>
            {usageLoading && (
              <div className="mt-4 h-3 bg-gray-100 rounded-full w-full" />
            )}
            {!usageLoading && hasLimit && (
              <>
                <div className="mt-2 text-sm text-gray-500">
                  Tokens: {usedTokens.toLocaleString()} / {monthlyLimit.toLocaleString()}
                </div>
                <div className="mt-3 bg-gray-100 rounded-full h-3">
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
                        onClick={() => router.push("/upgrade")}
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
              <div className="mt-2 text-sm text-gray-500">제한 없음</div>
            )}
          </Card>

          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">결제 이력</div>
            <div className="mt-2 text-sm text-gray-500">
              <button
                onClick={() => setHistoryView((v) => (v === "timeline" ? "table" : "timeline"))}
                className="text-xs rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 transition"
              >
                {historyView === "timeline" ? "표 보기" : "타임라인 보기"}
              </button>
            </div>

            {historyLoading && (
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
            )}

            {!historyLoading && historyError && (
              <div className="mt-3 text-sm text-red-600">
                결제 이력을 불러오지 못했습니다.
              </div>
            )}

            {!historyLoading && !historyError && historyData.length === 0 && (
              <div className="mt-3 text-sm text-gray-500">결제 이력이 없습니다.</div>
            )}

            {!historyLoading && !historyError && historyData.length > 0 && historyView === "timeline" && (
              <div className="mt-6 relative border-l border-gray-200">
                {data?.status === "pending" && (
                  <div className="relative pl-6 pb-6">
                    <span className="absolute left-[-6px] top-1.5 h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="text-sm text-gray-600">유예 시작</div>
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
                      <div className="text-xs text-gray-400">{formatDate(h.createdAt)}</div>
                      <div className="mt-1 text-sm text-gray-800">{label}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {String(h.plan).toUpperCase()} • {Number(h.amount).toLocaleString("ko-KR")}원
                      </div>
                    </div>
                  );
                })}
                {data?.status === "expired" && (
                  <div className="relative pl-6 pb-2">
                    <span className="absolute left-[-6px] top-1.5 h-3 w-3 rounded-full bg-red-500" />
                    <div className="text-sm text-gray-600">유예 종료</div>
                  </div>
                )}
              </div>
            )}

            {!historyLoading && !historyError && historyData.length > 0 && historyView === "table" && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="py-2 font-medium">날짜</th>
                      <th className="py-2 font-medium">플랜</th>
                      <th className="py-2 font-medium">상태</th>
                      <th className="py-2 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((h, i) => (
                      <tr key={`${h.createdAt}-${i}`} className="border-t">
                        <td className="py-2 text-gray-600">{formatDate(h.createdAt)}</td>
                        <td className="py-2 text-gray-700">{String(h.plan).toUpperCase()}</td>
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
                        <td className="py-2 text-gray-700">
                          {Number(h.amount).toLocaleString("ko-KR")}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
