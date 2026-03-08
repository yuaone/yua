/**
 * ErrorBoundary — catches unhandled JS errors and shows recovery UI.
 *
 * Class components cannot use hooks, so colors are hardcoded.
 * Wrap your app tree (or subtree) with <ErrorBoundary> to catch crashes.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { MobileTokens } from "@/constants/tokens";

/* ───────── Types ───────── */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDebug: boolean;
}

/* ───────── Component ───────── */

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDebug: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log for diagnostics; could forward to analytics later
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, showDebug: false });
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, showDebug: false });
    router.replace("/(authed)/chat");
  };

  private toggleDebug = (): void => {
    this.setState((prev) => ({ showDebug: !prev.showDebug }));
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // If a custom fallback is provided, render it
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, showDebug } = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Warning icon */}
          <Text style={styles.icon}>&#9888;</Text>

          {/* Title */}
          <Text style={styles.title}>문제가 발생했습니다</Text>

          {/* Description */}
          <Text style={styles.description}>
            앱에서 예상치 못한 오류가 발생했습니다.{"\n"}다시 시도해주세요.
          </Text>

          {/* Retry button */}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>

          {/* Home link */}
          <TouchableOpacity
            onPress={this.handleGoHome}
            activeOpacity={0.7}
            style={styles.homeLink}
          >
            <Text style={styles.homeLinkText}>홈으로 돌아가기</Text>
          </TouchableOpacity>

          {/* Debug info — DEV only */}
          {__DEV__ && error && (
            <View style={styles.debugSection}>
              <TouchableOpacity
                onPress={this.toggleDebug}
                activeOpacity={0.7}
              >
                <Text style={styles.debugToggle}>
                  {showDebug ? "디버그 정보 숨기기" : "디버그 정보 보기"}
                </Text>
              </TouchableOpacity>

              {showDebug && (
                <ScrollView
                  style={styles.debugScroll}
                  contentContainerStyle={styles.debugScrollContent}
                >
                  <Text style={styles.debugText} selectable>
                    {error.message}
                    {error.stack ? `\n\n${error.stack}` : ""}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }
}

/* ───────── Styles (hardcoded — class components cannot use hooks) ───────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.xl,
  },
  content: {
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
  },
  icon: {
    fontSize: 48,
    color: "#f59e0b",
    marginBottom: MobileTokens.space.lg,
  },
  title: {
    fontSize: MobileTokens.font.xl,
    fontWeight: MobileTokens.weight.bold,
    color: "#111111",
    textAlign: "center",
    marginBottom: MobileTokens.space.sm,
  },
  description: {
    fontSize: MobileTokens.font.md,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: MobileTokens.font.md * MobileTokens.lineHeight.relaxed,
    marginBottom: MobileTokens.space.xl,
  },
  retryButton: {
    backgroundColor: "#0b0f19",
    borderRadius: MobileTokens.radius.md,
    paddingVertical: MobileTokens.space.md,
    paddingHorizontal: MobileTokens.space.xxl,
    width: "100%",
    alignItems: "center",
    marginBottom: MobileTokens.space.lg,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: MobileTokens.font.body,
    fontWeight: MobileTokens.weight.semibold,
  },
  homeLink: {
    paddingVertical: MobileTokens.space.sm,
    marginBottom: MobileTokens.space.xl,
  },
  homeLinkText: {
    color: "#2563eb",
    fontSize: MobileTokens.font.md,
    fontWeight: MobileTokens.weight.medium,
  },
  debugSection: {
    width: "100%",
    marginTop: MobileTokens.space.sm,
    alignItems: "center",
  },
  debugToggle: {
    fontSize: MobileTokens.font.xs,
    color: "#9ca3af",
    textDecorationLine: "underline",
    marginBottom: MobileTokens.space.sm,
  },
  debugScroll: {
    maxHeight: 200,
    width: "100%",
    backgroundColor: "#f4f4f4",
    borderRadius: MobileTokens.radius.sm,
  },
  debugScrollContent: {
    padding: MobileTokens.space.md,
  },
  debugText: {
    fontSize: MobileTokens.font.xs,
    color: "#374151",
    fontFamily: "monospace",
    lineHeight: MobileTokens.font.xs * MobileTokens.lineHeight.normal,
  },
});

export default ErrorBoundary;
