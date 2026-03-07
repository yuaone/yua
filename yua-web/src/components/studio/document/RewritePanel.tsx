"use client";

import { useState } from "react";

type Props = {
  sectionId: string | null;
  onRewrite: (instruction: string) => Promise<void>;
};

export default function RewritePanel({
  sectionId,
  onRewrite,
}: Props) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  if (!sectionId) {
    return (
      <div className="p-4 text-sm text-gray-400">
        수정할 섹션을 선택하세요
      </div>
    );
  }

  return (
    <div className="p-4 border-t bg-white space-y-2">
      <div className="text-xs font-semibold text-gray-600">
        선택한 섹션 다시 쓰기
      </div>

      <textarea
        className="w-full border rounded p-2 text-sm"
        rows={3}
        placeholder="예: 이 부분을 더 간결하게 정리해줘"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <button
        disabled={loading || !instruction.trim()}
        onClick={async () => {
          setLoading(true);
          try {
            await onRewrite(instruction);
            setInstruction("");
          } finally {
            setLoading(false);
          }
        }}
        className="
          px-3 py-1.5 text-sm rounded
          bg-black text-white
          disabled:opacity-40
        "
      >
        {loading ? "수정 중…" : "다시 쓰기"}
      </button>
    </div>
  );
}
