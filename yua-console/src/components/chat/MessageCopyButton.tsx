"use client";

import { useState } from "react";

type Props = {
  text: string;
};

export default function MessageCopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      onClick={copy}
      className="rounded-md border border-slate-700/70 bg-slate-800/70 
                 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 
                 transition absolute right-2 top-2 opacity-0 group-hover:opacity-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
