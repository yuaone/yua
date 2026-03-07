"use client";

import { useChatDraft } from "@/store/useChatDraft";

const PROMPTS = [
  {
    label: "📐 새 프로젝트 구조를 잡아줘",
    value: "새 프로젝트 구조를 처음부터 같이 잡아줘.",
  },
  {
    label: "🧠 지금까지 한 결정을 정리해줘",
    value: "지금까지 논의한 결정들을 정리해줘.",
  },
  {
    label: "💡 이 아이디어 실현 가능할까?",
    value: "이 아이디어가 실제로 실현 가능한지 분석해줘.",
  },
];

export default function GuestIntroMessage() {
  const setDraft = useChatDraft((s) => s.setDraft);

  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="mb-4 text-gray-800">
        안녕하세요.<br />
        저는 프로젝트와 결정을 하나의 흐름으로<br />
        정리해주는 AI, <strong>YUA</strong>입니다.
      </p>

      <p className="mb-6 text-sm text-gray-500">
        아래에서 하나 골라 시작해보세요.<br />
        아니면 바로 메시지를 입력해도 좋아요.
      </p>

      <div className="flex flex-col gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.value}
            onClick={() => setDraft(p.value)}
            className="w-full rounded-lg border px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
