type QuickPrompt = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  content: string;
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "recommend",
    title: "추천해줘",
    description: "선택이 필요할 때",
    emoji: "⭐",
    content: "이 상황에서 가장 좋은 선택을 추천해줘:",
  },
  {
    id: "explain",
    title: "이게 뭐야?",
    description: "개념이 헷갈릴 때",
    emoji: "❓",
    content: "이게 정확히 뭐고 왜 중요한지 설명해줘:",
  },
  {
    id: "summarize",
    title: "정리해줘",
    description: "정보가 많을 때",
    emoji: "🧾",
    content: "아래 내용을 핵심만 정리해줘:",
  },
  {
    id: "compare",
    title: "비교해줘",
    description: "결정 전에",
    emoji: "⚖️",
    content: "다음 두 가지를 기준별로 비교해줘:",
  },
  {
    id: "howto",
    title: "어떻게 해?",
    description: "방법이 필요할 때",
    emoji: "🛠️",
    content: "이걸 단계별로 어떻게 하면 되는지 알려줘:",
  },
  {
    id: "idea",
    title: "아이디어",
    description: "막힐 때",
    emoji: "💡",
    content: "이 주제로 실용적인 아이디어를 정리해줘:",
  },
];

export default function QuickPromptBar({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <>
      <aside
        className="
          fixed left-4 top-24 z-20
          hidden lg:flex
          flex-col gap-2
        "
      >
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.content)}
            className="
              group flex items-center gap-3
              rounded-xl border bg-white
              dark:bg-[#1b1b1b] dark:border-[var(--line)]
              px-4 py-3
              text-left
              shadow-sm
              hover:bg-gray-50 dark:hover:bg-white/5 hover:shadow
              transition
            "
          >
            <span className="text-lg">{p.emoji}</span>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]">
                {p.title}
              </span>
              <span className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">
                {p.description}
              </span>
            </div>
          </button>
        ))}
      </aside>

      <div className="w-full lg:hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.content)}
              className="
                flex shrink-0 items-center gap-2
                rounded-full border bg-white
                dark:bg-[#1b1b1b] dark:border-[var(--line)]
                px-4 py-2
                text-sm font-medium text-gray-700 dark:text-[var(--text-primary)]
                shadow-sm
              "
            >
              <span className="text-base">{p.emoji}</span>
              <span>{p.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
