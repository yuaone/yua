"use client";

import { useState } from "react";
import { testApiCall, type TestResult } from "@/lib/platform-api";

const MODELS = [
  { id: "yua-basic", label: "YUA Basic", desc: "빠른 응답, 경량 작업" },
  { id: "yua-normal", label: "YUA Normal", desc: "범용, 균형 잡힌 성능" },
  { id: "yua-pro", label: "YUA Pro", desc: "고품질, 복잡한 작업" },
];

export default function PlaygroundPage() {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("yua-basic");
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const data = await testApiCall(message.trim(), model);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          API 플레이그라운드
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1.5">
          YUA API를 직접 테스트해보세요.
        </p>
      </div>

      {/* Model Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          모델 선택
        </label>
        <div className="flex gap-3">
          {MODELS.map((m) => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className="flex-1 rounded-xl border px-4 py-3 text-left transition-all duration-150"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--line)",
                  background: active ? "rgba(124,58,237,0.08)" : "var(--surface-main)",
                }}
              >
                <div
                  className="text-sm font-semibold"
                  style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {m.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          메시지
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="API에 보낼 메시지를 입력하세요..."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface-main)",
            color: "var(--text-primary)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTest();
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {message.length}/1000
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ctrl+Enter로 전송
          </span>
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleTest}
        disabled={!message.trim() || loading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-6"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)",
          boxShadow: message.trim() && !loading ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="w-4 h-4 rounded-full border-2 border-white/30 animate-spin"
              style={{ borderTopColor: "#fff" }}
            />
            요청 중...
          </span>
        ) : (
          "API 호출 테스트"
        )}
      </button>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl border px-4 py-3 mb-6 text-sm"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Response */}
      {result && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--line)", background: "var(--surface-main)" }}
        >
          {/* Meta bar */}
          <div
            className="flex items-center gap-4 px-4 py-2.5 border-b text-xs flex-wrap"
            style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  result.status === 200 ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                {result.model}
              </span>
            </span>
            <span>{result.latency}ms</span>
            {result.usage && (
              <span>
                토큰: {result.usage.prompt_tokens ?? 0} + {result.usage.completion_tokens ?? 0} = {result.usage.total_tokens ?? 0}
              </span>
            )}
          </div>
          {/* Response body */}
          <div
            className="p-4 text-sm whitespace-pre-wrap leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          >
            {result.response || "(빈 응답)"}
          </div>
        </div>
      )}

      {/* Code Example */}
      <div className="mt-8">
        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          코드 예시
        </label>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--line)", background: "var(--surface-panel)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ borderColor: "var(--line)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              cURL
            </span>
            <button
              onClick={() => {
                const code = `curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model}", "messages": [{"role": "user", "content": "Hello"}]}'`;
                navigator.clipboard.writeText(code).catch(() => {});
              }}
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              복사
            </button>
          </div>
          <pre
            className="p-4 text-xs leading-relaxed overflow-x-auto"
            style={{ color: "var(--text-secondary)" }}
          >
{`curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model}", "messages": [{"role": "user", "content": "Hello"}]}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
