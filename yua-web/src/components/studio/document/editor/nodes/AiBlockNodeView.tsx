"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useState, useCallback } from "react";
import type { AiBlockAttrs } from "../extensions/ai-block";

export default function AiBlockNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as AiBlockAttrs;
  const [prompt, setPrompt] = useState(attrs.prompt);

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    updateAttributes({ prompt, status: "generating", result: "" });

    const storage = (editor.storage as any).aiBlock as {
      authFetch: ((url: string, init?: RequestInit) => Promise<Response>) | null;
      docId: string | null;
    } | undefined;

    const authFetch = storage?.authFetch;
    const docId = storage?.docId;

    try {
      let result = "";

      if (authFetch && docId) {
        const res = await authFetch(`/api/workspace/docs/${docId}/ai/generate`, {
          method: "POST",
          body: JSON.stringify({
            prompt: prompt.trim(),
            mode: "generate",
          }),
        });
        if (!res.ok) throw new Error("AI_ERROR");
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error ?? "AI_ERROR");
        result = data.result ?? "";
      } else {
        // Fallback: no authFetch available
        result = "AI 생성을 위해 문서를 저장한 후 다시 시도하세요.";
      }

      updateAttributes({ result, status: "done" });
    } catch {
      updateAttributes({ status: "error", result: "AI 생성에 실패했습니다." });
    }
  }, [prompt, updateAttributes, editor]);

  return (
    <NodeViewWrapper className="my-3">
      <div
        className={`
          rounded-xl border overflow-hidden
          bg-gradient-to-br from-violet-50 to-blue-50
          dark:from-violet-950/20 dark:to-blue-950/20
          border-violet-200 dark:border-violet-800/40
          ${selected ? "ring-2 ring-violet-500/50" : ""}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-200/60 dark:border-violet-800/30">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
            AI 생성
          </span>
          {attrs.status === "generating" && (
            <Loader2 size={12} className="animate-spin text-violet-500 ml-auto" />
          )}
        </div>

        {/* Prompt input */}
        <div className="px-4 py-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI에게 요청할 내용을 입력하세요..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={generate}
            disabled={attrs.status === "generating" || !prompt.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {attrs.status === "generating" ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                생성
              </>
            )}
          </button>
          {attrs.status === "error" && (
            <button
              onClick={generate}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
            >
              <RotateCcw size={12} />
              재시도
            </button>
          )}
        </div>

        {/* Result */}
        {attrs.result && (
          <div className="border-t border-violet-200/60 dark:border-violet-800/30 px-4 py-3">
            <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {attrs.result}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
