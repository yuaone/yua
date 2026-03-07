"use client";

import { useState } from "react";

type Props = {
  code: string;
};

export default function CodeCopyButton({ code }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      onClick={copy}
      className="absolute right-2 top-2 rounded-md bg-slate-800/80 
                 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700 
                 transition opacity-60 hover:opacity-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
