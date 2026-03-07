// 📂 src/components/sidebar/ModelPanel.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { ConsoleModelType } from "@/types/console-model";

// 표시용 모델 목록
const MODEL_LIST: {
  type: ConsoleModelType;
  name: string;
  desc: string;
}[] = [
  { type: "basic", name: "Basic", desc: "일반 대화형 모델" },
  { type: "pro", name: "Pro", desc: "고급 분석 (HPE + Memory)" },
  { type: "spine", name: "Spine", desc: "SPINE 엔진 (Omega + Quantum)" },
  { type: "assistant", name: "Assistant", desc: "구조화·작업형 응답" },
  { type: "developer", name: "Developer", desc: "개발자 모드" },
];

// UI 잠금 규칙 (서버 권한은 별도)
function isLocked(model: ConsoleModelType, tier: string): boolean {
  if (tier === "enterprise") return false;
  if (tier === "business") return model === "developer";
  if (tier === "pro") return model === "developer";
  if (tier === "free") return model !== "basic";
  return true;
}

export default function ModelPanel({
  selected,
  onSelect,
}: {
  selected: ConsoleModelType;
  onSelect: (m: ConsoleModelType) => void;
}) {
  const { profile, status } = useAuth();

  if (status !== "authed" || !profile) {
    return <p className="text-black/50">⚠ 로그인 필요</p>;
  }

  const tier = profile.tier;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-black">Model Selection</h2>

      <p className="text-sm text-black/60">
        현재 플랜: <b>{tier}</b>
      </p>

      <div className="flex flex-col gap-3">
        {MODEL_LIST.map((m) => {
          const locked = isLocked(m.type, tier);
          const active = selected === m.type;

          return (
            <button
              key={m.type}
              disabled={locked}
              onClick={() => !locked && onSelect(m.type)}
              className={`
                text-left w-full p-4 rounded-xl border shadow-sm backdrop-blur-xl
                transition flex flex-col
                ${
                  locked
                    ? "bg-white/40 border-black/10 text-black/40 cursor-not-allowed"
                    : active
                    ? "bg-black text-white border-black"
                    : "bg-white/80 border-black/10 text-black hover:bg-white"
                }
              `}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{m.name}</span>
                {locked && (
                  <span className="text-xs bg-black/10 px-2 py-0.5 rounded-md">
                    잠금
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 text-black/60">{m.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
