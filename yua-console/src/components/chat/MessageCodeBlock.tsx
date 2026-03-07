"use client";

import { useMemo, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export default function MessageCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const { highlighted, lang } = useMemo(() => {
    const result = hljs.highlightAuto(code);
    return {
      highlighted: result.value,
      lang: result.language || "plaintext",
    };
  }, [code]);

  return (
    <div className="relative my-4">
      <button
        onClick={copy}
        className="
          absolute right-2 top-2
          rounded-md bg-black/70 px-2 py-1
          text-[10px] text-white
          hover:bg-black transition
        "
      >
        {copied ? "Copied" : "Copy"}
      </button>

      <div className="absolute left-3 top-2 text-[10px] uppercase text-black/40">
        {lang}
      </div>

      <pre className="
        bg-[#f5f5f7]
        border border-[#e2e2e2]
        rounded-xl
        p-4 pt-7
        overflow-x-auto
        text-xs leading-5
      ">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
