/**
 * QuantAnalysisBlock — Renders structured quant analysis data in 4 view types.
 *
 * Views: AnalyzeView, ForecastView, SimulateView, RiskView
 * Uses theme colors via useTheme(), adaptive grid via useAdaptive().
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";
import type { ThemeColors } from "@/constants/theme";

/* ============================
   Types
============================ */

export interface QuantData {
  action: "analyze" | "forecast" | "simulate" | "risk";
  title: string;
  disclaimer?: string;
  metrics?: {
    label: string;
    value: string | number;
    change?: number;
  }[];
  forecast?: {
    period: string;
    value: number;
    confidence?: [number, number];
  }[];
  simulation?: {
    runs: number;
    mean: number;
    median: number;
    p5: number;
    p95: number;
    stdDev: number;
  };
  risks?: {
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }[];
}

export interface QuantAnalysisBlockProps {
  data: QuantData;
}

/* ============================
   Icons (emoji)
============================ */

const ACTION_ICONS: Record<QuantData["action"], string> = {
  analyze: "\u{1F4CA}", // bar chart
  forecast: "\u{1F4C8}", // chart increasing
  simulate: "\u{1F3B2}", // dice
  risk: "\u{1F6E1}\uFE0F", // shield
};

/* ============================
   Severity colors
============================ */

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(34,197,94,0.15)", text: "#16a34a" },
  medium: { bg: "rgba(234,179,8,0.15)", text: "#ca8a04" },
  high: { bg: "rgba(249,115,22,0.15)", text: "#ea580c" },
  critical: { bg: "rgba(239,68,68,0.15)", text: "#dc2626" },
};

const SEVERITY_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(34,197,94,0.2)", text: "#4ade80" },
  medium: { bg: "rgba(234,179,8,0.2)", text: "#facc15" },
  high: { bg: "rgba(249,115,22,0.2)", text: "#fb923c" },
  critical: { bg: "rgba(239,68,68,0.2)", text: "#f87171" },
};

/* ============================
   Sub-views
============================ */

