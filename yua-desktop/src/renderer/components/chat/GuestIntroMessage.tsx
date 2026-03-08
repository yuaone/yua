import { useChatDraft } from "@/stores/useChatDraft";

const PROMPTS = [
  {
    label: "New project structure",
    value: "Help me set up a new project structure from scratch.",
  },
  {
    label: "Summarize decisions",
    value: "Summarize the decisions we've discussed so far.",
  },
  {
    label: "Evaluate this idea",
    value: "Analyze whether this idea is feasible.",
  },
];

export default function GuestIntroMessage() {
  const setDraft = useChatDraft((s) => s.setDraft);

  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="mb-4 text-gray-800">
        Hello.
        <br />
        I'm <strong>YUA</strong>, an AI that organizes
        <br />
        your projects and decisions into a single flow.
      </p>

      <p className="mb-6 text-sm text-gray-500">
        Pick one below to get started,
        <br />
        or just type a message directly.
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
