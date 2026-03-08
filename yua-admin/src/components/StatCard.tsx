interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "flat";
  sparkline?: number[];
  pulse?: boolean;
  icon?: React.ReactNode;
}

export default function StatCard({
  label,
  value,
  change,
  trend,
  sparkline,
  pulse,
  icon,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "var(--status-online)"
      : trend === "down"
        ? "var(--status-error)"
        : "var(--text-muted)";

  const trendArrow = trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "";

  // Normalize sparkline to 0-100 range for bar heights
  const maxVal = sparkline ? Math.max(...sparkline, 1) : 1;

  return (
    <div className="admin-card" style={{ padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {pulse && <span className="status-dot online pulse-dot" />}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {change && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: trendColor,
              }}
            >
              {trendArrow && <span>{trendArrow}</span>}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Sparkline or Icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {icon && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              {icon}
            </div>
          )}
          {sparkline && sparkline.length > 0 && (
            <div className="sparkline" style={{ marginTop: icon ? 4 : 8 }}>
              {sparkline.map((v, i) => (
                <div
                  key={i}
                  className="sparkline-bar"
                  style={{
                    height: `${Math.max(4, (v / maxVal) * 24)}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
