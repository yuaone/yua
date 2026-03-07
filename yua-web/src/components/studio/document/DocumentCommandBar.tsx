"use client";

import { useState } from "react";

export default function DocumentCommandBar({
  disabled,
  onRewrite,
}: {
  disabled?: boolean;
  onRewrite: (instruction: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="border-t bg-white px-4 py-3 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이 부분 다시 써줘… (톤/목적)"
        className="
          flex-1 rounded-md border px-3 py-2
          text-sm outline-none
        "
      />
      <button
        disabled={!text.trim() || disabled}
        onClick={() => {
          onRewrite(text);
          setText("");
        }}
        className="
          rounded-md bg-black px-4 py-2
          text-sm text-white
          disabled:opacity-40
        "
      >
        다시쓰기
      </button>
    </div>
  );
}
