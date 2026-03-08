"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Metrics {
  timestamp: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  activeSessions: number;
  threadsLastHour: number;
  messagesLastHour: number;
  openTickets: number;
  cpu?: number;
  reqPerMin?: number;
}

const MAX_HISTORY = 30;

function getThreshold(value: number, warn: number, crit: number): "normal" | "warning" | "critical" {
  if (value >= crit) return "critical";
  if (value >= warn) return "warning";
  return "normal";
}

const THRESHOLD_COLORS = {
  normal: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [history, setHistory] = useState<Metrics[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/admin/monitor/stream");
    esRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
      setError("");
    });

    es.addEventListener("metrics", (e) => {
      try {
        const data: Metrics = JSON.parse(e.data);
        setMetrics(data);
        setLastUpdate(new Date());
        setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), data]);
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      setConnected(false);
      setError("SSE 연결 끊김 - 자동 재연결 시도 중...");
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // Get last N values for mini trend bar
  const getTrend = (key: string): number[] => {
    return history.slice(-6).map((m) => {
      if (key === "activeSessions") return m.activeSessions;
      if (key === "threadsLastHour") return m.threadsLastHour;
      if (key === "messagesLastHour") return m.messagesLastHour;
      if (key === "openTickets") return m.openTickets;
      if (key === "heapUsed") return m.memory.heapUsed;
      if (key === "heapTotal") return m.memory.heapTotal;
      if (key === "rss") return m.memory.rss;
      if (key === "cpu") return m.cpu ?? 0;
      if (key === "reqPerMin") return m.reqPerMin ?? 0;
      return 0;
    });
  };

  const MiniBar = ({ values, color }: { values: number[]; color: string }) => {
    if (values.length === 0) return null;
    const max = Math.max(...values, 1);
    return (
      <div className="flex items-end gap-[2px] h-6">
        {values.map((v, i) => (
          <div
            key={i}
            className="w-[5px] rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max(2, (v / max) * 24)}px`,
              background: color,
              opacity: 0.3 + (i / values.length) * 0.7,
            }}
          />
        ))}
      </div>
    );
  };

  const MetricCard = ({
    label,
    value,
    unit,
    trendKey,
    threshold,
    icon,
  }: {
    label: string;
    value: string | number;
    unit?: string;
    trendKey: string;
    threshold?: "normal" | "warning" | "critical";
    icon: string;
  }) => {
    const color = threshold ? THRESHOLD_COLORS[threshold] : "#3b82f6";
    const trend = getTrend(trendKey);

    return (
      <div
        className="rounded-2xl p-5 border relative overflow-hidden transition-all duration-300"
        style={{
          background: "var(--surface-panel)",
          borderColor: "var(--line)",
          borderLeftWidth: "3px",
          borderLeftColor: color,
        }}
      >
        {/* Glow effect for critical */}
        {threshold === "critical" && (
          <div
            className="absolute inset-0 yua-admin-pulse-bg"
            style={{ background: `${color}08` }}
          />
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
                  <path d={icon} />
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {label}
              </span>
            </div>
            <MiniBar values={trend} color={color} />
          </div>

          <div className="flex items-end gap-1.5">
            <span
              className="text-3xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                {unit}
              </span>
            )}
          </div>

          {threshold && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: color,
                  boxShadow: threshold !== "normal" ? `0 0 6px ${color}` : "none",
                }}
              />
              <span className="text-[10px] font-medium" style={{ color }}>
                {threshold === "normal" ? "정상" : threshold === "warning" ? "주의" : "위험"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="실시간 모니터링"
        actions={
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {lastUpdate.toLocaleTimeString("ko-KR")} 업데이트
              </span>
            )}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: connected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${connected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              <span
                className={`w-2 h-2 rounded-full ${connected ? "yua-admin-pulse-dot" : ""}`}
                style={{ background: connected ? "#10b981" : "#ef4444" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: connected ? "#10b981" : "#ef4444" }}
              >
                {connected ? "실시간" : "연결 끊김"}
              </span>
            </div>
          </div>
        }
      />

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.15)",
            color: "#f59e0b",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          {error}
        </div>
      )}

      {!metrics && !error && (
        <div
          className="flex flex-col items-center justify-center py-20 gap-4"
          style={{ color: "var(--text-muted)" }}
        >
          <div className="yua-admin-spinner" />
          <span className="text-sm">메트릭 수신 대기 중...</span>
        </div>
      )}

      {metrics && (
        <div className="space-y-6">
          {/* Primary Metrics - Large cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="활성 세션"
              value={metrics.activeSessions}
              trendKey="activeSessions"
              threshold={getThreshold(metrics.activeSessions, 100, 500)}
              icon="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            />
            <MetricCard
              label="요청/분"
              value={metrics.reqPerMin ?? "-"}
              unit="req/m"
              trendKey="reqPerMin"
              threshold={metrics.reqPerMin ? getThreshold(metrics.reqPerMin, 500, 1000) : "normal"}
              icon="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"
            />
            <MetricCard
              label="최근 1시간 스레드"
              value={metrics.threadsLastHour}
              trendKey="threadsLastHour"
              icon="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
            />
            <MetricCard
              label="열린 티켓"
              value={metrics.openTickets}
              trendKey="openTickets"
              threshold={getThreshold(metrics.openTickets, 10, 50)}
              icon="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
            />
          </div>

          {/* Messages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="최근 1시간 메시지"
              value={metrics.messagesLastHour}
              trendKey="messagesLastHour"
              icon="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
            />
            <MetricCard
              label="CPU"
              value={metrics.cpu ?? "-"}
              unit="%"
              trendKey="cpu"
              threshold={metrics.cpu ? getThreshold(metrics.cpu, 70, 90) : "normal"}
              icon="M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.18 2.51-.99 2.34-3.41.29 2.59 2.24L9.07 22 12 20.23 14.93 22l-.79-3.33 2.59-2.24-3.41-.29-.99-2.34 4.18-2.51c.31-.18.49-.51.49-.86z"
            />
            <MetricCard
              label="RSS 메모리"
              value={metrics.memory.rss}
              unit="MB"
              trendKey="rss"
              threshold={getThreshold(metrics.memory.rss, 512, 1024)}
              icon="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"
            />
          </div>

          {/* Memory Detail Section */}
          <div>
            <h2
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
                <path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z" />
              </svg>
              메모리 상세
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Heap Used */}
              <MemoryBar
                label="Heap Used"
                used={metrics.memory.heapUsed}
                total={metrics.memory.heapTotal}
                color={THRESHOLD_COLORS[getThreshold(
                  metrics.memory.heapUsed / Math.max(metrics.memory.heapTotal, 1) * 100,
                  70,
                  90
                )]}
              />
              {/* Heap Total */}
              <MemoryBar
                label="Heap Total"
                used={metrics.memory.heapTotal}
                total={metrics.memory.rss}
                color="#3b82f6"
              />
              {/* RSS */}
              <MemoryBar
                label="RSS"
                used={metrics.memory.rss}
                total={2048}
                color={THRESHOLD_COLORS[getThreshold(metrics.memory.rss, 512, 1024)]}
              />
            </div>
          </div>

          {/* History sparkline */}
          {history.length > 3 && (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "var(--surface-panel)",
                borderColor: "var(--line)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  세션 트렌드 (최근 {history.length}회)
                </h3>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  10초 간격
                </span>
              </div>
              <div className="flex items-end gap-[3px] h-16">
                {history.map((h, i) => {
                  const maxVal = Math.max(...history.map((x) => x.activeSessions), 1);
                  const pct = (h.activeSessions / maxVal) * 100;
                  const threshold = getThreshold(h.activeSessions, 100, 500);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(4, pct)}%`,
                        background: THRESHOLD_COLORS[threshold],
                        opacity: 0.3 + (i / history.length) * 0.7,
                      }}
                      title={`${h.activeSessions} 세션 - ${new Date(h.timestamp).toLocaleTimeString("ko-KR")}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemoryBar({
  label,
  used,
  total,
  color,
}: {
  label: string;
  used: number;
  total: number;
  color: string;
}) {
  const pct = Math.min(100, (used / Math.max(total, 1)) * 100);
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--surface-panel)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {used} MB
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--line)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          0
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {total} MB
        </span>
      </div>
    </div>
  );
}
