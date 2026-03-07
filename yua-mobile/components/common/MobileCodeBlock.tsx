import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MobileMermaidRenderer from "@/components/common/MobileMermaidRenderer";

type MobileCodeBlockProps = {
  language?: string;
  code: string;
  streaming?: boolean;
};

function parseHeader(languageRaw: string) {
  if (languageRaw.includes(":")) {
    const [lang] = languageRaw.split(":");
    return lang;
  }
  return languageRaw;
}

function normalizeLanguage(lang: string) {
  switch (lang.toLowerCase()) {
    case "ts":
      return "typescript";
    case "js":
      return "javascript";
    case "py":
      return "python";
    case "md":
      return "markdown";
    default:
      return lang.toLowerCase();
  }
}

function renderDiffLine(line: string, idx: number) {
  if (line.startsWith("@@")) {
    return (
      <Text key={`d-${idx}`} style={[styles.codeLine, styles.diffHunk]}>
        {line}
      </Text>
    );
  }

  if (line.startsWith("+")) {
    return (
      <Text key={`d-${idx}`} style={[styles.codeLine, styles.diffAdd]}>
        {line}
      </Text>
    );
  }

  if (line.startsWith("-")) {
    return (
      <Text key={`d-${idx}`} style={[styles.codeLine, styles.diffDel]}>
        {line}
      </Text>
    );
  }

  return (
    <Text key={`d-${idx}`} style={styles.codeLine}>
      {line}
    </Text>
  );
}

export default function MobileCodeBlock({ language, code, streaming = false }: MobileCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const parsedLang = parseHeader(language ?? "");
  const displayLang = parsedLang || "code";
  const normalizedLang = normalizeLanguage(parsedLang || "");

  const trimmedCode = code.trim();
  const isMermaid =
    normalizedLang === "mermaid" ||
    /^(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie|mindmap)/i.test(trimmedCode);

  const isDiff = normalizedLang === "diff" || normalizedLang === "patch" || normalizedLang === "git";

  const lines = useMemo(() => code.replace(/\r\n/g, "\n").split("\n"), [code]);

  const onPressCopy = () => {
    // Clipboard integration is handled elsewhere in mobile shell; keep UX signal consistent.
    if (streaming || !code.trim()) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (isMermaid) {
    return <MobileMermaidRenderer chart={code} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.langWrap}>
          <Text style={styles.lang}>{displayLang}</Text>
          {streaming ? <View style={styles.spinner} /> : null}
        </View>
        <Pressable onPress={onPressCopy} disabled={streaming || !code.trim()}>
          <Text style={[styles.copy, copied ? styles.copyDone : null]}>{copied ? "Copied" : "Copy"}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.codePad}>
        <View>
          {isDiff
            ? lines.map((line, idx) => renderDiffLine(line, idx))
            : lines.map((line, idx) => (
                <Text key={`c-${idx}`} style={styles.codeLine}>
                  {line.length === 0 ? " " : line}
                </Text>
              ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 6,
    backgroundColor: "#f8fafc",
  },
  header: {
    minHeight: 34,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lang: { color: "#e2e8f0", fontSize: 11 },
  spinner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#94a3b8",
  },
  copy: { color: "#cbd5e1", fontSize: 11 },
  copyDone: { color: "#86efac" },
  scroll: { maxWidth: "100%" },
  codePad: { padding: 10 },
  codeLine: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 20,
  },
  diffAdd: {
    backgroundColor: "#ecfdf5",
    color: "#065f46",
  },
  diffDel: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
  },
  diffHunk: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
  },
});
