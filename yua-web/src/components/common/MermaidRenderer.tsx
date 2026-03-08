"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  code: string;
  highlightNodes?: string[];
};

type MermaidAPI = typeof import("mermaid").default;

const DEBUG_MERMAID = process.env.NEXT_PUBLIC_DEBUG_MERMAID === "1";

let mermaidPromise: Promise<MermaidAPI> | null = null;
async function getMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

/* =========================
   TEXT NORMALIZE
========================= */

function normalizeMermaidText(input: string) {
  return (input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ") // NBSP
    .replace(/\t/g, "  ")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}
// =========================
// Mermaid DSL Safety Filters (SSOT)
// =========================

// 🔥 backtick(`) 절대 허용하지 않음
 const SAFE_LINE_RE =
   /^[\p{L}\p{N}_\s:.\-–—>\[\]\(\)"',=|\/+\\{};:#]+$/u;


// 🔥 최소 필수 DSL 토큰만 검사
const ALLOWED_TOKENS =
  /(-->|---|==>|->|subgraph|end)/i;
/* =========================
   DSL EXTRACT (FENCE 우선)
========================= */

function extractMermaidDSL(input: string): string {
  const s = (input ?? "").replace(/\r\n/g, "\n");

  // 1️⃣ fenced block 우선
  const fenced = s.match(/```mermaid\s*\n([\s\S]*?)\n```/i);
  const body = fenced ? fenced[1] : s;

  const lines = body.split("\n");

  const startIndex = lines.findIndex((l) =>
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)\b/i.test(
      l.trim()
    )
  );

  if (startIndex === -1) return "";

  const dsl: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // 🔥 backtick 포함 라인은 즉시 종료
    if (trimmed.includes("`")) {
      break;
    }
    // 🔥 여기서 중요:
    // DSL 문법이 아닌 설명 문장이 나오면 종료

    // 빈 줄은 허용
    if (!trimmed) {
      dsl.push(line);
      continue;
    }
   // 🔥 숫자 리드 문장 차단 (branch 유입 방지)
   // 🔥 branch 오탐 방지하되 DSL 내부 숫자는 허용
   if (/^\d{1,3}[\.\)]\s+/.test(trimmed) && !/-->|---|==>/.test(trimmed)) break;

   // 🔥 자연어 문장 차단 (한글 문장 + 마침표)
   // 🔥 한글은 허용 (노드 라벨 가능)
   // 자연어 문장만 차단
   if (/[가-힣]/.test(trimmed) && !ALLOWED_TOKENS.test(trimmed)) break;
     if (!SAFE_LINE_RE.test(trimmed)) break;


   // 🔥 DSL 토큰이 하나도 없으면 자연어로 판단 → 종료
   // DSL 토큰 하나도 없으면 종료
   if (!ALLOWED_TOKENS.test(trimmed) &&
       !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)/i.test(trimmed)
   ) break;

    dsl.push(line);
  }

  return dsl.join("\n").trim();
}

/* =========================
   CLEANUP: 트레일링 쓰레기 제거
========================= */

