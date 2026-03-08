import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MathJaxSvg } from "react-native-mathjax-html-to-svg";

import { useTheme } from "@/hooks/useTheme";

type Props = {
  tex: string;
  display?: boolean;
  streaming?: boolean;
};

/** Lightweight error boundary scoped to MathJaxSvg rendering */
class MathErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function RawFallback({ tex, display }: { tex: string; display: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <Text
      style={[
        styles.rawTex,
        {
          color: colors.textSecondary,
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
        },
      ]}
    >
      {display ? `$$\n${tex}\n$$` : `$${tex}$`}
    </Text>
  );
}

export default function MobileMathBlock({ tex, display = true, streaming = false }: Props) {
  const { colors } = useTheme();

  if (!tex?.trim()) return null;

  // While streaming (block not closed yet), show raw LaTeX as monospace
  if (streaming) {
    return (
      <View style={[styles.container, display && styles.displayContainer]}>
        <RawFallback tex={tex} display={display} />
      </View>
    );
  }

  // MathJaxSvg expects the math wrapped in delimiters
  // Library halves fontSize internally, so double it
  const wrapped = display ? `$$${tex}$$` : `\\(${tex}\\)`;

  return (
    <View style={[styles.container, display && styles.displayContainer]}>
      <MathErrorBoundary fallback={<RawFallback tex={tex} display={display} />}>
        <MathJaxSvg
          fontSize={display ? 32 : 28}
          color={colors.textPrimary}
          style={display ? styles.displayMath : styles.inlineMath}
        >
          {wrapped}
        </MathJaxSvg>
      </MathErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  displayContainer: {
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  displayMath: {},
  inlineMath: {},
  rawTex: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
});
