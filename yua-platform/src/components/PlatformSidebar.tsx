"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

/* ── Nav items ── */
const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/keys",
    label: "API Keys",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M12.5 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 10v7m0 0-2-2m2 2 2-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/usage",
    label: "Usage",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 17V11M7.5 17V8M12 17V5M16.5 17V3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/billing",
    label: "Billing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 12.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/models",
    label: "Models",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2L3 6v8l7 4 7-4V6l-7-4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 10l7-4M10 10v8M10 10L3 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/playground",
    label: "Playground",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M6 5l8 5-8 5V5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/docs",
    label: "Docs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 3.5h5a2 2 0 0 1 2 2v11a1.5 1.5 0 0 0-1.5-1.5H4V3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.5h-5a2 2 0 0 0-2 2v11a1.5 1.5 0 0 1 1.5-1.5H16V3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2v2m0 12v2M4.22 4.22l1.42 1.42m8.72 8.72 1.42 1.42M2 10h2m12 0h2M4.22 15.78l1.42-1.42m8.72-8.72 1.42-1.42"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

/* ── Collapse toggle icon ── */
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      <path
        d="M10 3L5 8L10 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── YUA Logo ── */
function YuaLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {/* Icon mark */}
      <div
        className="shrink-0 flex items-center justify-center rounded-lg"
        style={{
          width: 32,
          height: 32,
          background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
          boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2L3 6v6l6 4 6-4V6L9 2Z"
            fill="rgba(255,255,255,0.95)"
          />
          <path
            d="M9 2L3 6v6l6 4 6-4V6L9 2Z"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      {/* Wordmark */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
          transition:
            "opacity 200ms cubic-bezier(0.25, 0.1, 0.25, 1), width 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        <span
          className="text-[15px] font-bold whitespace-nowrap"
          style={{
            color: "var(--sb-ink)",
            letterSpacing: "-0.03em",
          }}
        >
          YUA
        </span>
        <span
          className="text-[10px] font-medium whitespace-nowrap"
          style={{
            color: "var(--sb-ink-2)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: -2,
          }}
        >
          Platform
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   PlatformSidebar
   ============================================================ */
export default function PlatformSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  /* Persist collapse state */
  useEffect(() => {
    const saved = localStorage.getItem("yua-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("yua-sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <aside
      className="sidebar-transition flex flex-col shrink-0 h-screen sticky top-0 z-30"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: "var(--sb-bg)",
        borderRight: "1px solid var(--sb-line)",
      }}
    >
      {/* ── Logo Row ── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 56,
          padding: collapsed ? "0 16px" : "0 16px 0 20px",
          justifyContent: collapsed ? "center" : "space-between",
          transition: "padding 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        <Link href="/dashboard" className="flex items-center no-underline" style={{ textDecoration: "none" }}>
          <YuaLogo collapsed={collapsed} />
        </Link>

        {/* Collapse toggle */}
        {!collapsed && (
          <button
            onClick={toggle}
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28,
              height: 28,
              color: "var(--sb-ink-2)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--sb-soft)";
              e.currentTarget.style.color = "var(--sb-ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--sb-ink-2)";
            }}
            aria-label="Collapse sidebar"
          >
            <CollapseIcon collapsed={false} />
          </button>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "var(--sb-line)", margin: "0 12px" }} />

      {/* ── Navigation ── */}
      <nav
        className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
        style={{
          padding: collapsed ? "12px 8px" : "12px",
        }}
      >
        {/* Section label */}
        {!collapsed && (
          <div
            className="sidebar-item-enter"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--sb-ink-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "8px 12px 6px",
            }}
          >
            Menu
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tooltip ${collapsed ? "" : ""}`}
              data-tooltip={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 0" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "var(--sb-active-ink)"
                  : "var(--sb-ink-2)",
                background: isActive
                  ? "var(--sb-active-bg)"
                  : "transparent",
                textDecoration: "none",
                transition: "all 150ms ease",
                position: "relative",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--sb-soft)";
                  e.currentTarget.style.color = "var(--sb-ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sb-ink-2)";
                }
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: collapsed ? "50%" : 0,
                    top: collapsed ? "auto" : "50%",
                    bottom: collapsed ? 0 : "auto",
                    transform: collapsed
                      ? "translateX(-50%)"
                      : "translateY(-50%)",
                    width: collapsed ? 16 : 3,
                    height: collapsed ? 3 : 16,
                    borderRadius: "var(--radius-full)",
                    background: "var(--sb-active-ink)",
                    transition: "all 200ms ease",
                  }}
                />
              )}
              <span className="shrink-0" style={{ width: 20, height: 20 }}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="sidebar-item-enter whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div
        className="flex flex-col gap-1 shrink-0"
        style={{
          padding: collapsed ? "8px" : "8px 12px",
          borderTop: "1px solid var(--sb-line)",
        }}
      >
        {/* Settings link */}
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="tooltip"
              data-tooltip={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 0" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "var(--sb-active-ink)"
                  : "var(--sb-ink-2)",
                background: isActive
                  ? "var(--sb-active-bg)"
                  : "transparent",
                textDecoration: "none",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--sb-soft)";
                  e.currentTarget.style.color = "var(--sb-ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sb-ink-2)";
                }
              }}
            >
              <span className="shrink-0" style={{ width: 20, height: 20 }}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="sidebar-item-enter whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* User section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            marginTop: 4,
          }}
        >
          {/* Avatar */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: "linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            D
          </div>
          {!collapsed && (
            <div className="sidebar-item-enter flex flex-col overflow-hidden min-w-0">
              <span
                className="truncate"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--sb-ink)",
                  lineHeight: 1.3,
                }}
              >
                Developer
              </span>
              <span
                className="truncate flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  color: "var(--sb-ink-2)",
                  lineHeight: 1.3,
                }}
              >
                <span className="badge-accent badge" style={{ height: 16, fontSize: 10, padding: "0 6px" }}>
                  Pro
                </span>
                <span className="truncate">dev@example.com</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Expand button (collapsed state) ── */}
      {collapsed && (
        <button
          onClick={toggle}
          className="flex items-center justify-center shrink-0"
          style={{
            width: "100%",
            height: 44,
            color: "var(--sb-ink-2)",
            background: "transparent",
            border: "none",
            borderTop: "1px solid var(--sb-line)",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sb-soft)";
            e.currentTarget.style.color = "var(--sb-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--sb-ink-2)";
          }}
          aria-label="Expand sidebar"
        >
          <CollapseIcon collapsed={true} />
        </button>
      )}
    </aside>
  );
}
