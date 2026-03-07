// 📂 src/app/billing/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getAuthHeader } from "@/lib/auth.client";

type BillingHistoryItem = {
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function BillingHistoryPage() {
  const [history, setHistory] = useState<BillingHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(
          "https://api.yuaone.com/billing/history",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
          }
        );

        if (!res.ok) {
          setHistory(null);
          return;
        }

        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setHistory(null);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-semibold mb-6">Payment History</h1>

      {loading && <p className="text-black/40">Loading...</p>}

      {!loading && (!history || history.length === 0) && (
        <p>No history found.</p>
      )}

      <div className="space-y-4">
        {history?.map((row, idx) => (
          <div
            key={idx}
            className="
              bg-white/70 backdrop-blur-xl shadow
              border border-black/10 rounded-xl p-4
            "
          >
            <p>
              Amount: {row.amount} {row.currency}
            </p>
            <p>Status: {row.status}</p>
            <p className="text-black/40 text-sm">
              {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
