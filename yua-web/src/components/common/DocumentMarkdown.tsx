"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";
import dynamic from "next/dynamic";

const MermaidRenderer = dynamic(
  () => import("./MermaidRenderer"),
  { ssr: false }
) as React.ComponentType<{ code: string; highlightNodes?: string[] }>;

/* =========================
   Normalize helpers
   (Markdown.tsx에서 필요한 것만 추출)
========================= */

function protectFencedBlocks(input: string) {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const blocks: string[] = [];
  let buf: string[] = [];
  let inFence = false;

  const flushBlock = () => {
    const idx = blocks.length;
    blocks.push(buf.join("\n"));
    out.push(`__FENCE_BLOCK_${idx}__`);
    buf = [];
  };

  for (const line of lines) {
    if (/^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(line)) {
      buf.push(line);
      inFence = !inFence;
      if (!inFence) flushBlock();
      continue;
    }
    if (inFence) {
      buf.push(line);
      continue;
    }
    out.push(line);
  }

  if (buf.length) flushBlock();
  return { text: out.join("\n"), blocks };
}

function restoreFencedBlocks(input: string, blocks: string[]) {
  return (input ?? "").replace(
    /^__FENCE_BLOCK_(\d+)__$/gm,
    (_m, n) => blocks[Number(n)] ?? ""
  );
}

function normalizeCodeFenceSafe(input: string) {
  const pre = (input ?? "").replace(/\u{FF40}/gu, "`");
  const { text, blocks } = protectFencedBlocks(pre);

  const out = text
    .replace(/[\uFF10-\uFF19]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30)
    )
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .replace(/\uFF3B/g, "[")
    .replace(/\uFF3D/g, "]")
    .replace(/\uFF5B/g, "{")
    .replace(/\uFF5D/g, "}")
    .replace(/\uFF0B/g, "+")
    .replace(/[\uFF0D\u2212]/g, "-")
    .replace(/\uFF1D/g, "=")
    .replace(/\uFF0F/g, "/")
    .replace(/\uFF1C/g, "<")
    .replace(/\uFF1E/g, ">")
    .replace(/\uFF0A/g, "*")
    .replace(/\uFF03/g, "#")
    .replace(/(^|\n)(\s*)(#{1,6})([^\s#])/g, (m, p1, p2, hashes, nextChar) => {
      if (/\d\s*$/.test(p2)) return m;
      return `${p1}${p2}${hashes} ${nextChar}`;
    })
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/[\u2014\u2013]/g, "--");

  return restoreFencedBlocks(out, blocks);
}

function normalizeMathDelimiters(input: string): string {
  if (!input) return input;
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inMathBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "$$") {
      inMathBlock = !inMathBlock;
      out.push("$$");
      continue;
    }
    if (inMathBlock) {
      out.push(rawLine);
      continue;
    }
    if (line === "\\[" || line === "\\]") {
      out.push("$$");
      continue;
    }
    out.push(rawLine);
  }
  return out.join("\n");
}

function normalizeHumanMath(input: string): string {
  if (!input) return input;

  const { text: fencedText, blocks } = protectFencedBlocks(input ?? "");
  let working = fencedText;

  const INLINE_CODE_TOKEN = "__YUA_INLINE_CODE__";
  const inlineCodes: string[] = [];
  working = working.replace(/`[^`]+`/g, (m) => {
    inlineCodes.push(m);
    return `${INLINE_CODE_TOKEN}${inlineCodes.length - 1}${INLINE_CODE_TOKEN}`;
  });

  working = working
    .replace(/W\(/g, "\\(")
    .replace(/\)W/g, "\\)")
    .replace(/W\[/g, "\\[")
    .replace(/\]W/g, "\\]");

  working = working
    .replace(/^\\\[\s*$/gm, "$$")
    .replace(/^\\\]\s*$/gm, "$$");

  const SAFE_LATEX = [
    "frac", "sqrt", "left", "right", "cdot", "times",
    "le", "ge", "neq", "Rightarrow",
  ];
  working = working.replace(
    /\bW([A-Za-z]+)\b/g,
    (_m, name) => SAFE_LATEX.includes(name) ? `\\${name}` : `W${name}`
  );

  working = working.replace(/([0-9a-zA-Z])W\b/g, "$1");

  working = working.replace(
    new RegExp(`${INLINE_CODE_TOKEN}(\\d+)${INLINE_CODE_TOKEN}`, "g"),
    (_m, idx) => inlineCodes[Number(idx)] ?? _m
  );
  working = restoreFencedBlocks(working, blocks);
  return working;
}

function normalizeTripleBackticks(input: string): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const isFenceLine = /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(line);
    if (isFenceLine) {
      out.push(line);
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(raw);
      continue;
    }
    out.push(raw);
  }

  if (inFence) {
    out.push("```");
  }
  return out.join("\n");
}

/* =========================
   HAST helpers
========================= */
type HastNode = any;

