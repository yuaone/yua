"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalThreads: number;
  totalMessages: number;
}

// Mock sparkline data for visual richness
const SPARKLINES = {
  users: [12, 18, 15, 22, 28, 24, 32],
  active: [45, 38, 52, 48, 55, 60, 58],
  threads: [120, 135, 128, 142, 155, 148, 165],
  messages: [890, 920, 880, 950, 1020, 980, 1050],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<Stats>("/admin/stats").then((res) => {
      if (res.ok && res.data) setStats(res.data);
      else setError(res.error ?? "통계를 불러올 수 없습니다");
    });
  }, []);

  const now = new Date();
  const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="fade-in">
      <PageHeader
        title="대시보드"
        subtitle={`마지막 갱신: ${timeStr}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-dot online pulse-dot" />
            <span style={{ fontSize: 12, color: "var(--status-online)", fontWeight: 500 }}>Live</span>
          </div>
        }
      />

      {error && (
        <div
          className="admin-card"
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            borderColor: "var(--status-error)",
            color: "var(--badge-red-text)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="status-dot error" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {!stats && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "30%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <StatCard
              label="전체 유저"
              value={stats.totalUsers}
              change="+12.5% 이번 주"
              trend="up"
              sparkline={SPARKLINES.users}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="오늘 활성 유저"
              value={stats.activeToday}
              change="+8.3% 어제 대비"
              trend="up"
              sparkline={SPARKLINES.active}
              pulse
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              }
            />
            <StatCard
              label="전체 스레드"
              value={stats.totalThreads}
              change="+15.2% 이번 주"
              trend="up"
              sparkline={SPARKLINES.threads}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
            />
            <StatCard
              label="전체 메시지"
              value={stats.totalMessages}
              change="-2.1% 이번 주"
              trend="down"
              sparkline={SPARKLINES.messages}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9 22,2" />
                </svg>
              }
            />
          </div>

          {/* Quick Alerts */}
          <div style={{ marginTop: 28 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              빠른 알림
              <span className="badge badge-amber">4건</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Alert: tickets */}
              <div className="alert-card" style={{ cursor: "pointer" }}>
                <div
                  className="alert-icon"
                  style={{ background: "var(--badge-amber-bg)", color: "var(--badge-amber-text)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>3개의 미처리 티켓</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    2건 긴급, 1건 보통 우선순위
                  </div>
                </div>
                <span className="badge badge-amber">긴급</span>
                <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>2분 전</span>
              </div>

              {/* Alert: reported user */}
              <div className="alert-card" style={{ cursor: "pointer" }}>
                <div
                  className="alert-icon"
                  style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="17" y1="8" x2="23" y2="8" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>1개의 신고된 유저</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    부적절한 콘텐츠 신고 접수
                  </div>
                </div>
                <span className="badge badge-red">신고</span>
                <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>15분 전</span>
              </div>

              {/* Alert: system */}
              <div className="alert-card" style={{ cursor: "pointer" }}>
                <div
                  className="alert-icon"
                  style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>API 응답 지연 감지</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    /api/chat/stream 평균 응답시간 2.3s (임계값: 2s)
                  </div>
                </div>
                <span className="badge badge-blue">정보</span>
                <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>1시간 전</span>
              </div>

              {/* Alert: new signups */}
              <div className="alert-card" style={{ cursor: "pointer" }}>
                <div
                  className="alert-icon"
                  style={{ background: "var(--badge-green-bg)", color: "var(--badge-green-text)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>오늘 신규 가입 12명</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Google: 8명, 이메일: 4명
                  </div>
                </div>
                <span className="badge badge-green">정상</span>
                <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>실시간</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