function AnalyzeView({
  data,
  colors,
  gridColumns,
}: {
  data: QuantData;
  colors: ThemeColors;
  gridColumns: number;
}) {
  if (!data.metrics?.length) return null;

  return (
    <View style={s.metricsGrid}>
      {data.metrics.map((m, i) => (
        <View
          key={i}
          style={[
            s.metricCard,
            {
              backgroundColor: colors.wash,
              borderRadius: MobileTokens.radius.sm,
              width:
                gridColumns === 3
                  ? "31.5%"
                  : gridColumns === 2
                    ? "48%"
                    : "100%",
            },
          ]}
        >
          <Text style={[s.metricLabel, { color: colors.textMuted }]}>
            {m.label}
          </Text>
          <View style={s.metricValueRow}>
            <Text style={[s.metricValue, { color: colors.textPrimary }]}>
              {String(m.value)}
            </Text>
            {m.change != null && m.change !== 0 && (
              <Text
                style={[
                  s.metricChange,
                  { color: m.change > 0 ? "#22c55e" : "#ef4444" },
                ]}
              >
                {m.change > 0 ? "\u2191" : "\u2193"}{" "}
                {Math.abs(m.change).toFixed(2)}%
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function ForecastView({
  data,
  colors,
}: {
  data: QuantData;
  colors: ThemeColors;
}) {
  if (!data.forecast?.length) return null;

  const maxVal = Math.max(...data.forecast.map((f) => f.value), 1);

  return (
    <View style={s.forecastList}>
      {data.forecast.map((f, i) => {
        const barWidth = Math.max((f.value / maxVal) * 100, 5);
        return (
          <View key={i} style={s.forecastRow}>
            <Text style={[s.forecastPeriod, { color: colors.textSecondary }]}>
              {f.period}
            </Text>
            <View style={[s.forecastBarContainer, { backgroundColor: colors.wash }]}>
              <View
                style={[
                  s.forecastBar,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: colors.activeIndicator,
                  },
                ]}
              />
            </View>
            <Text style={[s.forecastValue, { color: colors.textPrimary }]}>
              {f.value.toLocaleString()}
            </Text>
            {f.confidence && (
              <Text style={[s.forecastConfidence, { color: colors.textMuted }]}>
                [{f.confidence[0]}-{f.confidence[1]}]
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function SimulateView({
  data,
  colors,
  gridColumns,
}: {
  data: QuantData;
  colors: ThemeColors;
  gridColumns: number;
}) {
  if (!data.simulation) return null;

  const sim = data.simulation;
  const stats: { label: string; value: string }[] = [
    { label: "Runs", value: sim.runs.toLocaleString() },
    { label: "Mean", value: sim.mean.toLocaleString() },
    { label: "Median", value: sim.median.toLocaleString() },
    { label: "P5", value: sim.p5.toLocaleString() },
    { label: "P95", value: sim.p95.toLocaleString() },
    { label: "Std Dev", value: sim.stdDev.toLocaleString() },
  ];

  return (
    <View style={s.metricsGrid}>
      {stats.map((st, i) => (
        <View
          key={i}
          style={[
            s.simCard,
            {
              backgroundColor: colors.wash,
              borderRadius: MobileTokens.radius.sm,
              width:
                gridColumns === 3
                  ? "31.5%"
                  : gridColumns === 2
                    ? "48%"
                    : "100%",
            },
          ]}
        >
          <Text style={[s.simLabel, { color: colors.textMuted }]}>
            {st.label}
          </Text>
          <Text style={[s.simValue, { color: colors.textPrimary }]}>
            {st.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RiskView({
  data,
  colors,
  isDark,
}: {
  data: QuantData;
  colors: ThemeColors;
  isDark: boolean;
}) {
  if (!data.risks?.length) return null;

  const palette = isDark ? SEVERITY_COLORS_DARK : SEVERITY_COLORS;

  return (
    <View style={s.riskList}>
      {data.risks.map((r, i) => {
        const sev = palette[r.severity] ?? palette.low;
        return (
          <View
            key={i}
            style={[s.riskItem, { borderBottomColor: colors.line }]}
          >
            <View style={s.riskHeader}>
              <Text style={[s.riskFactor, { color: colors.textPrimary }]}>
                {r.factor}
              </Text>
              <View
                style={[s.severityBadge, { backgroundColor: sev.bg }]}
              >
                <Text style={[s.severityText, { color: sev.text }]}>
                  {r.severity.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[s.riskDesc, { color: colors.textSecondary }]}>
              {r.description}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ============================
   Main Component
============================ */

function QuantAnalysisBlockInner({ data }: QuantAnalysisBlockProps) {
  const { colors, isDark } = useTheme();
  const { isTablet } = useAdaptive();

  const gridColumns = isTablet ? 3 : 2;
  const icon = ACTION_ICONS[data.action];

  return (
    <View
      style={[
        s.container,
        {
          borderColor: colors.line,
          borderRadius: MobileTokens.radius.card,
          backgroundColor: colors.surfaceMain,
        },
      ]}
    >
      {/* Title */}
      <View style={s.titleRow}>
        <Text style={s.titleIcon}>{icon}</Text>
        <Text style={[s.titleText, { color: colors.textPrimary }]}>
          {data.title}
        </Text>
      </View>

      {/* View body */}
      {data.action === "analyze" && (
        <AnalyzeView data={data} colors={colors} gridColumns={gridColumns} />
      )}
      {data.action === "forecast" && (
        <ForecastView data={data} colors={colors} />
      )}
      {data.action === "simulate" && (
        <SimulateView data={data} colors={colors} gridColumns={gridColumns} />
      )}
      {data.action === "risk" && (
        <RiskView data={data} colors={colors} isDark={isDark} />
      )}

      {/* Disclaimer */}
      {data.disclaimer ? (
        <Text style={[s.disclaimer, { color: colors.textMuted }]}>
          {data.disclaimer}
        </Text>
      ) : null}
    </View>
  );
}

export const QuantAnalysisBlock = React.memo(QuantAnalysisBlockInner);

/* ============================
   Styles
============================ */

const s = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: MobileTokens.space.lg,
    marginVertical: MobileTokens.space.sm,
  },

  // Title
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: MobileTokens.space.md,
  },
  titleIcon: {
    fontSize: 16,
    marginRight: MobileTokens.space.sm,
  },
  titleText: {
    fontSize: 16,
    fontWeight: MobileTokens.weight.semibold,
  },

  // Metrics / Simulate grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: MobileTokens.space.sm,
  },
  metricCard: {
    padding: MobileTokens.space.md,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: MobileTokens.space.xxs,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: MobileTokens.space.xs,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: MobileTokens.weight.bold,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: MobileTokens.weight.medium,
  },

  // Forecast
  forecastList: {
    gap: MobileTokens.space.sm,
  },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: MobileTokens.space.sm,
  },
  forecastPeriod: {
    fontSize: 13,
    width: 64,
  },
  forecastBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  forecastBar: {
    height: 8,
    borderRadius: 4,
  },
  forecastValue: {
    fontSize: 13,
    fontWeight: MobileTokens.weight.semibold,
    minWidth: 48,
    textAlign: "right",
  },
  forecastConfidence: {
    fontSize: 10,
    minWidth: 56,
  },

  // Simulate
  simCard: {
    padding: MobileTokens.space.md,
  },
  simLabel: {
    fontSize: 11,
    marginBottom: MobileTokens.space.xxs,
  },
  simValue: {
    fontSize: 16,
    fontWeight: MobileTokens.weight.bold,
  },

  // Risk
  riskList: {
    gap: MobileTokens.space.sm,
  },
  riskItem: {
    borderBottomWidth: 1,
    paddingBottom: MobileTokens.space.sm,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: MobileTokens.space.xxs,
  },
  riskFactor: {
    fontSize: 14,
    fontWeight: MobileTokens.weight.semibold,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: MobileTokens.space.sm,
    paddingVertical: MobileTokens.space.xxs,
    borderRadius: MobileTokens.radius.xs,
  },
  severityText: {
    fontSize: 10,
    fontWeight: MobileTokens.weight.bold,
    letterSpacing: 0.5,
  },
  riskDesc: {
    fontSize: 13,
    lineHeight: 13 * MobileTokens.lineHeight.normal,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: MobileTokens.space.md,
  },
});
