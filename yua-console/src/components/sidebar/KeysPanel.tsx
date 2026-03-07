// 📂 src/components/sidebar/KeysPanel.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function KeysPanel() {
  const { status, authFetch } = useAuth();

  const [createdKey, setCreatedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    if (status !== "authed") {
      setMsg("⚠ 로그인 후 사용 가능합니다");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await authFetch("/api/key/create", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data?.key?.key) {
        const key = data.key.key;
        setCreatedKey(key);
        localStorage.setItem("YUA_API_KEY", key);
      } else {
        setMsg("❌ 키 발급 실패");
      }
    } catch {
      setMsg("❌ 서버 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-black">
      <h2 className="text-lg font-semibold">API Key</h2>

      <button
        onClick={generate}
        disabled={loading}
        className="
          w-full rounded-xl bg-black text-white py-2 font-medium
          shadow hover:bg-black/80 transition disabled:opacity-50
        "
      >
        {loading ? "발급 중..." : "새 API Key 발급"}
      </button>

      {createdKey && (
        <div className="p-3 bg-white/70 border border-black/10 rounded-xl text-xs break-all">
          <div className="font-semibold mb-1">생성된 API Key</div>
          {createdKey}
        </div>
      )}

      {msg && <div className="text-xs text-red-600">{msg}</div>}
    </div>
  );
}
