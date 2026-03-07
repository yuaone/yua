import { useMemo, useRef } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MarkdownDisplay from "react-native-markdown-display";

import MobileCodeBlock from "@/components/common/MobileCodeBlock";
import { emojiMap, type ThoughtStage } from "@/components/common/thoughtStage";
import type { SourceChip } from "yua-shared/stream/activity";

type MobileMarkdownSource = SourceChip;

type StreamBlockBase = {
  id: string;
  pending?: string;
};

type StreamBlock =
  | (StreamBlockBase & { kind: "md"; text: string })
  | (StreamBlockBase & { kind: "code"; lang?: string; text: string; closed?: boolean })
  | (StreamBlockBase & { kind: "table"; lines: string[]; confirmed: boolean })
  | (StreamBlockBase & { kind: "branch"; badge: string; title: string; level: "major" | "section" });

type MobileMarkdownProps = {
  content: unknown;
  streaming?: boolean;
  branchEmoji?: string;
  stage?: ThoughtStage | null;
  sources?: MobileMarkdownSource[];
};

const EMOJI_GAP = 8;

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
  return (input ?? "").replace(/^__FENCE_BLOCK_(\d+)__$/gm, (_m, n) => blocks[Number(n)] ?? "");
}

function normalizeCodeFenceSafe(input: string) {
  const pre = (input ?? "").replace(/｀/g, "`");
  const { text, blocks } = protectFencedBlocks(pre);

  const out = text
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/｛/g, "{")
    .replace(/｝/g, "}")
    .replace(/＋/g, "+")
    .replace(/－|−/g, "-")
    .replace(/＝/g, "=")
    .replace(/／/g, "/")
    .replace(/＜/g, "<")
    .replace(/＞/g, ">")
    .replace(/＊/g, "*")
    .replace(/＃/g, "#")
    .replace(/(^|\n)(\s*)(#{1,6})([^\s#])/g, (m, p1, p2, hashes, nextChar) => {
      if (/\d\s*$/.test(p2)) return m;
      return `${p1}${p2}${hashes} ${nextChar}`;
    })
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[—–]/g, "--");

  return restoreFencedBlocks(out, blocks);
}

