"use client";

import { useTimelineStore } from "@/store/useTimelineStore";
import { useGraphStore } from "@/store/useGraphStore";

/* ---------------------------------------------------------
   TimelinePanel — SSOT SAFE FINAL
--------------------------------------------------------- */
export default function TimelinePanel() {
  const { visible, timeline, loading, close } = useTimelineStore();
  const { highlightNode } = useGraphStore();

  if (!visible) return null;

  return (
    <aside
      className="
        fixed top-0 right-0 h-full w-[380px]
        border-l border-black/10 bg-[rgba(255,255,255,0.55)]
        backdrop-blur-2xl shadow-xl p-5 overflow-y-auto z-50
        animate-slide-left
      "
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🧠 Thinking Timeline</h2>
        <button
          onClick={close}
          className="text-sm text-black/50 hover:text-black"
        >
          ✕
        </button>
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-black/40 mb-4 leading-relaxed">
        AI의 사고 과정이 단계별로 기록됩니다.
        <br />
        각 단계를 클릭하면 그래프가 해당 단계로 이동합니다.
      </p>

      {/* LOADING */}
      {loading && (
        <p className="text-sm text-black/40">
          타임라인 데이터를 불러오는 중…
        </p>
      )}

      {/* EMPTY */}
      {!loading && timeline.length === 0 && (
        <p className="text-sm text-black/40">
          현재 Spine 사고 기록이 없습니다.
          <br />
          Spine 모델로 대화를 진행하면 자동 기록됩니다.
        </p>
      )}

      {/* TIMELINE ITEMS */}
      {timeline.map((item, idx) => (
        <div
          key={idx}
          onClick={() => {
            // 🔥 Graph highlight만 수행 (SSOT 준수)
            highlightNode(String(item.stage));
          }}
          className="
            mb-4 p-4 rounded-xl cursor-pointer
            bg-[rgba(255,255,255,0.75)] border border-black/10 shadow
            hover:bg-white/90 transition
          "
        >
          <div className="text-xs font-semibold text-black/60 mb-1">
            {idx + 1}. {item.stage}
          </div>

          <pre className="text-[11px] whitespace-pre-wrap text-black/70">
            {JSON.stringify(item.output, null, 2)}
          </pre>

          <div className="text-[10px] text-black/40 mt-2">
            {new Date(item.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </aside>
  );
}
