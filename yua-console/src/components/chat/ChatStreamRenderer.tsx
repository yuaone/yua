"use client";

type Props = {
  text: string;
};

export default function ChatStreamRenderer({ text }: Props) {
  return (
    <div
      className="
        whitespace-pre-wrap
        break-words
        break-all
        text-slate-100 
        text-sm 
        leading-relaxed
      "
    >
      {text}
    </div>
  );
}
