import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import MobileMermaidRenderer from "@/components/common/MobileMermaidRenderer";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";

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

function renderDiffLine(
  line: string,
  idx: number,
  fontSize: number,
  codeColor: string,
  isDark: boolean,
) {
  const baseStyle = {
    fontFamily: "monospace" as const,
    fontSize,
    lineHeight: fontSize * 1.6,
  };

  if (line.startsWith("@@")) {
    return (
      <Text
        key={`d-${idx}`}
        style={[
          baseStyle,
          {
            backgroundColor: isDark ? "#1e3a5f" : "#eff6ff",
            color: isDark ? "#93c5fd" : "#1d4ed8",
          },
        ]}
      >
        {line}
      </Text>
    );
  }

  if (line.startsWith("+")) {
    return (
      <Text
        key={`d-${idx}`}
        style={[
          baseStyle,
          {
            backgroundColor: isDark ? "#14332b" : "#ecfdf5",
            color: isDark ? "#6ee7b7" : "#065f46",
          },
        ]}
      >
        {line}
      </Text>
    );
  }

  if (line.startsWith("-")) {
    return (
      <Text
        key={`d-${idx}`}
        style={[
          baseStyle,
          {
            backgroundColor: isDark ? "#3b1c1c" : "#fef2f2",
            color: isDark ? "#fca5a5" : "#991b1b",
          },
        ]}
      >
        {line}
      </Text>
    );
  }

  return (
    <Text key={`d-${idx}`} style={[baseStyle, { color: codeColor }]}>
      {line}
    </Text>
  );
}

export default function MobileCodeBlock({
  language,
  code,
  streaming = false,
}: MobileCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { isDark } = useTheme();
  const { codeBlockFontSize } = useAdaptive();

  const parsedLang = parseHeader(language ?? "");
  const displayLang = parsedLang || "code";
  const normalizedLang = normalizeLanguage(parsedLang || "");

  const trimmedCode = code.trim();
  const isMermaid =
    normalizedLang === "mermaid" ||
    (!parsedLang &&
      /^(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie|mindmap)/i.test(
        trimmedCode,
      ));

  const isDiff =
    normalizedLang === "diff" ||
    normalizedLang === "patch" ||
    normalizedLang === "git";

  const lines = useMemo(() => code.replace(/\r\n/g, "\n").split("\n"), [code]);

  const onPressCopy = async () => {
    if (streaming || !code.trim()) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* silent */
    }
  };

  if (isMermaid && !streaming) {
    return <MobileMermaidRenderer chart={code} />;
  }

  // Theme-aware colors
  const bgColor = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#cbd5e1";
  const codeColor = isDark ? "#e2e8f0" : "#0f172a";
  const headerBg = "#0f172a";
  const headerText = "#e2e8f0";
  const headerCopyColor = "#cbd5e1";
  const copiedColor = "#86efac";
  const spinnerColor = "#94a3b8";

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: MobileTokens.radius.codeBlock,
        },
      ]}
    >
      {/* Header: ChatGPT-style -- </> icon + lang (left), copy icon (right) */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.langWrap}>
          {/* </> code icon */}
          <Feather name="code" size={18} color={headerText} />
          <Text style={[styles.lang, { color: headerText }]}>{displayLang}</Text>
          {streaming ? (
            <View style={[styles.spinner, { backgroundColor: spinnerColor }]} />
          ) : null}
        </View>

        <Pressable
          onPress={onPressCopy}
          disabled={streaming || !code.trim()}
          hitSlop={8}
        >
          {copied ? (
            <Feather name="check" size={18} color={copiedColor} />
          ) : (
            <Feather name="copy" size={18} color={headerCopyColor} />
          )}
        </Pressable>
      </View>

      {/* Code */}
      <ScrollView
        horizontal
        style={styles.scroll}
        contentContainerStyle={styles.codePad}
      >
        <View>
          {isDiff
            ? lines.map((line, idx) =>
                renderDiffLine(line, idx, codeBlockFontSize, codeColor, isDark),
              )
            : lines.map((line, idx) => (
                <Text
                  key={`c-${idx}`}
                  style={{
                    fontFamily: "monospace",
                    fontSize: codeBlockFontSize,
                    color: codeColor,
                    lineHeight: codeBlockFontSize * 1.6,
                  }}
                >
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
    overflow: "hidden",
    marginVertical: 6,
  },
  header: {
    minHeight: 34,
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
  lang: {
    fontSize: 11,
  },
  spinner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  scroll: {
    maxWidth: "100%",
  },
  codePad: {
    padding: 10,
  },
});
