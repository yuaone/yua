"use client";

import { usePathname } from "next/navigation";

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "대시보드",
  "/users": "유저 관리",
  "/workspaces": "워크스페이스",
  "/threads": "스레드",
  "/tickets": "티켓",
  "/audit": "감사 로그",
  "/monitor": "모니터링",
};

export default function TopBar() {
  const pathname = usePathname();

  const crumbs: { label: string; href?: string }[] = [{ label: "YUA Admin" }];
  const basePath = "/" + (pathname.split("/")[1] ?? "");
  if (basePath !== "/") {
    crumbs.push({ label: BREADCRUMB_MAP[basePath] ?? basePath.slice(1) });
  } else {
    crumbs.push({ label: "대시보드" });
  }
  // If there's a sub-path (e.g., /users/123)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 1) {
    crumbs.push({ label: segments.slice(1).join("/") });
  }

  return (
    <div className="admin-topbar">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,6 15,12 9,18" />
              </svg>
            )}
            <span
              style={{
                fontSize: 13,
                color: i === crumbs.length - 1 ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
              }}
            >
              {c.label}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="admin-input"
          placeholder="검색... (Ctrl+K)"
          style={{ paddingLeft: 32, width: 220, fontSize: 12 }}
          readOnly
        />
      </div>

      {/* Notification bell */}
      <button
        style={{
          position: "relative",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: 6,
          borderRadius: "var(--radius-sm)",
          display: "flex",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Notification dot */}
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--status-error)",
            border: "2px solid var(--topbar-bg)",
          }}
        />
      </button>

      {/* Admin avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        A
      </div>
    </div>
  );
}