function normalizeHumanMath(input: string): string {
  const { text: fencedText, blocks } = protectFencedBlocks(input ?? "");
  let working = fencedText;
  const inlineCodes: string[] = [];
  const token = "__YUA_INLINE_CODE__";

  working = working.replace(/`[^`]+`/g, (m) => {
    inlineCodes.push(m);
    return `${token}${inlineCodes.length - 1}${token}`;
  });

  working = working
    .replace(/W\(/g, "\\(")
    .replace(/\)W/g, "\\)")
    .replace(/W\[/g, "\\[")
    .replace(/\]W/g, "\\]")
    .replace(/^\\\[\s*$/gm, "$$")
    .replace(/^\\\]\s*$/gm, "$$");

  const SAFE_LATEX = ["frac", "sqrt", "left", "right", "cdot", "times", "le", "ge", "neq", "Rightarrow"];
  working = working.replace(/\bW([A-Za-z]+)\b/g, (_m, name) => (SAFE_LATEX.includes(name) ? `\\${name}` : `W${name}`));
  working = working.replace(/([0-9a-zA-Z])W\b/g, "$1");
  working = working.replace(new RegExp(`${token}(\d+)${token}`, "g"), (_m, idx) => inlineCodes[Number(idx)] ?? _m);
  return restoreFencedBlocks(working, blocks);
}

function normalizeBranchLeadLines(input: string): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const t = line.trim();

    if (/^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(t)) {
      out.push(line);
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      out.push(raw);
      continue;
    }

    if (/^(\s*)(\d{1,2})[\.|\)]\s+/.test(line)) {
      out.push(line.replace(/^(\s*)(\d{1,2})[\.|\)]\s+/, "$1$2 "));
      continue;
    }

    if (/^\s*\d+\s*단계[:.\-]?\s*/.test(line)) {
      out.push(line);
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function normalizeChatParagraphs(input: string): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  const isFence = (s: string) => /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(s);
  const isBlockLine = (s: string) =>
    /^(\s*)(```|#{1,6}\s|>|\- |\* |\||\d{1,2}[\.|\)]?\s+)/.test(s.trim()) || /^\d+\s*단계[:.\-]?\s*/.test(s.trim());
  const isPlain = (s: string) => s.trim() !== "" && !isBlockLine(s);
  const lastOutLine = () => {
    for (let i = out.length - 1; i >= 0; i -= 1) {
      if (out[i] !== "") return out[i];
    }
    return "";
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const trimmed = line.trim();

    if (isFence(trimmed)) {
      out.push(line);
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      out.push(raw);
      continue;
    }

    if (!trimmed) {
      out.push("");
      continue;
    }

    const prev = lastOutLine();
    const prevText = prev?.trim() ?? "";
    const endsLikeSentence = /(\.|다\.|\?|!|…|。)$/.test(prevText);
    if (prev && isPlain(prev) && isPlain(line) && endsLikeSentence && !/^#{1,6}\s/.test(prevText)) {
      out.push("");
    }

    if (prev && /^\d{1,2}[\.|\)]?\s+/.test(trimmed)) {
      out.push("");
    }

    const endsWithColon = prev && /[:：]\s*$/.test(prev.trim());
    const startsLikeList = /^([-*]\s|✅)/.test(trimmed);
    if (prev && isPlain(prev) && isPlain(line) && endsWithColon && startsLikeList) {
      out.push("");
    }

    const label = trimmed.match(/^(요약|결론|핵심|정리|주의|중요)\s*[:：]\s*(.+)$/);
    if (label) {
      const prevLine = lastOutLine();
      if (prevLine && isPlain(prevLine)) out.push("");
      out.push(`**${label[1]}:**`);
      out.push("");
      out.push(label[2]);
      continue;
    }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function normalizeSoftWrap(input: string): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    if (buf.length) out.push(buf.join(" "));
    buf = [];
  };

  const isBlockLine = (s: string) => /^(\s*)(```|#{1,6}\s|>|\- |\* |\||\d{1,2}[\.]\s+)/.test(s) || /^\d+\s*단계\s*[:\-]/.test(s) || /[↓→⇒├└│]/.test(s);

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
      out.push("");
      continue;
    }

    if (isBlockLine(line)) {
      flush();
      out.push(raw);
      continue;
    }

    buf.push(line.trim());
  }

  flush();
  return out.join("\n");
}

function looksLikeTableRow(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (/^(```|>|#{1,6}\s|[-*]\s|\d+\.|\*|\d+\)|\d+\s*단계)/.test(t)) return false;
  const pipes = (t.match(/\|/g) ?? []).length;
  if (pipes < 2) return false;
  const hasSpacedPipe = /\s\|\s|\|\s|\s\|/.test(t);
  if (!hasSpacedPipe && pipes === 2 && t.length < 16) return false;
  return true;
}

