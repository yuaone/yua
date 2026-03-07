"use client";

import { useGraphStore } from "@/store/useGraphStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import { useChatStore } from "@/store/useChatStore";

export default function GraphPanel() {
  const {
    visible,
    loading,
    nodes,
    edges,
    close,
    highlightedNode,
    highlightNode,
  } = useGraphStore();

  const { open: openTimeline } = useTimelineStore();
  const { setJumpTarget } = useChatStore();

  if (!visible) return null;

  return (
    <aside
      className="
        fixed top-0 right-0 h-full w-[420px]
        border-l border-black/10 bg-[rgba(255,255,255,0.65)]
        backdrop-blur-2xl shadow-xl p-5 overflow-y-auto z-50
        animate-slide-left
      "
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">📊 Spine Graph View</h2>
        <button onClick={close} className="text-sm text-black/50 hover:text-black">
          ✕
        </button>
      </div>

      {/* LOADING */}
      {loading && <p className="text-sm text-black/40">그래프 데이터를 불러오는 중…</p>}

      {/* EMPTY */}
      {!loading && nodes.length === 0 && (
        <p className="text-sm text-black/40">
          아직 Spine 그래프가 없습니다.
          <br />Spine 모델로 대화를 시작하면 자동 생성됩니다.
        </p>
      )}

      <div className="space-y-6">
        {nodes.map((node) => {
          const highlight = highlightedNode === node.id;

          const safeThreadId = String(node.threadId ?? "");
          const safeMessageId = String(node.messageId ?? "");

          return (
            <div
              key={node.id}
              onClick={() => {
                highlightNode(node.id);

                // ⭐ 타임라인 열기
                if (safeThreadId && safeMessageId) {
                  openTimeline(safeThreadId, safeMessageId);
                }

                // ⭐ ChatMain 점프 설정
                if (safeMessageId) {
                  setJumpTarget(safeMessageId);
                }
              }}
              className={`
                rounded-xl border shadow p-4 cursor-pointer transition
                ${node.type === "message" ? "bg-white/80" : "bg-blue-50/70"}
                ${highlight ? "ring-2 ring-blue-500 scale-[1.02]" : ""}
              `}
            >
              <div className="text-xs text-black/60 mb-2">
                {node.type === "message" ? "Message" : `Stage · ${node.stage}`}
              </div>

              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {node.label}
              </div>

              <div className="text-[10px] mt-2 text-black/40">
                {new Date(node.timestamp).toLocaleString()}
              </div>
            </div>
          );
        })}

        {/* EDGES */}
        <div className="mt-10">
          <h3 className="text-sm font-medium mb-2 text-black/60">연결 흐름 (Edges)</h3>

          {edges.map((e, i) => (
            <div key={i} className="text-xs text-black/50 flex gap-2 items-center">
              <span className="font-mono">{e.from}</span>
              <span>→</span>
              <span className="font-mono">{e.to}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
