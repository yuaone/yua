"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

type BillingStatus = "pending" | "paid" | "failed";

type BillingCreditsResponse = {
  credits: number;
};

type BillingCharge = {
  id: number;
  amount: number;
  currency: string;
  status: BillingStatus;
  created_at: string;
};

type BillingChargesResponse = {
  page: number;
  pageSize: number;
  total: number;
  charges: BillingCharge[];
};

const PAGE_SIZE = 10;

export default function BillingPage() {
  const router = useRouter();

  const [credits, setCredits] = useState<number>(0);
  const [charges, setCharges] = useState<BillingCharge[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | BillingStatus>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [paying, setPaying] = useState<boolean>(false);

  // ----------------------------------------------------
  // 1) Load Credits
  // ----------------------------------------------------
  async function loadCredits() {
    const res = await apiGet<BillingCreditsResponse>("/api/billing/credits");
    if (res.ok && res.data) {
      setCredits(res.data.credits ?? 0);
    }
  }

  // ----------------------------------------------------
  // 2) Load Charges
  // ----------------------------------------------------
  async function loadCharges(
    nextPage = 1,
    nextStatus: "" | BillingStatus = statusFilter
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(PAGE_SIZE));
      if (nextStatus) params.set("status", nextStatus);

      const res = await apiGet<BillingChargesResponse>(
        `/api/billing/charges?${params.toString()}`
      );

      if (!res.ok || !res.data) {
        throw new Error("Billing charges load failed");
      }

      setCharges(res.data.charges || []);
      setPage(res.data.page);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
      alert("❌ 결제 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // 3) Filtering
  // ----------------------------------------------------
  function onChangeStatus(nextStatus: "" | BillingStatus) {
    setStatusFilter(nextStatus);
    loadCharges(1, nextStatus);
  }

  // ----------------------------------------------------
  // 4) Formatters
  // ----------------------------------------------------
  function formatStatus(status: BillingStatus) {
    if (status === "paid") return "Paid";
    if (status === "pending") return "Pending";
    if (status === "failed") return "Failed";
    return status;
  }

  function formatAmount(amount: number, currency: string) {
    return `${new Intl.NumberFormat("ko-KR").format(amount)} ${currency}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ----------------------------------------------------
  // 5) Toss 결제 요청
  // ----------------------------------------------------
  async function requestPayment(amount: number, tier: string) {
    if (paying) return;
    setPaying(true);

    try {
      const res = await apiPost("/api/billing/toss", { amount, tier });

      if (!res.ok || !res.data) {
        alert("❌ 결제를 생성할 수 없습니다.");
        return;
      }

      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("❌ 결제 요청 중 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  }

  // ----------------------------------------------------
  // 6) Initial loading
  // ----------------------------------------------------
  useEffect(() => {
    loadCredits();
    loadCharges(1, statusFilter);
  }, []);

  // ----------------------------------------------------
  // 7) Auto refresh after success/fail
  // ----------------------------------------------------
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("refresh") === "1") {
      loadCredits();
      loadCharges();
      url.searchParams.delete("refresh");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <div className="p-10 text-black">
      {/* HEADER */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold">Billing & Credits</h1>
        <p className="text-black/60 text-sm max-w-2xl">
          결제 내역과 보유 크레딧을 관리할 수 있습니다.
        </p>
      </div>

      {/* ---- PLANS ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Basic */}
        <PlanCard
          title="Basic"
          desc="₩10,000 → 10,000 credits"
          amount={10000}
          tier="basic"
          paying={paying}
          onPay={requestPayment}
        />
        {/* Pro */}
        <PlanCard
          title="Pro"
          desc="₩30,000 → 35,000 credits"
          amount={30000}
          tier="pro"
          paying={paying}
          onPay={requestPayment}
        />
        {/* Enterprise */}
        <PlanCard
          title="Enterprise"
          desc="₩100,000 → 130,000 credits"
          amount={100000}
          tier="enterprise"
          paying={paying}
          onPay={requestPayment}
        />
      </div>

      {/* ---- HISTORY ---- */}
      <div className="bg-white/80 backdrop-blur-xl border border-black/10 rounded-2xl p-6 shadow">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Payment History</h2>
            <p className="text-xs text-black/50 mt-1">
              최근 결제 내역을 확인할 수 있습니다.
            </p>
          </div>

          <div className="flex gap-2 text-sm">
            {["", "paid", "pending", "failed"].map((s) => (
              <button
                key={s}
                onClick={() => onChangeStatus(s as BillingStatus | "")}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  statusFilter === s
                    ? "bg-black text-white border-black"
                    : "bg-white/80 text-black/70 border-black/20"
                }`}
              >
                {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-2 border border-black/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-black/60">ID</th>
                <th className="px-4 py-3 text-left text-xs text-black/60">Amount</th>
                <th className="px-4 py-3 text-left text-xs text-black/60">Status</th>
                <th className="px-4 py-3 text-left text-xs text-black/60">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-black/50">
                    결제 내역을 불러오는 중입니다...
                  </td>
                </tr>
              ) : charges.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-black/50">
                    표시할 결제 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                charges.map((c) => (
                  <tr key={c.id} className="border-t border-black/5">
                    <td className="px-4 py-3">#{c.id}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatAmount(c.amount, c.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          c.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-black/70">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------ */
function PlanCard({
  title,
  desc,
  amount,
  tier,
  paying,
  onPay,
}: {
  title: string;
  desc: string;
  amount: number;
  tier: string;
  paying: boolean;
  onPay: (amount: number, tier: string) => void;
}) {
  return (
    <div className="bg-white/80 border border-black/10 rounded-2xl p-6 shadow flex flex-col">
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      <p className="text-black/60 text-sm mb-4">{desc}</p>

      <button
        disabled={paying}
        onClick={() => onPay(amount, tier)}
        className="mt-auto bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80 transition disabled:bg-black/40"
      >
        {paying ? "Processing..." : `Purchase ${title}`}
      </button>
    </div>
  );
}