function looksLikeTableRowConfirmed(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (/^(```|>|#{1,6}\s|>)/.test(t)) return false;
  const pipes = (t.match(/\|/g) ?? []).length;
  return pipes >= 2;
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function normalizeTableLine(line: string) {
  const t = line.trimEnd();
  const hasPipe = t.includes("|");
  if (!hasPipe) return t;
  const left = /^\s*\|/.test(t);
  const right = /\|\s*$/.test(t);
  if (left && right) return t;
  if (!left && !right) return `| ${t} |`;
  if (!left) return `| ${t}`;
  return `${t} |`;
}

type StreamParserState = {
  source: string;
  blocks: StreamBlock[];
  mode: "normal" | "code" | "table";
  mathMode: boolean;
  pendingLine: string;
  branchIndex: number;
  asciiGroup: boolean;
  dirGroup: boolean;
  nextId: number;
  openFenceTicks: number | null;
  pendingCodeLang?: string | null;
  pendingBranchBadge?: string | null;
};

function createStreamParser(): StreamParserState {
  return {
    source: "",
    blocks: [],
    mode: "normal",
    mathMode: false,
    pendingLine: "",
    branchIndex: 0,
    asciiGroup: false,
    dirGroup: false,
    nextId: 0,
    openFenceTicks: null,
    pendingCodeLang: null,
    pendingBranchBadge: null,
  };
}

function syncPending(state: StreamParserState) {
  const pending = state.pendingLine ?? "";
  for (const block of state.blocks) {
    if (block.kind === "md" || block.kind === "code" || block.kind === "table") {
      delete block.pending;
    }
  }

  const trim = pending.trim();
  if (state.mode !== "code" && /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(trim)) return;
  if (trim === "") return;

  const last = state.blocks[state.blocks.length - 1];
  if (!last) return;
  if (last.kind === "md" || last.kind === "code" || last.kind === "table") {
    last.pending = pending;
  }
}

function ingestDelta(state: StreamParserState, delta: string) {
  const buf = state.pendingLine + delta;
  const parts = buf.split("\n");
  state.pendingLine = parts.pop() ?? "";

  for (const line of parts) {
    processLine(state, line);
  }

  syncPending(state);
}

function appendBlock(state: StreamParserState, block: StreamBlock) {
  state.blocks.push(block);
}

function pushMetaBranch(line: string) {
  const match = line.trim().match(/^((\d{1,2})(?:\s*단계)?(?:[.)]|[:\-])|#)\s*(.+)$/);
  if (!match) return null;
  const badge = match[1].replace(/[:\-]$/, "");
  const level: "major" | "section" = badge.includes("#") ? "major" : "section";
  return { badge, title: match[3], level };
}

function processLine(state: StreamParserState, line: string) {
  const trimmed = line.trim();

  if (trimmed === "$" || trimmed === "$$") {
    state.mathMode = !state.mathMode;
    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = {
        id: `b${state.nextId++}`,
        kind: "md",
        text: "",
      };
      appendBlock(state, last);
    }
    last.text += `${trimmed}\n`;
    return;
  }

  if (state.mathMode) {
    const last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      const b: StreamBlock = {
        id: `b${state.nextId++}`,
        kind: "md",
        text: "",
      };
      appendBlock(state, b);
      b.text += line + "\n";
      return;
    }
    last.text += line + "\n";
    return;
  }

  const fenceMatch = trimmed.match(/^(\s*)(`{3,})([a-zA-Z0-9_-]*)\s*$/);
  if (fenceMatch) {
    const ticks = fenceMatch[2].length;
    const lang = (fenceMatch[3] || "").toLowerCase();

    if (state.mode !== "code" && !lang) return;

    if (state.mode === "normal") {
      state.mode = "code";
      state.openFenceTicks = ticks;
      state.pendingCodeLang = lang || null;
      state.pendingLine = "";
      appendBlock(state, {
        id: `b${state.nextId++}`,
        kind: "code",
        lang: state.pendingCodeLang || undefined,
        text: "",
      });
      return;
    }

    if (state.mode === "code" && !lang && state.openFenceTicks != null && ticks >= state.openFenceTicks) {
      const last = state.blocks[state.blocks.length - 1];
      if (last?.kind === "code" && last.text.trim() === "") {
        state.blocks.pop();
      } else if (last?.kind === "code") {
        last.closed = true;
      }
      state.mode = "normal";
      state.openFenceTicks = null;
      state.pendingCodeLang = null;
      return;
    }
  }

  if (state.mode === "code") {
    const last = state.blocks[state.blocks.length - 1];
    if (last?.kind === "code") {
      last.text += line + "\n";
    }
    return;
  }

  const TREE_EXT = "(?:ts|js|tsx|jsx|json|md|py|go|rs|java|cpp|c|h|hpp|yaml|yml)";
  const treeCore = trimmed.replace(/\s+\/\/.*$/, "");
  const isTreeDir = new RegExp(`^[\\w.-]+(?:\\/[\\w.-]+)*\\/$`).test(treeCore);
  const isTreeFile = new RegExp(`^[\\w.-]+(?:\\/[\\w.-]+)*\\.${TREE_EXT}$`).test(treeCore);
  const isDirectoryTreeLine = isTreeDir || isTreeFile;

  const appendToDirBlock = () => {
    const last = state.blocks[state.blocks.length - 1];
    if (last && last.kind === "code" && !last.lang) {
      last.text += line + "\n";
    } else {
      appendBlock(state, {
        id: `b${state.nextId++}`,
        kind: "code",
        lang: "",
        text: line + "\n",
        closed: true,
      });
    }
  };

  if (state.dirGroup) {
    if (trimmed === "" || isDirectoryTreeLine) {
      appendToDirBlock();
      return;
    }
    state.dirGroup = false;
  }

  if (state.mode === "normal" && isDirectoryTreeLine) {
    state.dirGroup = true;
    appendToDirBlock();
    return;
  }

  const branchMeta = pushMetaBranch(line);
  if (branchMeta) {
    appendBlock(state, {
      id: `b${state.nextId++}`,
      kind: "branch",
      badge: branchMeta.badge,
      title: branchMeta.title,
      level: branchMeta.level,
    });
    state.branchIndex += 1;
    return;
  }

  if (state.mode === "normal" && looksLikeTableRow(line)) {
    appendBlock(state, {
      id: `b${state.nextId++}`,
      kind: "table",
      lines: [normalizeTableLine(line)],
      confirmed: false,
    });
    state.mode = "table";
    return;
  }

  if (state.mode === "table") {
    const block = state.blocks[state.blocks.length - 1];
    if (!block || block.kind !== "table") {
      state.mode = "normal";
      return;
    }

    const rawLine = line.trimEnd();
    const sep = isTableSeparator(rawLine);

    if (!block.confirmed) {
      block.lines.push(normalizeTableLine(rawLine));
      if (block.lines.length >= 2 && looksLikeTableRowConfirmed(rawLine)) {
        block.confirmed = true;
      }
      if (sep) {
        block.confirmed = true;
        block.pending = "";
      }
      return;
    }

    if (!sep && !looksLikeTableRowConfirmed(rawLine)) {
      state.mode = "normal";
      let last = state.blocks[state.blocks.length - 1];
      if (!last || last.kind !== "md") {
        last = { id: `b${state.nextId++}`, kind: "md", text: "" };
        appendBlock(state, last);
      }
      last.text += rawLine + "\n";
      return;
    }

    block.lines.push(normalizeTableLine(rawLine));
    return;
  }

  const isHrLine = /^\s*-{3,}\s*$/.test(trimmed);
  if (isHrLine) {
    if (state.asciiGroup) {
      const last = state.blocks[state.blocks.length - 1];
      if (last && last.kind === "code" && !last.lang) {
        last.text += line + "\n";
        return;
      }
      appendBlock(state, {
        id: `b${state.nextId++}`,
        kind: "code",
        lang: "",
        text: line + "\n",
        closed: true,
      });
      return;
    }

    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = { id: `b${state.nextId++}`, kind: "md", text: "" };
      appendBlock(state, last);
    }
    last.text += line + "\n";
    return;
  }

  const isBoxBorderLine =
    /^[\s│├└┌┐┬┴┘┼─═→⇒|\-]+$/.test(trimmed) &&
    /[│├└┌┐┬┴┘┼]/.test(trimmed);
  const isClassicAsciiBorderLine =
    /^[\s\|\+\-_=]+$/.test(trimmed) &&
    /(\+|\|)/.test(trimmed) &&
    /-{2,}|_{2,}|={2,}/.test(trimmed);
  const isAsciiBorderLine = isBoxBorderLine || isClassicAsciiBorderLine;
  const isAsciiPipeRowInGroup =
    state.asciiGroup && /^[\s|│].*[|│]\s*$/.test(line) && /[|│]/.test(line);
  const isAsciiContentLine = state.asciiGroup && /^[\s│|].+/.test(line);
  const isAsciiDiagramLine = isAsciiBorderLine || isAsciiPipeRowInGroup || isAsciiContentLine;

  if (state.asciiGroup && !isAsciiDiagramLine && /^[\s│|].*/.test(line)) {
    const last = state.blocks[state.blocks.length - 1];
    if (last && last.kind === "code" && !last.lang) {
      last.text += line + "\n";
      return;
    }
  }
  if (isAsciiPipeRowInGroup) {
    const last = state.blocks[state.blocks.length - 1];
    if (last && last.kind === "code" && !last.lang) {
      last.text += line + "\n";
      return;
    }
  }

  if (state.mode === "normal" && isAsciiDiagramLine) {
    const last = state.blocks[state.blocks.length - 1];
    state.asciiGroup = true;
    if (last && last.kind === "code" && !last.lang) {
      last.text += line + "\n";
    } else {
      appendBlock(state, { id: `b${state.nextId++}`, kind: "code", lang: "", text: line + "\n", closed: true });
    }
    return;
  }

  if (state.asciiGroup && trimmed === "") {
    const last = state.blocks[state.blocks.length - 1];
    if (last && last.kind === "code" && !last.lang) {
      last.text += "\n";
      return;
    }
  }

  let last = state.blocks[state.blocks.length - 1];
  if (!last || last.kind !== "md") {
    last = { id: `b${state.nextId++}`, kind: "md", text: "" };
    appendBlock(state, last);
  }
  last.text += line + "\n";
}

