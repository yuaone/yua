import PlatformSidebar from "@/components/PlatformSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--app-bg)" }}>
      {/* Sidebar */}
      <PlatformSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header
          className="glass-strong shrink-0 sticky top-0 z-20 flex items-center justify-between"
          style={{
            height: "var(--header-height)",
            padding: "0 24px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              YUA Platform
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ color: "var(--text-muted)" }}
            >
              <path
                d="M5 3L9 7L5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Developer Portal
            </span>
          </div>

          {/* Center: Search */}
          <div
            className="hidden md:flex items-center gap-2"
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-hover)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              transition: "all 200ms ease",
              minWidth: 220,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M9.5 9.5L12.5 12.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Search...
            </span>
            <div className="flex-1" />
            <kbd
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                background: "var(--surface-main)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "inherit",
              }}
            >
              /
            </kbd>
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="btn-ghost"
              style={{
                width: 34,
                height: 34,
                padding: 0,
                borderRadius: "var(--radius-md)",
                position: "relative",
              }}
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M13.5 6.75a4.5 4.5 0 1 0-9 0c0 4.5-2.25 5.625-2.25 5.625h13.5S13.5 11.25 13.5 6.75Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.295 15.375a1.5 1.5 0 0 1-2.59 0"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  border: "2px solid var(--surface-main)",
                }}
              />
            </button>

            {/* User avatar */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-full)",
                background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "var(--shadow-xs)",
                transition: "box-shadow 200ms ease",
              }}
            >
              D
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main
          className="flex-1 overflow-auto page-enter"
          style={{
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              maxWidth: "72rem",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
