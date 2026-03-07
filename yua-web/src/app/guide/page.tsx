"use client";

import { useRouter } from "next/navigation";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useChatStore } from "@/store/useChatStore";

const PRESETS = [
  {
    title: "이미지로 작업하기",
    desc: "사진을 분석하거나 새로운 이미지를 만들 수 있어요",
    prompt: "이 이미지를 분석해서 어떤 장면인지 설명해줘",
    accent: "from-indigo-500/10 to-indigo-500/0",
  },
  {
    title: "아이디어 정리하기",
    desc: "생각을 구조화해서 문서나 기획으로 정리해요",
    prompt: "이 아이디어를 기획안 구조로 정리해줘",
    accent: "from-emerald-500/10 to-emerald-500/0",
  },
  {
    title: "결정 도와줘",
    desc: "선택지를 비교하고 판단 근거를 정리해요",
    prompt: "이 두 선택지의 장단점을 비교해줘",
    accent: "from-amber-500/10 to-amber-500/0",
  },
  {
    title: "그냥 물어보기",
    desc: "가볍게 질문부터 시작해도 괜찮아요",
    prompt: "이 주제에 대해 간단히 설명해줘",
    accent: "from-gray-500/10 to-gray-500/0",
  },
];

export default function GuidePage() {
  const router = useRouter();
  const { createNewThread } = useSidebarData();
  const addUserMessage = useChatStore((s) => s.addUserMessage);

  const handleStart = async (prompt: string) => {
    const id = await createNewThread();
    if (!id) return;

    addUserMessage(prompt, Number(id));
    router.push(`/chat/${id}`);
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
            오늘 무엇을 해볼까요?
          </h1>
          <p className="text-gray-500 max-w-xl">
            YUA는 대화로 시작해,
            <br className="hidden sm:block" />
            생각을 정리하고 작업으로 이어집니다.
          </p>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PRESETS.map((p) => (
            <button
              key={p.title}
              onClick={() => handleStart(p.prompt)}
              className={`
                group relative rounded-xl border
                bg-gradient-to-b ${p.accent}
                p-5 text-left transition
                hover:border-black hover:shadow-sm
                focus:outline-none
              `}
            >
              <div className="flex flex-col gap-2">
                <div className="text-base font-medium">
                  {p.title}
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  {p.desc}
                </div>
              </div>

              <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">
                시작하기 →
              </div>
            </button>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="mt-12 text-xs text-gray-400">
          언제든 새 채팅으로 돌아와 다시 시작할 수 있어요
        </div>
      </div>
    </div>
  );
}
