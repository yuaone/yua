"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function UpdatePaymentMethodModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/billing/update-payment-method", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "update_payment_failed");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || "update_payment_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="text-lg font-semibold text-gray-900">결제수단 변경</div>
        <div className="mt-2 text-sm text-gray-500">카드 정보를 입력해주세요.</div>

        <div className="mt-4 space-y-2">
          <div className="h-10 rounded-lg border border-gray-200 bg-gray-50" />
          <div className="h-10 rounded-lg border border-gray-200 bg-gray-50" />
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "처리 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