function isElement(n: HastNode): boolean {
  return !!n && n.type === "element";
}

function hastText(node: HastNode): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map(hastText).join("");
  return "";
}

function findFirstTag(root: HastNode, tag: string): HastNode | null {
  if (!root) return null;
  if (isElement(root) && root.tagName === tag) return root;
  const kids = Array.isArray(root.children) ? root.children : [];
  for (const k of kids) {
    const hit = findFirstTag(k, tag);
    if (hit) return hit;
  }
  return null;
}

function hasBlockishChild(node: any): boolean {
  const tags = ["pre", "table", "ul", "ol", "blockquote", "h1", "h2", "h3"];
  return tags.some((tag) => !!findFirstTag(node, tag));
}

/* =========================
   Types
========================= */
type DocumentMarkdownProps = {
  content: string;
  className?: string;
};

/* =========================
   Component
========================= */
export default function DocumentMarkdown({
  content,
  className,
}: DocumentMarkdownProps) {
  const normalized = useMemo(() => {
    if (!content) return "";
    let text = content;
    text = normalizeCodeFenceSafe(text);
    text = normalizeHumanMath(text);
    text = normalizeMathDelimiters(text);
    text = normalizeTripleBackticks(text);
    return text;
  }, [content]);

  const components = useMemo<Components>(
    () => ({
      pre({ children }) {
        return <>{children}</>;
      },
      code({ className: codeClassName, children, ...rest }) {
        const match = /language-(\w+)/.exec(codeClassName || "");
        const lang = match?.[1] ?? "";
        const code = String(children).replace(/\n$/, "");

        if (lang === "mermaid") {
          return <MermaidRenderer code={code} />;
        }

        if (lang || code.includes("\n")) {
          return (
            <CodeBlock
              className={codeClassName}
              value={code}
            />
          );
        }

        return (
          <code className="inline-code" {...rest}>
            {children}
          </code>
        );
      },
      a({ href, children }) {
        if (!href) return <>{children}</>;
        let safeHref = href;
        try {
          const parsed = new URL(href, "https://example.com");
          if (!/^https?:$/i.test(parsed.protocol)) return <>{children}</>;
          safeHref = parsed.href;
        } catch {
          return <>{children}</>;
        }
        return (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {children}
          </a>
        );
      },
      hr() {
        return (
          <hr className="my-6 border-t border-[var(--line)]" />
        );
      },
      table({ node, children }) {
        return (
          <div className="md-table-wrap">
            <table className="md-table">{children}</table>
          </div>
        );
      },
      thead({ children }) {
        return <thead className="md-thead">{children}</thead>;
      },
      tbody({ children }) {
        return <tbody className="md-tbody">{children}</tbody>;
      },
      tr({ children }) {
        return <tr className="md-tr">{children}</tr>;
      },
      th({ children }) {
        return <th className="md-th">{children}</th>;
      },
      td({ children }) {
        return <td className="md-td">{children}</td>;
      },
      p({ node, children }) {
        if (
          !children ||
          (Array.isArray(children) &&
            children.every((c) => typeof c === "string" && c.trim() === ""))
        ) {
          return null;
        }
        const blockish = hasBlockishChild(node);
        if (blockish) {
          return (
            <div className="md-p break-words whitespace-normal">
              {children}
            </div>
          );
        }
        return (
          <p className="md-p break-words whitespace-normal">{children}</p>
        );
      },
      blockquote({ children }) {
        return <blockquote>{children}</blockquote>;
      },
      ul({ children }) {
        return <ul className="list-disc pl-6 my-2">{children}</ul>;
      },
      ol({ children }) {
        return <ol className="list-decimal pl-6 my-2">{children}</ol>;
      },
      li({ children }) {
        return <li className="my-1">{children}</li>;
      },
      h1({ children }) {
        return <h1 className="text-[22px] font-bold mt-8 mb-3">{children}</h1>;
      },
      h2({ children }) {
        return <h2 className="text-[20px] font-bold mt-7 mb-2">{children}</h2>;
      },
      h3({ children }) {
        return <h3 className="text-[18px] font-semibold mt-6 mb-2">{children}</h3>;
      },
      h4({ children }) {
        return <h4 className="text-[16px] font-semibold mt-5 mb-1">{children}</h4>;
      },
      strong({ children }) {
        return <strong className="font-semibold">{children}</strong>;
      },
      em({ children }) {
        return <em>{children}</em>;
      },
      img({ src, alt }) {
        if (!src) return null;
        return (
          <span className="block my-4">
            <img
              src={src}
              alt={alt ?? ""}
              className="max-w-full rounded-lg"
              loading="lazy"
            />
            {alt && (
              <span className="block text-center text-sm text-[var(--text-muted)] mt-2">
                {alt}
              </span>
            )}
          </span>
        );
      },
    }),
    []
  );

  return (
    <div className={`document-markdown ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
