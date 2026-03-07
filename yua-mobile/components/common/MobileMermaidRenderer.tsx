import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

type MobileMermaidRendererProps = {
  chart: string;
};

const SAFE_LINE_RE = /^[\p{L}\p{N}_\s:.\-–—>\[\]\(\)"',=|/+\\{};:#]+$/u;
const ALLOWED_TOKENS = /(-->|---|==>|->|subgraph|end)/i;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeMermaidText(input: string) {
  return (input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, "  ")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

function extractMermaidDSL(input: string): string {
  const s = (input ?? "").replace(/\r\n/g, "\n");
  const fenced = s.match(/```mermaid\s*\n([\s\S]*?)\n```/i);
  const body = fenced ? fenced[1] : s;

  const lines = body.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)\b/i.test(
      line.trim()
    )
  );

  if (startIndex === -1) return "";

  const dsl: string[] = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.includes("`")) break;
    if (!trimmed) {
      dsl.push(line);
      continue;
    }

    if (/^\d{1,3}[\.)]\s+/.test(trimmed) && !/-->|---|==>/.test(trimmed)) break;
    if (/[가-힣]/.test(trimmed) && !ALLOWED_TOKENS.test(trimmed)) break;
    if (!SAFE_LINE_RE.test(trimmed)) break;

    const starts = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)/i;
    if (!ALLOWED_TOKENS.test(trimmed) && !starts.test(trimmed)) break;

    dsl.push(line);
  }

  return dsl.join("\n").trim();
}

function stripTrailingGarbage(dsl: string): string {
  const lines = (dsl ?? "").replace(/\r\n/g, "\n").split("\n");

  while (lines.length > 0) {
    const t = (lines[lines.length - 1] ?? "").trim();
    if (!t || /^```/.test(t) || /^~~~/.test(t) || /^syntax error in text/i.test(t) || /^parse error/i.test(t)) {
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

function reflowSingleLineMermaid(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t) || t.includes("\n")) return input;

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

  rest = rest.replace(/\s+(?=(subgraph|end)\b)/gi, "\n");
  rest = rest.replace(/\s+(?=[\p{L}\p{N}_:-]+\s*\[)/gu, "\n");
  rest = rest.replace(/\s+(?=[\p{L}\p{N}_:-]+\s*(-->|---|-.->|==>|==)\s*)/gu, "\n");

  return `${head}\n${rest}`.trim();
}

function autoQuoteFlowchartLabels(input: string): string {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;

  return input.replace(/(\b[\p{L}\p{N}_:-]+)\[([^\]\n]+)\]/gu, (_m, id, label) => {
    const raw = String(label ?? "");
    const trimmed = raw.trim();
    if (!trimmed) return `${id}[]`;
    if (/^["']/.test(trimmed)) return `${id}[${raw}]`;
    if (!/[(),]|[가-힣]/.test(trimmed)) return `${id}[${raw}]`;

    const escaped = trimmed.replace(/"/g, '\\"');
    return `${id}["${escaped}"]`;
  });
}

export default function MobileMermaidRenderer({ chart }: MobileMermaidRendererProps) {
  const [showCode, setShowCode] = useState(false);

  const safeText = useMemo(() => {
    const normalized = normalizeMermaidText(chart ?? "");
    const extracted = extractMermaidDSL(normalized);
    const cleaned = stripDanglingBackticks(stripTrailingGarbage(extracted));
    const reflowed = reflowSingleLineMermaid(cleaned);
    return autoQuoteFlowchartLabels(reflowed);
  }, [chart]);

  const html = useMemo(() => {
    const safe = escapeHtml(safeText || "graph TD; A-->B;");
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin:0; padding:0; background:#f8fafc; }
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; }
      #root { padding: 8px; }
      .mermaid { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: auto; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.3/dist/mermaid.min.js"></script>
  </head>
  <body>
    <div id="root">
      <pre class="mermaid">${safe}</pre>
    </div>
    <script>
      try {
        mermaid.initialize({
          startOnLoad: true,
          securityLevel: "strict",
          theme: "base",
          flowchart: { curve: "basis", nodeSpacing: 12, rankSpacing: 14, padding: 4 },
          themeVariables: {
            primaryColor: "#ffffff",
            primaryTextColor: "#0f172a",
            lineColor: "#334155",
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            background: "#ffffff"
          }
        });
      } catch (e) {
        document.body.innerHTML = "";
      }
    </script>
  </body>
</html>`;
  }, [safeText]);

  if (!safeText.trim()) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Mermaid</Text>
        <Pressable onPress={() => setShowCode((prev) => !prev)}>
          <Text style={styles.action}>{showCode ? "Hide" : "Code"}</Text>
        </Pressable>
      </View>
      <WebView source={{ html }} style={styles.webview} scrollEnabled={false} originWhitelist={["*"]} />
      {showCode ? (
        <View style={styles.codePreviewWrap}>
          <Text style={styles.codePreview}>{safeText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginVertical: 6,
    overflow: "hidden",
  },
  head: {
    height: 36,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  title: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  action: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  webview: {
    minHeight: 220,
    backgroundColor: "#f8fafc",
  },
  codePreviewWrap: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#0f172a",
    padding: 10,
  },
  codePreview: {
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
});
