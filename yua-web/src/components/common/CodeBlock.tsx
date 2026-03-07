"use client";

import { useMemo, useState } from "react";
import { escapeHtml } from "../../utils/escapeHtml";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-verilog";
import dynamic from "next/dynamic";

 const MermaidRenderer = dynamic(
   () => import("./MermaidRenderer"),
   { ssr: false }
 );
type Props = {
  value: string;
  className?: string;
  streaming?: boolean;
};


function detectAutoLanguage(code: string): string | null {
  const trimmed = code.trim();

  // JSON
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    /"\s*:\s*/.test(trimmed)
  ) {
    return "json";
  }

  // SQL
  if (/\b(select|from|where|join|group by|order by)\b/i.test(trimmed)) {
    return "sql";
  }

  return null;
}

function highlightDiff(value: string, language: string) {
  // diff는 언어가 아님 → 실제 코드 언어는 별도로 사용
  const codeGrammar =
  Prism.languages[language] ||
  Prism.languages["verilog"] ||
  null;

  return value
    .split("\n")
    .map((rawLine) => {
      // hunk
      if (rawLine.startsWith("@@")) {
        return `<span class="diff-hunk">${escapeHtml(rawLine)}</span>`;
      }

      const prefix = rawLine[0];

      if (prefix === "+" || prefix === "-") {
        const content = rawLine.slice(1);
        const body = codeGrammar
          ? Prism.highlight(content, codeGrammar, language)
          : escapeHtml(content);

        return `<span class="diff-line"><span class="${
          prefix === "+" ? "diff-add-sign" : "diff-del-sign"
        }">${prefix}</span>${body}</span>`;
      }

      // context line
      return escapeHtml(rawLine);
    })
    .join("\n");
}

function normalizeLanguage(lang: string) {
  switch (lang) {
    case "ts":
      return "typescript";
    case "js":
      return "javascript";
    case "json":
      return "json";
    case "sql":
      return "sql";
    default:
      return lang;
  }
}

function parseHeader(languageRaw: string) {
  if (languageRaw.includes(":")) {
    const [lang] = languageRaw.split(":");
    return lang;
  }
  return languageRaw;
}

export function CodeBlock({ value, className, streaming = false }: Props) {
  const [copied, setCopied] = useState(false);
const raw = (className || "").replace("language-", "");

const detectedMermaid =
  raw === "mermaid" ||
  value.trim().startsWith("graph ") ||
  value.trim().startsWith("flowchart ");
  const parsedLang = parseHeader(raw);
  const language =
    normalizeLanguage(parsedLang) ||
    detectAutoLanguage(value) ||
    "";
  const displayLang = parsedLang || "code";

  const isDiff =
    displayLang === "diff" ||
    displayLang === "patch" ||
    displayLang === "git";

  const highlighted = useMemo(() => {
    if (streaming || !language || isDiff) return null;
    const grammar = Prism.languages[language];
    if (!grammar) return null;
    return Prism.highlight(value, grammar, language);
  }, [value, language, streaming, isDiff]);
  const handleCopy = async () => {
    if (!value || streaming) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* silent */
    }
  };

const isMermaid = detectedMermaid;

 if (isMermaid) {
   return <MermaidRenderer code={value} />;
 }
  return (
    <div className="codeblock">
      {/* Header: ChatGPT-style — </> icon + lang (left), copy icon (right) */}
      <div className="codeblock-head">
        <div className="codeblock-lang-wrap">
          <svg className="codeblock-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <div className="codeblock-lang">{displayLang}</div>
          {streaming && <div className="codeblock-spinner" />}
        </div>

        <button
          onClick={handleCopy}
          disabled={streaming || !value.trim()}
          className={`codeblock-copy ${copied ? "is-copied" : ""}`}
          type="button"
          title={copied ? "복사됨" : "복사"}
        >
          {copied ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="codeblock-pre">
        {isDiff ? (
          <code
            className="codeblock-code codeblock-diff"
            dangerouslySetInnerHTML={{
              __html: highlightDiff(value, language),
            }}
          />
        ) : (
          <code
            className="codeblock-code"
            dangerouslySetInnerHTML={{
              __html: !streaming && highlighted ? highlighted : escapeHtml(value),
            }}
          />
        )}
      </pre>
    </div>
  );
}
