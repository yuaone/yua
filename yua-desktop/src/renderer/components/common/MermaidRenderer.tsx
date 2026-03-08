import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  code: string;
  highlightNodes?: string[];
};

type MermaidAPI = typeof import("mermaid").default;

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
    .replace(/ /g, " ") // NBSP
    .replace(/\t/g, "  ")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

// =========================
// Mermaid DSL Safety Filters (SSOT)
// =========================

const SAFE_LINE_RE =
  /^[\p{L}\p{N}_\s:.\-–—>\[\]\(\)"',=|\/+\\{};:#]+$/u;

const ALLOWED_TOKENS =
  /(-->|---|==>|->|subgraph|end)/i;

/* =========================
   DSL EXTRACT (FENCE first)
========================= */

function extractMermaidDSL(input: string): string {
  const s = (input ?? "").replace(/\r\n/g, "\n");

  // 1) fenced block first
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
    // backtick line -> immediate stop
    if (trimmed.includes("`")) {
      break;
    }

    // empty line allowed
    if (!trimmed) {
      dsl.push(line);
      continue;
    }
    // numeric lead line block (branch prevention)
    if (/^\d{1,3}[\.\)]\s+/.test(trimmed) && !/-->|---|==>/.test(trimmed)) break;

    // natural language sentence block (Korean)
    if (/[가-힣]/.test(trimmed) && !ALLOWED_TOKENS.test(trimmed)) break;
    if (!SAFE_LINE_RE.test(trimmed)) break;

    // no DSL token at all -> natural language -> stop
    if (!ALLOWED_TOKENS.test(trimmed) &&
        !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)/i.test(trimmed)
    ) break;

    // disallowed characters -> stop
    if (!SAFE_LINE_RE.test(trimmed)) break;
    dsl.push(line);
  }

  return dsl.join("\n").trim();
}

/* =========================
   CLEANUP: trailing garbage removal
========================= */

