"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  loading?: boolean;
};

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  loading = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  return (
    <div
      className="
        mx-auto max-w-[760px]
        flex items-end gap-3 rounded-2xl p-3
        border border-black/10 bg-white/90 backdrop-blur
      "
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!loading) onSend();
          }
        }}
        placeholder="YUA에게 메시지를 입력하세요"
        className="
          flex-1 resize-none rounded-xl px-3 py-2 outline-none
          bg-white border border-black/20
          placeholder:text-black/40
          text-[15px] leading-[1.6]
        "
      />

      {/* SEND / STOP */}
      {!loading ? (
        <button
          onClick={onSend}
          aria-label="Send"
          className="
            p-3 rounded-xl bg-black text-white
            hover:bg-black/80 transition
          "
        >
          <Send size={16} />
        </button>
      ) : (
        <button
          onClick={onStop}
          aria-label="Stop streaming"
          className="
            w-10 h-10 rounded-xl
            border border-black/30
            bg-white hover:bg-black/5
            transition
          "
        />
      )}
    </div>
  );
}
