import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, Shield, Loader2 } from "lucide-react";

type QuantAnalysisBlockProps = {
  data: Record<string, any> | null;
  action?: string;
  status: "RUNNING" | "OK" | "FAILED";
  disclaimer?: string;
};

function SignalBadge({ signal }: { signal?: string }) {
  if (!signal) return null;

  const isBullish = signal.includes("bullish") || signal === "oversold" || signal === "above";
  const isBearish = signal.includes("bearish") || signal === "overbought" || signal === "below";

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase
        ${isBullish
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : isBearish
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400"
        }
      `}
    >
      {isBullish ? <TrendingUp size={10} /> : isBearish ? <TrendingDown size={10} /> : <Minus size={10} />}
      {signal.replace(/_/g, " ")}
    </span>
  );
}

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n)) return "-";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e4) return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return n.toFixed(decimals);
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: "green" | "red" | "default";
}) {
  return (
    <div className="yua-quant-card">
      <div className="yua-quant-card-label">{label}</div>
      <div className={`yua-quant-card-value ${
        color === "green" ? "text-emerald-600 dark:text-emerald-400" :
        color === "red" ? "text-red-600 dark:text-red-400" : ""
      }`}>
        {value}
      </div>
      {sub && <div className="yua-quant-card-signal" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function AnalyzeView({ data }: { data: any }) {
  const change = data.changePercent24h ?? 0;
  return (
    <>
      {/* Header */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>
          {data.name || data.ticker}
        </span>
        <span className="text-[13px] font-mono" style={{ color: "var(--text-muted)" }}>
          {data.ticker}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[20px] font-bold" style={{ color: "var(--text-primary)" }}>
          {formatNum(data.currentPrice, 0)} {data.currency ?? ""}
        </span>
        <span className={`text-[13px] font-semibold ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {change >= 0 ? "+" : ""}{formatNum(data.change24h, 0)} ({change >= 0 ? "+" : ""}{change.toFixed(2)}%)
        </span>
      </div>

      {/* Indicators */}
      {data.indicators?.length > 0 && (
        <div className="yua-quant-grid">
          {data.indicators.map((ind: any, i: number) => (
            <div key={i} className="yua-quant-card">
              <div className="flex items-center justify-between mb-1">
                <span className="yua-quant-card-label">{ind.name}</span>
                <SignalBadge signal={ind.signal} />
              </div>
              <div className="yua-quant-card-value text-[16px]">{formatNum(ind.value)}</div>
              {ind.description && (
                <div className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {ind.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.summary && (
        <div className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </div>
      )}
    </>
  );
}

function ForecastView({ data }: { data: any }) {
  const preds = data.predictions ?? [];
  const last = preds[preds.length - 1];
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {data.ticker} — {data.forecastDays}일 예측 ({data.model})
        </span>
      </div>

      {last && (
        <div className="yua-quant-grid">
          <MetricCard label="예상가" value={formatNum(last.predicted, 0)} />
          <MetricCard label="범위" value={`${formatNum(last.lower, 0)} ~ ${formatNum(last.upper, 0)}`} />
          {data.accuracy?.mape != null && (
            <MetricCard label="MAPE" value={`${data.accuracy.mape.toFixed(1)}%`} sub="모델 오차율" />
          )}
        </div>
      )}

      {data.summary && (
        <div className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </div>
      )}
    </>
  );
}

function SimulateView({ data }: { data: any }) {
  const r = data.results ?? {};
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} style={{ color: "var(--text-muted)" }} />
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {data.ticker} — Monte Carlo ({formatNum(data.simulations, 0)}회, {data.horizonDays}일)
        </span>
      </div>

      <div className="yua-quant-grid">
        <MetricCard label="평균 예상가" value={formatNum(r.mean, 0)} />
        <MetricCard label="중앙값" value={formatNum(r.median, 0)} />
        <MetricCard
          label="상승 확률"
          value={`${((r.probUp ?? 0) * 100).toFixed(1)}%`}
          color={(r.probUp ?? 0) >= 0.5 ? "green" : "red"}
        />
        <MetricCard
          label="최대 낙폭"
          value={`${formatNum(r.maxDrawdown, 2)}%`}
          color="red"
        />
      </div>

      {/* Percentile range bar */}
      {r.p5 != null && r.p95 != null && data.currentPrice > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>95% 신뢰 범위</div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span>{formatNum(r.p5, 0)}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: "var(--line)" }}>
              <div
                className="h-full rounded-full bg-violet-500 dark:bg-violet-400"
                style={{
                  marginLeft: `${Math.max(0, ((r.p25 - r.p5) / (r.p95 - r.p5)) * 100)}%`,
                  width: `${Math.max(5, ((r.p75 - r.p25) / (r.p95 - r.p5)) * 100)}%`,
                }}
              />
            </div>
            <span>{formatNum(r.p95, 0)}</span>
          </div>
        </div>
      )}

      {data.summary && (
        <div className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </div>
      )}
    </>
  );
}

