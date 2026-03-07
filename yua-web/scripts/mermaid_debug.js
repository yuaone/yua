function extractMermaidDSL(input) {
  const s = (input ?? "").replace(/\r\n/g, "\n");
  const fenced = s.match(/```mermaid\s*\n([\s\S]*?)\n```/i);
  const body = fenced ? fenced[1] : s;

  const lines = body.split("\n");
  const start = lines.findIndex((l) =>
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap)\b/i.test(
      l.trim()
    )
  );
  if (start === -1) return "";

  const dsl = [];
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!fenced && /^```/.test(t)) break;
    dsl.push(lines[i].replace(/<[^>]+>/g, ""));
  }

  return dsl.join("\n").trim();
}

function normalizeMermaidText(input) {
  return (input ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, "  ")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

function reflowSingleLineMermaid(input) {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;
  if (t.includes("\n")) return input;

  const m = t.match(/^(graph|flowchart)\s+([^\s]+)\s+(.+)$/i);
  if (!m) return input;

  const head = `${m[1]} ${m[2]}`;
  const rest = m[3].replace(
    /\s+(?=[A-Za-z0-9_:-]+\s*(-->|---|-.->|==>|==)\s*)/g,
    "\n"
  );
  return `${head}\n${rest}`.trim();
}

function autoQuoteFlowchartLabels(input) {
  const t = (input ?? "").trim();
  if (!/^(graph|flowchart)\b/i.test(t)) return input;

  return input.replace(/(\b[A-Za-z0-9_:-]+)\[([^\]\n]+)\]/g, (_m, id, label) => {
    const raw = String(label ?? "");
    const trimmed = raw.trim();
    if (!trimmed) return `${id}[]`;
    if (/^["']/.test(trimmed)) return `${id}[${raw}]`;
    if (!/[(),]|[가-힣]/.test(trimmed)) return `${id}[${raw}]`;
    const escaped = trimmed.replace(/"/g, "\\\"");
    return `${id}["${escaped}"]`;
  });
}

function pipeline(input) {
  const normalized = normalizeMermaidText(input);
  const extracted = extractMermaidDSL(normalized);
  const reflowed = reflowSingleLineMermaid(extracted);
  const quoted = autoQuoteFlowchartLabels(reflowed);
  return { normalized, extracted, reflowed, quoted };
}

const cases = {
  A:
    "```mermaid\n" +
    "graph TD\nCPU --> PCIe\nPCIe --> GPU\nGPU --> VRAM\nGPU --> SM\nSM --> CUDA_Core\n" +
    "```\n",
  B:
    "```mermaid\n" +
    "flowchart TD\nDRV[Driver / Runtime(CUDA, ROCm 등)] --> GPU\n" +
    "```\n",
  C:
    "```mermaid\n" +
    "graph TD CPU --> PCIe PCIe --> GPU GPU --> VRAM\n" +
    "```\n",
};

for (const [k, v] of Object.entries(cases)) {
  const out = pipeline(v);
  console.log(`\n=== Case ${k} ===`);
  console.log("normalized:\n" + out.normalized);
  console.log("extracted:\n" + out.extracted);
  console.log("reflowed:\n" + out.reflowed);
  console.log("quoted:\n" + out.quoted);
}