function stripTrailingGarbage(dsl: string): string {
  const lines = (dsl ?? "").replace(/\r\n/g, "\n").split("\n");

  // 뒤에서부터 ``` / ~~~ / 빈줄 / 에러메시지 흔적 제거
  while (lines.length) {
    const t = (lines[lines.length - 1] ?? "").trim();
    if (!t) {
      lines.pop();
      continue;
    }
    if (/^```/.test(t) || /^~~~/.test(t)) {
      lines.pop();
      continue;
    }
    if (/^syntax error in text/i.test(t) || /^mermaid version/i.test(t)) {
      lines.pop();
      continue;
    }
    if (/^parse error/i.test(t)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join("\n").trim();
}
function stripDanglingBackticks(input: string): string {
  // 🔥 스트림 중 남은 ` 또는 `` 제거 (Mermaid DSL에는 필요 없음)
  return (input ?? "").replace(/`{1,2}\s*$/g, "");
}
/* =========================
   CASE C: 한 줄 graph/flowchart → 줄바꿈 복구
========================= */

function reflowSingleLineMermaid(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;
  if (t.includes("\n")) return input;

  // graph TD <rest...>
  const m = t.match(/^(graph|flowchart)\s+([^\s]+)\s+([\s\S]+)$/i);
  if (!m) return input;

  const head = `${m[1]} ${m[2]}`.trim();
  let rest = (m[3] ?? "").trim();

  // 화살표 주변 공백 안정화
  rest = rest
    .replace(/\s*-->\s*/g, " --> ")
    .replace(/\s*---\s*/g, " --- ")
    .replace(/\s*-\.-\>\s*/g, " -.-> ")
    .replace(/\s*==>\s*/g, " ==> ")
    .replace(/\s+/g, " ")
    .trim();
 // subgraph / end 앞 줄바꿈
 rest = rest.replace(/\s+(?=(subgraph|end)\b)/gi, "\n");

 // 노드 정의 ID[Label] 앞 줄바꿈
 rest = rest.replace(
   /\s+(?=[\p{L}\p{N}_:-]+\s*\[)/gu,
   "\n"
 );
  // 다음 토큰이 "ID + (arrow)" 인 지점 앞에 줄바꿈 삽입
  // ID는 유니코드 문자까지 허용 (Korean node id도 커버)
  rest = rest.replace(
    /\s+(?=[\p{L}\p{N}_:-]+\s*(-->|---|-.->|==>|==)\s*)/gu,
    "\n"
  );

  return `${head}\n${rest}`.trim();
}

/* =========================
   CASE B: flowchart 라벨에 괄호/콤마/한글 → ["..."]로 자동 쿼팅
   (이미 ["..."]면 건드리지 않음)
========================= */

function autoQuoteFlowchartLabels(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;

  // ID[Label] 패턴만 대상으로 함 (Label이 문제되는 케이스)
  return input.replace(
    /(\b[\p{L}\p{N}_:-]+)\[([^\]\n]+)\]/gu,
    (_m, id, label) => {
      const raw = String(label ?? "");
      const trimmed = raw.trim();
      if (!trimmed) return `${id}[]`;

      // 이미 쿼팅되어 있으면 그대로
      if (/^["']/.test(trimmed)) return `${id}[${raw}]`;

      // 특수문자/한글이 없으면 굳이 쿼팅 안 함
      if (!/[(),]|[가-힣]/.test(trimmed)) return `${id}[${raw}]`;

      const escaped = trimmed.replace(/"/g, '\\"');
      return `${id}["${escaped}"]`;
    }
  );
}

/* =========================
   VALIDATE: 렌더 전에 parse로 선검사 (오염 방지)
========================= */

async function validateMermaid(mermaid: MermaidAPI, dsl: string) {
  const anyMermaid = mermaid as any;

  // mermaid.parse가 있으면 선검사 (에러 SVG 삽입 전에 차단)
  if (typeof anyMermaid.parse === "function") {
    // parse는 throw 할 수 있음
    await anyMermaid.parse(dsl);
  }
}

function detectTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/* =========================
   COMPONENT
========================= */

export default function MermaidRenderer({ code, highlightNodes = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [errorText, setErrorText] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [animate, setAnimate] = useState(true);

  const { safeText, debugInfo } = useMemo(() => {
    const original = code ?? "";
    const normalized = normalizeMermaidText(original);

    // 🔥 1️⃣ DSL만 추출 (자연어 제거)
    const extracted = extractMermaidDSL(normalized);

    // 🔥 2️⃣ 후처리
    const cleaned = stripDanglingBackticks(
      stripTrailingGarbage(extracted)
    );
    const reflowed = reflowSingleLineMermaid(cleaned);
    const quoted = autoQuoteFlowchartLabels(reflowed);

    return {
      safeText: quoted,
      debugInfo: {
        originalLen: original.length,
        safeLen: quoted.length,
        preview: quoted.slice(0, 220),
      },
    };
  }, [code]);

  useEffect(() => {
    if (!DEBUG_MERMAID) return;
    // eslint-disable-next-line no-console
    console.info("[MermaidRenderer][debug]", debugInfo);
  }, [debugInfo]);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!containerRef.current) return;

      setErrorText(null);

      if (!safeText) {
        containerRef.current.innerHTML = "";
        return;
      }
      const trimmed = safeText.trim();
      // ✅ 최소 안전장치: 시작 키워드 없으면 렌더 안 함 (오염 방지)
      if (
        !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap)\b/i.test(
         trimmed
        )
      ) {
        containerRef.current.innerHTML = "";
        return;
      }
 // 🔥 숫자 라인 포함 시 즉시 차단
 if (/\n\d{1,3}[\.\)]\s+/.test(trimmed)) {
   containerRef.current.innerHTML = "";
   return;
 }
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;

        const isDark = detectTheme() === "dark";

        // initialize는 매번 해도 되긴 하지만, 여기선 “설정은 안정적으로”만
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: isDark
            ? {
                background: "transparent",
                primaryColor: "#2a2a2a",
                primaryBorderColor: "rgba(255,255,255,0.15)",
                primaryTextColor: "#e0e0e0",
                lineColor: "#6b7280",
                secondaryColor: "#1e1e1e",
                tertiaryColor: "#2a2a2a",
                borderRadius: 12,
                fontSize: "14px",
                fontFamily: "Inter, ui-sans-serif, system-ui",
              }
            : {
                background: "transparent",
                primaryColor: "#f8fafc",
                primaryBorderColor: "#cbd5e1",
                primaryTextColor: "#111827",
                lineColor: "#94a3b8",
                secondaryColor: "#f1f5f9",
                tertiaryColor: "#ffffff",
                borderRadius: 12,
                fontSize: "14px",
                fontFamily: "Inter, ui-sans-serif, system-ui",
              },
          flowchart: {
            curve: "basis",
           nodeSpacing: 12,     // 🔥 더 압축
            rankSpacing: 14,     // 🔥 세로 간격 축소
            padding: 4
},
        });

        // ✅ 렌더 전에 parse 선검사 (에러 SVG/텍스트 “오염” 방지)
        await validateMermaid(mermaid, safeText);

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, safeText);
        if (cancelled) return;

        containerRef.current.innerHTML = svg;

        const svgEl = containerRef.current.querySelector<SVGSVGElement>("svg");
        if (svgEl) {
          svgEl.removeAttribute("width");
          svgEl.removeAttribute("height");


          // ✅ 항상 부모 viewport에 맞게 축소
          svgEl.style.display = "block";
          svgEl.style.margin = "0 auto";
          svgEl.style.width = "100%";
          svgEl.style.maxWidth = "480px"; // 🔥 카드 폭 축소
          svgEl.style.height = "auto";

          // 🔥 전체 스케일 살짝 축소 (박스 느낌 강화)
          svgEl.style.transform = "scale(0.9)";
          svgEl.style.transformOrigin = "top center";
        }

        enhanceSVG(containerRef.current, highlightNodes, animate);
      } catch (e: any) {
        const msg =
          e?.str ||
          e?.message ||
          (typeof e?.toString === "function" ? e.toString() : "Mermaid error");
        setErrorText(String(msg));
        containerRef.current.innerHTML = ""; // ✅ 에러 SVG 삽입 금지
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [safeText, highlightNodes, animate, code]);

 const handleDownload = () => {
   const svgEl = containerRef.current?.querySelector<SVGSVGElement>("svg");
   if (!svgEl) return;

   const serializer = new XMLSerializer();
   const source = serializer.serializeToString(svgEl);

   const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
   const url = URL.createObjectURL(blob);

   const a = document.createElement("a");
   a.href = url;
   a.download = "diagram.svg";
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);

   URL.revokeObjectURL(url);
 };

  return (
    <div className="mermaid-block">
 <div className="mermaid-head">
   <div className="mermaid-label">Mermaid</div>

   <div className="mermaid-actions">
     <button onClick={handleDownload} className="head-btn">
       ↓
     </button>
     <button onClick={() => setShowCode(p => !p)} className="head-btn">
       {showCode ? "Hide" : "Code"}
     </button>
   </div>
 </div>

      <div className="viewport small">
        <div ref={containerRef} />
      </div>

      {showCode && <pre className="code-preview">{safeText}</pre>}

      {errorText && (
        <div className="mermaid-error">
          <div className="mermaid-error-title">Mermaid syntax error</div>
          <pre className="mermaid-error-pre">{errorText}</pre>
        </div>
      )}

      <style jsx>{`
.mermaid-block {
  max-width: 520px;   /* 🔥 전체 카드 더 컴팩트 */
  margin: 40px auto;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  overflow: hidden;
}

.mermaid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
background: #f3f4f6;
border-bottom: 1px solid #e5e7eb;
}
 .mac-dots {
   display: flex;
   gap: 6px;
 }

 .dot {
   width: 12px;
   height: 12px;
   border-radius: 50%;
 }

 .dot.red { background: #ff5f57; }
 .dot.yellow { background: #ffbd2e; }
 .dot.green { background: #28c840; }

.mermaid-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.mermaid-actions {
  display: flex;
  gap: 8px;
}

.head-btn {
  background: transparent;
  border: none;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}
.head-btn:hover {
  background: #e5e7eb;
  color: #111827;
}
 .icon-btn:hover {
   color: #fff;
 }

.viewport.small {
   padding: 8px 10px;   /* 🔥 안쪽 여백 축소 */
  background: #f9fafb;
  overflow-x: auto;
  overflow-y: hidden;
}

        .code-preview {
          margin-top: 10px;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.35);
          padding: 10px;
          border-radius: 10px;
          overflow-x: auto;
          white-space: pre;
        }

        .mermaid-error {
          margin-top: 10px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255, 0, 0, 0.06);
          border: 1px solid rgba(255, 0, 0, 0.12);
        }

        .mermaid-error-title {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .mermaid-error-pre {
          font-size: 12px;
          opacity: 0.9;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @keyframes flow {
          to {
            stroke-dashoffset: -40;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================
   SVG ENHANCER
========================= */

function enhanceSVG(root: HTMLDivElement, highlightNodes: string[], animate = true) {
  const svg = root.querySelector<SVGSVGElement>("svg");
  if (!svg) return;

  const paths = svg.querySelectorAll<SVGPathElement>(".edgePath path, path.flowchart-link");
  paths.forEach((p) => {
    if (animate) {
      p.style.strokeDasharray = "6 4";
      p.style.animation = "flow 3s linear infinite";
    } else {
      p.style.strokeDasharray = "none";
      p.style.animation = "none";
    }
  });

  const norm = (s: string) => (s ?? "").trim().toLowerCase();
  const set = new Set((highlightNodes ?? []).map(norm));

  const nodes = svg.querySelectorAll<SVGGElement>(".node");
  nodes.forEach((node) => {
    const id = norm(node.id);
    const label = norm(node.querySelector("text")?.textContent ?? "");
    if (set.has(id) || set.has(label)) {
      (node as unknown as SVGGElement).style.filter = "drop-shadow(0 0 14px #facc15)";
    }
  });
}