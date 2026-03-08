"use client";

import { useState } from "react";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timeAgo: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
      </svg>
    ),
    title: "새 티켓 접수",
    description: "사용자 kim@example.com 님이 결제 관련 문의 티켓을 제출했습니다.",
    timeAgo: "2분 전",
    unread: true,
  },
  {
    id: "2",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
    title: "신규 사용자 가입",
    description: "park.jh@company.co.kr 님이 Pro 플랜으로 가입했습니다.",
    timeAgo: "15분 전",
    unread: true,
  },
  {
    id: "3",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "결제 완료",
    description: "Business 플랜 결제 ₩99,000 (lee.sw@enterprise.kr)",
    timeAgo: "1시간 전",
    unread: true,
  },
  {
    id: "4",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "시스템 경고",
    description: "Redis 메모리 사용량이 80%를 초과했습니다. 모니터링이 필요합니다.",
    timeAgo: "3시간 전",
    unread: false,
  },
  {
    id: "5",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: "감사 로그 업데이트",
    description: "관리자 admin@yuaone.com 이 사용자 권한을 변경했습니다.",
    timeAgo: "5시간 전",
    unread: false,
  },
];

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: 380,
          maxHeight: 480,
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--surface-panel)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideDown 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              알림
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  background: "var(--accent)",
                  padding: "1px 7px",
                  borderRadius: 9999,
                  lineHeight: "16px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 6,
              }}
            >
              모두 읽음
            </button>
          )}
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                background: n.unread ? "var(--surface-main)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--surface-main)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              >
                {n.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: n.unread ? 600 : 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {n.title}
                  </span>
                  {n.unread && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 3,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {n.description}
                </p>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  {n.timeAgo}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
