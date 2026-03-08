"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

const PLANS = [
  { name: "Free", daily: "50", monthly: "1,000", credits: "0", active: true },
  { name: "Pro", daily: "500", monthly: "10,000", credits: "100", active: true },
  { name: "Business", daily: "2,000", monthly: "50,000", credits: "500", active: true },
  { name: "Enterprise", daily: "\u221E", monthly: "\u221E", credits: "1,000", active: true },
];

const SERVICES = [
  { name: "PostgreSQL", status: "online" as const },
  { name: "MySQL", status: "online" as const },
  { name: "Redis", status: "online" as const },
];

export default function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 16,
    letterSpacing: "-0.01em",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    borderBottom: "1px solid var(--line)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-secondary)",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "10px 16px",
    textAlign: "left",
    borderBottom: "1px solid var(--line)",
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-primary)",
    padding: "12px 16px",
    borderBottom: "1px solid var(--line)",
  };

  return (
    <div>
      <PageHeader title="설정" subtitle="시스템 설정 및 플랜 관리" />

      {/* General Settings */}
      <div style={sectionStyle}>
        <div className="admin-card" style={{ padding: 24 }}>
          <h2 style={sectionTitleStyle}>일반 설정</h2>

          <div style={rowStyle}>
            <span style={labelStyle}>사이트 이름</span>
            <span style={valueStyle}>YUA</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>유지보수 모드</span>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              style={{
                position: "relative",
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                background: maintenanceMode ? "var(--accent)" : "var(--line)",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: maintenanceMode ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>API 요청 제한 (분당)</span>
            <span style={valueStyle}>120 req/min</span>
          </div>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>API 요청 제한 (일일)</span>
            <span style={valueStyle}>100,000 req/day</span>
          </div>
        </div>
      </div>

      {/* Plan Configuration */}
      <div style={sectionStyle}>
        <div className="admin-card" style={{ padding: 24 }}>
          <h2 style={sectionTitleStyle}>플랜 설정</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>플랜</th>
                  <th style={thStyle}>일일 한도</th>
                  <th style={thStyle}>월간 한도</th>
                  <th style={thStyle}>크레딧</th>
                  <th style={thStyle}>상태</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map((plan) => (
                  <tr key={plan.name}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{plan.name}</td>
                    <td style={tdStyle}>{plan.daily}</td>
                    <td style={tdStyle}>{plan.monthly}</td>
                    <td style={tdStyle}>{plan.credits}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          color: plan.active ? "var(--status-online)" : "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: plan.active ? "var(--status-online)" : "var(--text-muted)",
                          }}
                        />
                        {plan.active ? "활성" : "비활성"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div style={sectionStyle}>
        <div className="admin-card" style={{ padding: 24 }}>
          <h2 style={sectionTitleStyle}>시스템 상태</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
            {SERVICES.map((svc) => (
              <div
                key={svc.name}
                style={{
                  padding: "16px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  className="status-dot online pulse-dot"
                  style={{ flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--status-online)", marginTop: 2 }}>
                    온라인
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>API 서버 업타임</span>
            <span style={valueStyle}>14일 7시간 32분</span>
          </div>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>마지막 재시작</span>
            <span style={valueStyle}>2026-02-22 03:14 KST</span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={sectionStyle}>
        <div className="admin-card" style={{ padding: 24 }}>
          <h2 style={sectionTitleStyle}>보안</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface-main)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                로그인 실패 (24시간)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                23
              </div>
            </div>

            <div
              style={{
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface-main)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                활성 관리자 세션
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                2
              </div>
            </div>

            <div
              style={{
                padding: "16px 20px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface-main)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                마지막 보안 감사
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                2026-02-15
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
