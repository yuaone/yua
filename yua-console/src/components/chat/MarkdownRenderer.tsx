"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

type Props = {
  text: string;
};

export default function MarkdownRenderer({ text }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={
        [
          remarkGfm,
          remarkMath,
        ] as any[]
      }
      rehypePlugins={
        [
          rehypeKatex,
        ] as any[]
      }
      className="
        prose max-w-none text-[15px] leading-[1.75]
        prose-p:my-3
        prose-strong:text-black
        prose-em:text-black/80

        prose-code:text-emerald-700
        prose-code:bg-emerald-50
        prose-code:px-1.5 prose-code:py-0.5
        prose-code:rounded-md
        prose-code:before:content-none
        prose-code:after:content-none

        prose-pre:bg-[#f5f5f7]
        prose-pre:border prose-pre:border-[#e2e2e2]
        prose-pre:rounded-xl
        prose-pre:p-4
        prose-pre:overflow-x-auto

        prose-blockquote:border-l-4
        prose-blockquote:border-black/10
        prose-blockquote:pl-4
        prose-blockquote:text-black/70
      "
    >
      {text}
    </ReactMarkdown>
  );
}