function RiskView({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} style={{ color: "var(--text-muted)" }} />
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {data.ticker} — 리스크 분석 ({data.period})
        </span>
      </div>

      <div className="yua-quant-grid">
        <MetricCard
          label="연간 변동성"
          value={`${formatNum(data.volatility, 1)}%`}
          sub={(data.volatility ?? 0) > 40 ? "높음" : (data.volatility ?? 0) > 20 ? "보통" : "낮음"}
          color={(data.volatility ?? 0) > 40 ? "red" : undefined}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={formatNum(data.sharpeRatio, 2)}
          sub={(data.sharpeRatio ?? 0) > 1 ? "양호" : (data.sharpeRatio ?? 0) > 0 ? "보통" : "부진"}
          color={(data.sharpeRatio ?? 0) > 1 ? "green" : (data.sharpeRatio ?? 0) < 0 ? "red" : undefined}
        />
        <MetricCard
          label="VaR (95%)"
          value={`${formatNum(data.var95, 2)}%`}
          sub="일일 최대 손실"
          color="red"
        />
        <MetricCard
          label="최대 낙폭"
          value={`${formatNum(data.maxDrawdown, 2)}%`}
          color="red"
        />
        {data.annualReturn != null && (
          <MetricCard
            label="연간 수익률"
            value={`${data.annualReturn >= 0 ? "+" : ""}${formatNum(data.annualReturn, 1)}%`}
            color={data.annualReturn >= 0 ? "green" : "red"}
          />
        )}
      </div>

      {data.summary && (
        <div className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </div>
      )}
    </>
  );
}

export default function QuantAnalysisBlock({ data, action, status, disclaimer }: QuantAnalysisBlockProps) {
  if (status === "RUNNING") {
    return (
      <div className="yua-quant-block">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            {action ?? "analyze"} 분석 진행 중...
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 yua-quant-skeleton" style={{ width: "60%" }} />
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 yua-quant-skeleton" style={{ width: "80%" }} />
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 yua-quant-skeleton" style={{ width: "45%" }} />
        </div>
      </div>
    );
  }

  if (status === "FAILED" || !data) {
    return (
      <div className="yua-quant-block" style={{ borderColor: "rgb(239 68 68 / 0.3)" }}>
        <span className="text-[13px] text-red-600 dark:text-red-400">분석 실패</span>
      </div>
    );
  }

  return (
    <div className="yua-quant-block">
      {action === "analyze" && <AnalyzeView data={data} />}
      {action === "forecast" && <ForecastView data={data} />}
      {action === "simulate" && <SimulateView data={data} />}
      {action === "risk" && <RiskView data={data} />}

      {disclaimer && (
        <div className="yua-quant-disclaimer">{disclaimer}</div>
      )}
    </div>
  );
}
