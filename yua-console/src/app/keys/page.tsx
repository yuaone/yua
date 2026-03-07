"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type ApiKeyItem = {
  id: number;
  api_key: string;
  role: string;
  created_at: string;
};

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadKeys() {
    try {
      setLoading(true);

      const res = await apiGet<{
        ok: boolean;
        keys: ApiKeyItem[];
      }>("/api/keys/list");

      // ✅ TypeScript용 명시적 가드
      if (!res.ok || !res.data) {
        throw new Error("load keys failed");
      }

      setKeys(res.data.keys || []);
    } catch (err) {
      console.error(err);
      alert("API Key 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (creating) return;
    setCreating(true);

    try {
      const res = await apiPost<{
        ok: boolean;
        key: { id: number; api_key: string };
      }>("/api/keys/create", {});

      // ✅ 동일한 타입 가드
      if (!res.ok || !res.data) {
        alert("API Key 생성에 실패했습니다.");
        return;
      }

      const newKey = res.data.key.api_key;

      await navigator.clipboard.writeText(newKey);

      alert(
        `새로운 API Key가 발급되었습니다.\n\n` +
          `키는 자동으로 클립보드에 복사되었습니다.\n\n` +
          `🔒 절대로 외부에 노출하지 마세요.\n` +
          `필요하면 여기에서 새로 발급할 수 있습니다.`
      );

      loadKeys();
    } catch (err) {
      console.error(err);
      alert("API Key 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: number) {
    if (
      !confirm(
        "정말로 이 API Key를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다."
      )
    )
      return;

    try {
      await apiPost("/api/keys/delete", { keyId: id });
      loadKeys();
    } catch (err) {
      console.error(err);
      alert("API Key 삭제에 실패했습니다.");
    }
  }

  function maskKey(key: string) {
    if (key.length < 12) return key;
    const start = key.slice(0, 6);
    const end = key.slice(-4);
    return `${start}••••••••••••${end}`;
  }

  useEffect(() => {
    loadKeys();
  }, []);

  return (
    <div className="p-10 text-black">
      <h1 className="text-3xl font-bold mb-3">API Keys</h1>
      <p className="text-black/60 mb-8">
        API Keys는 외부 서비스에서 YUA ONE 엔진을 호출할 때 사용됩니다.
        <br />
        절대로 외부에 공유하거나 코드 저장소에 업로드하지 마세요.
      </p>

      {/* CREATE BUTTON */}
      <button
        onClick={createKey}
        disabled={creating}
        className="
          bg-black text-white px-4 py-2 rounded-lg shadow
          hover:bg-black/80 transition
          disabled:bg-black/40
        "
      >
        {creating ? "Creating..." : "+ Create New Key"}
      </button>

      {/* KEYS LIST CARD */}
      <div className="mt-8 bg-white/70 backdrop-blur-xl p-6 rounded-xl shadow border border-black/10">
        {loading ? (
          <p className="animate-pulse text-black/50">
            Loading API Keys...
          </p>
        ) : keys.length === 0 ? (
          <p className="text-black/60">
            아직 생성된 API Key가 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {keys.map((k) => (
              <li
                key={k.id}
                className="
                  flex justify-between items-center py-3 px-4
                  border border-black/10 rounded-lg
                  bg-white/80 backdrop-blur
                "
              >
                <div>
                  <p className="font-mono text-sm">
                    {maskKey(k.api_key)}
                  </p>
                  <p className="text-[12px] text-black/40 mt-1">
                    Created:{" "}
                    {new Date(k.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(k.api_key);
                      alert("API Key가 복사되었습니다.");
                    }}
                    className="text-black/70 hover:text-black"
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => deleteKey(k.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-black/40 text-[12px]">
        * API Keys는 암호와 동일하므로 절대 외부에 노출하지 마세요.
      </p>
    </div>
  );
}
