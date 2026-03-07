"use client";

import { useState } from "react";

interface Props {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = "txt" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative mb-6">
      <pre className="bg-black/85 text-white p-4 rounded-xl text-sm overflow-x-auto">
        {code}
      </pre>

      <button
        onClick={copy}
        className="
          absolute top-2 right-2 text-xs px-2 py-1 rounded
          bg-white/20 backdrop-blur text-white
          hover:bg-white/30 transition
        "
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