function stripTrailingGarbage(dsl: string): string {
  const lines = (dsl ?? "").replace(/\r\n/g, "\n").split("\n");

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
  return (input ?? "").replace(/`{1,2}\s*$/g, "");
}

/* =========================
   CASE C: single line graph/flowchart -> line break recovery
========================= */

function reflowSingleLineMermaid(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;
  if (t.includes("\n")) return input;

  const m = t.match(/^(graph|flowchart)\s+([^\s]+)\s+([\s\S]+)$/i);
  if (!m) return input;

  const head = `${m[1]} ${m[2]}`.trim();
  let rest = (m[3] ?? "").trim();

  rest = rest
    .replace(/\s*-->\s*/g, " --> ")
    .replace(/\s*---\s*/g, " --- ")
    .replace(/\s*-\.-\>\s*/g, " -.-> ")
    .replace(/\s*==>\s*/g, " ==> ")
    .replace(/\s+/g, " ")
    .trim();
  // subgraph / end line break
  rest = rest.replace(/\s+(?=(subgraph|end)\b)/gi, "\n");

  // node definition ID[Label] line break
  rest = rest.replace(
    /\s+(?=[\p{L}\p{N}_:-]+\s*\[)/gu,
    "\n"
  );
  rest = rest.replace(
    /\s+(?=[\p{L}\p{N}_:-]+\s*(-->|---|-.->|==>|==)\s*)/gu,
    "\n"
  );

  return `${head}\n${rest}`.trim();
}

/* =========================
   CASE B: flowchart label auto-quoting
========================= */

function autoQuoteFlowchartLabels(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;

  return input.replace(
    /(\b[\p{L}\p{N}_:-]+)\[([^\]\n]+)\]/gu,
    (_m, id, label) => {
      const raw = String(label ?? "");
      const trimmed = raw.trim();
      if (!trimmed) return `${id}[]`;

      if (/^["']/.test(trimmed)) return `${id}[${raw}]`;

      if (!/[(),]|[가-힣]/.test(trimmed)) return `${id}[${raw}]`;

      const escaped = trimmed.replace(/"/g, '\\"');
      return `${id}["${escaped}"]`;
    }
  );
}

/* =========================
   VALIDATE: pre-render parse check
========================= */

async function validateMermaid(mermaid: MermaidAPI, dsl: string) {
  const anyMermaid = mermaid as any;

  if (typeof anyMermaid.parse === "function") {
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

    const extracted = extractMermaidDSL(normalized);

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
    let cancelled = false;

    const render = async () => {
      if (!containerRef.current) return;

      setErrorText(null);

      if (!safeText) {
        containerRef.current.innerHTML = "";
        return;
      }
      const trimmed = safeText.trim();
      if (
        !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap)\b/i.test(
         trimmed
        )
      ) {
        containerRef.current.innerHTML = "";
        return;
      }
      // numeric line block
      if (/\n\d{1,3}[\.\)]\s+/.test(trimmed)) {
        containerRef.current.innerHTML = "";
        return;
      }
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;

        const isDark = detectTheme() === "dark";

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
            nodeSpacing: 12,
            rankSpacing: 14,
            padding: 4,
          },
        });

        await validateMermaid(mermaid, safeText);

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, safeText);
        if (cancelled) return;

        containerRef.current.innerHTML = svg;

        const svgEl = containerRef.current.querySelector<SVGSVGElement>("svg");
        if (svgEl) {
          svgEl.removeAttribute("width");
          svgEl.removeAttribute("height");

          svgEl.style.display = "block";
          svgEl.style.margin = "0 auto";
          svgEl.style.width = "100%";
          svgEl.style.maxWidth = "480px";
          svgEl.style.height = "auto";

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
        containerRef.current.innerHTML = "";
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [safeText, highlightNodes, animate]);

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
    <div className="mermaid-block" style={styles.mermaidBlock}>
      <div className="mermaid-head" style={styles.mermaidHead}>
        <div className="mermaid-label" style={styles.mermaidLabel}>Mermaid</div>

        <div className="mermaid-actions" style={styles.mermaidActions}>
          <button onClick={handleDownload} style={styles.headBtn}>
            ↓
          </button>
          <button onClick={() => setShowCode(p => !p)} style={styles.headBtn}>
            {showCode ? "Hide" : "Code"}
          </button>
        </div>
      </div>

      <div className="viewport small" style={styles.viewport}>
        <div ref={containerRef} />
      </div>

      {showCode && <pre style={styles.codePreview}>{safeText}</pre>}

      {errorText && (
        <div style={styles.mermaidError}>
          <div style={styles.mermaidErrorTitle}>Mermaid syntax error</div>
          <pre style={styles.mermaidErrorPre}>{errorText}</pre>
        </div>
      )}

      <style>{`
        @keyframes flow {
          to {
            stroke-dashoffset: -40;
          }
        }
        html.dark .mermaid-block {
          background: #1b1b1b !important;
          border-color: rgba(255,255,255,0.1) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
        }
        html.dark .mermaid-head {
          background: #2a2a2a !important;
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }
        html.dark .mermaid-label {
          color: #e0e0e0 !important;
        }
        html.dark .viewport.small {
          background: #1e1e1e !important;
        }
      `}</style>
    </div>
  );
}

/* =========================
   Inline styles (replacing styled-jsx from yua-web)
========================= */

const styles: Record<string, React.CSSProperties> = {
  mermaidBlock: {
    maxWidth: 520,
    margin: "40px auto",
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  mermaidHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#f3f4f6",
    borderBottom: "1px solid #e5e7eb",
  },
  mermaidLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  mermaidActions: {
    display: "flex",
    gap: 8,
  },
  headBtn: {
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 13,
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 6,
  },
  viewport: {
    padding: "8px 10px",
    background: "#f9fafb",
    overflowX: "auto",
    overflowY: "hidden",
  },
  codePreview: {
    marginTop: 10,
    fontSize: 12,
    background: "rgba(0, 0, 0, 0.35)",
    padding: 10,
    borderRadius: 10,
    overflowX: "auto",
    whiteSpace: "pre",
    color: "#e0e0e0",
  },
  mermaidError: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    background: "rgba(255, 0, 0, 0.06)",
    border: "1px solid rgba(255, 0, 0, 0.12)",
  },
  mermaidErrorTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  mermaidErrorPre: {
    fontSize: 12,
    opacity: 0.9,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

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
