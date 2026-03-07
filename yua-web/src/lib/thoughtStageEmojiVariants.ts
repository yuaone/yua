// 📂 lib/thoughtStageEmojiVariants.ts
import type { ThoughtStage } from "./thoughtStage";

export const emojiVariants: Record<ThoughtStage, string[]> = {
  /* 사고 탐색 */
  expand: ["🤔", "💭", "🧠", "🔎", "🌱", "🌀"],
  clarify: ["🔍", "🧹", "🧽", "📌", "🧠"],
  question: ["❓", "⁉️", "🤨", "🧐"],
  recall: ["🧠", "📚", "🗃️", "🕰️"],

  /* 구조화 */
  structure: ["🧩", "🏗️", "📐", "🪜"],
  organize: ["🗂️", "📁", "🧺", "🧹"],
  map: ["🗺️", "🧭", "📍", "🌐"],

  /* 분석 / 추론 */
  analyze: ["📊", "📈", "📉", "🔬", "🧮"],
  reason: ["🧠", "🔗", "🪢", "💡"],
  compare: ["⚖️", "🔀", "🆚", "📏"],
  evaluate: ["🧪", "🔎", "📋", "✅"],

  /* 판단 / 결정 */
  decide: ["✅", "🟢", "🎯", "📍"],
  approve: ["👍", "👌", "🙆‍♂️", "🟩"],
  reject: ["❌", "🚫", "⛔", "🟥"],
  hold: ["✋", "⏸️", "🟡"],
  warn: ["⚠️", "🚨", "❗", "🔥"],

  /* 실행 / 적용 */
  apply: ["🛠️", "🔧", "⚙️", "📌"],
  implement: ["👆", "🧑‍💻", "🧱", "🏗️"],
  test: ["🧪", "🧫", "🔬", "✅"],
  fix: ["🩹", "🔧", "🛠️", "♻️"],

  /* 정리 / 종료 */
  summarize: ["✨", "📝", "📎", "🧾"],
  conclude: ["🏁", "📌", "🔚"],
  reflect: ["🪞", "🤔", "🧠"],
  next: ["👉", "➡️", "⏭️", "🧭"],

  /* 상태 신호 */
  blocked: ["🚫", "⛔", "🧱"],
  skip: ["⏭️", "➡️", "🌀"],
  stop: ["🛑", "⛔", "🔚"],

  /* 이미지 분석 */
  analyzing_image: ["🖼️", "🔍", "🧠", "📸"],
};
