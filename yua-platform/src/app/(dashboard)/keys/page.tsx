"use client";

import { useState, useCallback, useEffect } from "react";
import ApiKeyRow from "@/components/ApiKeyRow";
import { fetchApiKeys, createApiKey, revokeApiKey, type ApiKey } from "@/lib/platform-api";

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [createdKeyCopied, setCreatedKeyCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  /* ── Load keys ── */
  useEffect(() => {
    fetchApiKeys()
      .then(setKeys)
      .catch((err) => console.error("[keys] fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim() || creating) return;
    setCreating(true);
    try {
      const data = await createApiKey(newKeyName.trim());
      setKeys((prev) => [data, ...prev]);
      setCreatedKey(data);
      setNewKeyName("");
    } catch (err) {
      console.error("[keys] create error:", err);
    } finally {
      setCreating(false);
    }
  }, [newKeyName, creating]);

  const handleRevoke = useCallback(
    (id: number) => {
      const target = keys.find((k) => k.id === id);
      if (target) setRevokeTarget(target);
    },
    [keys],
  );

  const confirmRevoke = useCallback(async () => {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    try {
      await revokeApiKey(revokeTarget.id);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokeTarget.id
            ? { ...k, status: "revoked" as const, revoked_at: new Date().toISOString() }
            : k,
        ),
      );
      setRevokeTarget(null);
    } catch (err) {
      console.error("[keys] revoke error:", err);
    } finally {
      setRevoking(false);
    }
  }, [revokeTarget, revoking]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewKeyName("");
    setCreatedKey(null);
    setCreatedKeyCopied(false);
  }, []);

  const handleCopyCreatedKey = useCallback(async () => {
    if (!createdKey?.key) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = createdKey.key!;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCreatedKeyCopied(true);
    setTimeout(() => setCreatedKeyCopied(false), 2000);
  }, [createdKey]);

  const activeCount = keys.filter((k) => k.status === "active").length;
  const revokedCount = keys.filter((k) => k.status === "revoked").length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            API 키 관리
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            API 키를 생성하고 관리합니다.{" "}
            <span className="text-[var(--text-muted)]">
              {activeCount}개 활성 / {revokedCount}개 폐기됨
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
            boxShadow: "0 1px 3px 0 rgba(124,58,237,0.4), 0 1px 2px -1px rgba(124,58,237,0.3)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          새 키 발급
        </button>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-[var(--line)] animate-spin"
            style={{ borderTopColor: "var(--accent)" }}
          />
        </div>
      ) : keys.length > 0 ? (
        /* ── Key Cards ── */
        <div className="flex flex-col gap-3">
          {keys.map((k) => (
            <ApiKeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
          ))}
        </div>
      ) : (
        /* ── Empty State ── */
        <div
          className="rounded-2xl border border-[var(--line)] py-20 flex flex-col items-center justify-center"
          style={{
            background: "var(--surface-main)",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--text-primary)] mb-1">
            아직 API 키가 없습니다
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            첫 번째 API 키를 생성하고 YUA API를 사용해보세요.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
              boxShadow: "0 1px 3px 0 rgba(124,58,237,0.4)",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            첫 API 키 만들기
          </button>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", background: "rgba(0,0,0,0.4)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--line)] p-6 animate-in"
            style={{
              background: "var(--surface-main)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              animation: "modalIn 0.2s ease-out",
            }}
          >
            {!createdKey ? (
              /* Step 1: Name input */
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">새 API 키 생성</h2>
                    <p className="text-xs text-[var(--text-muted)]">키 이름을 입력하세요</p>
                  </div>
                </div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">키 이름</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="예: Production Server"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface-panel)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-panel)] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newKeyName.trim() || creating}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
                      boxShadow: newKeyName.trim() ? "0 1px 3px 0 rgba(124,58,237,0.4)" : "none",
                    }}
                  >
                    {creating ? "생성 중..." : "생성"}
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: Show generated key */
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">키가 생성되었습니다</h2>
                    <p className="text-xs text-[var(--text-muted)]">{createdKey.name}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--surface-panel)] border border-[var(--line)] p-4 my-5">
                  <p className="text-xs text-[var(--text-muted)] mb-2">API 키</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-[var(--text-primary)] font-mono break-all flex-1">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={handleCopyCreatedKey}
                      className="shrink-0 p-2 rounded-lg hover:bg-[var(--line)] transition-colors relative"
                      title="복사"
                    >
                      {createdKeyCopied ? (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 mb-5">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">주의:</span> 이 키는 다시 표시되지 않습니다. 안전한 곳에 복사해두세요.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeCreateModal}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
                      boxShadow: "0 1px 3px 0 rgba(124,58,237,0.4)",
                    }}
                  >
                    완료
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Revoke Confirmation Modal ── */}
      {revokeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", background: "rgba(0,0,0,0.4)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] p-6"
            style={{
              background: "var(--surface-main)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              animation: "modalIn 0.2s ease-out",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">키 폐기 확인</h2>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1 leading-relaxed">
              <span className="font-semibold text-[var(--text-primary)]">{revokeTarget.name}</span> 키를 폐기하시겠습니까?
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              폐기된 키는 즉시 비활성화되며, 이 키를 사용하는 모든 요청이 거부됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-panel)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmRevoke}
                disabled={revoking}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                style={{ boxShadow: "0 1px 3px 0 rgba(220,38,38,0.3)" }}
              >
                {revoking ? "처리 중..." : "폐기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