const markdownRules = {
  link: (node: any, children: any) => {
    const href = node?.attributes?.href || node?.props?.href;
    const label = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
    return (
      <TouchableOpacity onPress={() => href && Linking.openURL(href)} disabled={!href} key={href ?? label}>
        <Text style={styles.sourceLink}>{label}</Text>
      </TouchableOpacity>
    );
  },
};

export default function MobileMarkdown({ content, streaming = false, branchEmoji, stage = null, sources = [] }: MobileMarkdownProps) {
  const stageEmoji = useMemo(() => (stage ? emojiMap[stage] : undefined), [stage]);
  const safeSource = useMemo(() => {
    if (typeof content === "string") return content;
    if (content == null) return "";
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }, [content]);

  const parserRef = useRef<StreamParserState>(createStreamParser());
  const rawRef = useRef<string>("");

  const blocks = useMemo(() => {
    const normalized = normalizeSoftWrap(normalizeChatParagraphs(normalizeBranchLeadLines(normalizeCodeFenceSafe(safeSource))));
    const streamState = parserRef.current;
    const nextRaw = normalized.replace(/\r\n/g, "\n").replace(/(^|\n)\s*``\s*(?=\n|$)/g, "$1```");

    if (!streamState.source || nextRaw.startsWith(streamState.source)) {
      const delta = nextRaw.slice(streamState.source.length);
      streamState.source = nextRaw;
      ingestDelta(streamState, normalizeHumanMath(delta));
    } else {
      parserRef.current = createStreamParser();
      const fresh = parserRef.current;
      const normalizedAll = normalizeHumanMath(nextRaw);
      fresh.source = nextRaw;
      ingestDelta(fresh, normalizedAll);
    }

    rawRef.current = nextRaw;

    if (!streaming && streamState.pendingLine) {
      const pending = streamState.pendingLine;
      streamState.pendingLine = "";
      syncPending(streamState);
      if (streamState.mode === "code") {
        streamState.mode = "normal";
        streamState.openFenceTicks = null;
        streamState.pendingCodeLang = null;
      }
      const last = streamState.blocks[streamState.blocks.length - 1];
      if (last && last.kind === "md") {
        last.text += pending;
      }
    }

    return streamState.blocks;
  }, [safeSource, streaming]);

  const renderBlock = (block: StreamBlock) => {
    if (block.kind === "md") {
      const nodeContent = (block.pending && streaming ? `${block.text}${block.pending}` : block.text).trim();
      if (!nodeContent) return <View key={block.id} />;

      return (
        <View key={block.id} style={styles.blockWrap}>
          <MarkdownDisplay style={markdownStyles} rules={markdownRules}>
            {nodeContent}
          </MarkdownDisplay>
        </View>
      );
    }

    if (block.kind === "code") {
      return (
        <MobileCodeBlock
          key={block.id}
          code={block.text}
          language={block.lang}
          streaming={!block.closed && streaming}
        />
      );
    }

    if (block.kind === "table") {
      return (
        <View key={block.id} style={styles.tableWrap}>
          {block.lines.map((line, idx) => (
            <Text key={`${block.id}-row-${idx}`} style={styles.tableRow}>
              {line}
            </Text>
          ))}
        </View>
      );
    }

    if (block.kind === "branch") {
      return (
        <View key={block.id} style={styles.branchWrap}>
          <Text style={styles.branchBadge}>{block.badge}</Text>
          <Text style={styles.branchTitle}>{block.title}</Text>
        </View>
      );
    }

    return null;
  };

  const renderSources = () => {
    if (!sources.length) return null;
    return (
      <View style={styles.sourcesWrap}>
        {sources.map((entry) => (
          <TouchableOpacity
            key={entry.id}
            style={styles.sourceChip}
            onPress={() => entry.url && Linking.openURL(entry.url)}
            disabled={!entry.url}
          >
            <Text style={styles.sourceLabel}>{entry.label}</Text>
            {entry.host ? <Text style={styles.sourceHost}>{entry.host}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const displayEmoji = branchEmoji ?? stageEmoji;

  return (
    <View>
      {displayEmoji ? <Text style={styles.branchEmoji}>{displayEmoji}</Text> : null}
      {blocks.map(renderBlock)}
      {renderSources()}
    </View>
  );
}

const markdownStyles = {
  body: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    color: "#2563eb",
  },
} as const;

const styles = StyleSheet.create({
  blockWrap: {
    marginBottom: 4,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  tableRow: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
  },
  branchWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#eef2ff",
    marginVertical: 6,
  },
  branchBadge: {
    fontWeight: "600",
    color: "#1d4ed8",
  },
  branchTitle: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 14,
  },
  branchEmoji: {
    fontSize: 18,
    marginBottom: EMOJI_GAP,
  },
  sourcesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  sourceChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 12,
    color: "#1d4ed8",
  },
  sourceHost: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  sourceLink: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },
});
