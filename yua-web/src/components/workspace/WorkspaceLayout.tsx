"use client";

import { useState, type ReactNode } from "react";
import {
  Settings,
  Users,
  Link2,
  Globe,
  CheckCircle,
  KeyRound,
  Shield,
  ScrollText,
  AlertTriangle,
  Lock,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "./WorkspaceContext";
import TierGate from "./TierGate";
import type { SectionId, Tier } from "./types";

import GeneralSection from "./sections/GeneralSection";
import TeamSection from "./sections/TeamSection";
import InviteLinksSection from "./sections/InviteLinksSection";
import DomainSection from "./sections/DomainSection";
import ApprovalSection from "./sections/ApprovalSection";
import SSOSection from "./sections/SSOSection";
import PermissionsSection from "./sections/PermissionsSection";
import AuditSection from "./sections/AuditSection";
import DangerSection from "./sections/DangerSection";

/* =========================
   Tier ranking helper
========================= */
const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

/* =========================
   Sidebar item definition
========================= */
type SidebarItem = {
  id: SectionId;
  label: string;
  icon: ReactNode;
  requiredTier?: "business" | "enterprise";
};

type SidebarGroup = {
  items: SidebarItem[];
};

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    items: [
      { id: "general", label: "General", icon: <Settings size={18} /> },
      { id: "team", label: "Team", icon: <Users size={18} /> },
      { id: "invites", label: "Invite Links", icon: <Link2 size={18} /> },
      { id: "domains", label: "Domains", icon: <Globe size={18} />, requiredTier: "business" },
      { id: "approval", label: "Approval", icon: <CheckCircle size={18} />, requiredTier: "business" },
    ],
  },
  {
    items: [
      { id: "sso", label: "SSO", icon: <KeyRound size={18} />, requiredTier: "enterprise" },
      { id: "permissions", label: "Permissions", icon: <Shield size={18} />, requiredTier: "enterprise" },
    ],
  },
  {
    items: [
      { id: "audit", label: "Audit Log", icon: <ScrollText size={18} />, requiredTier: "business" },
      { id: "danger", label: "Danger Zone", icon: <AlertTriangle size={18} /> },
    ],
  },
];

/* =========================
   Section renderer
========================= */
const SECTION_COMPONENT: Record<SectionId, ReactNode> = {
  general: <GeneralSection />,
  team: <TeamSection />,
  invites: <InviteLinksSection />,
  domains: <DomainSection />,
  approval: <ApprovalSection />,
  sso: <SSOSection />,
  permissions: <PermissionsSection />,
  audit: <AuditSection />,
  danger: <DangerSection />,
};

/* =========================
   Tier badge
========================= */
function TierBadge({ tier }: { tier: "business" | "enterprise" }) {
  const colors =
    tier === "enterprise"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";

  return (
    <span
      className={`ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors}`}
    >
      <Lock size={10} />
      {tier === "enterprise" ? "Ent" : "Biz"}
    </span>
  );
}

/* =========================
   Main layout
========================= */
export default function WorkspaceLayout() {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = profile?.user?.name ?? "User";
  const workspaceName = profile?.workspace?.name ?? "Workspace";
  const currentTier: Tier = (profile?.workspace?.plan as Tier) ?? "free";

  // Find current item to check tier gating
  const currentItem = SIDEBAR_GROUPS.flatMap((g) => g.items).find(
    (i) => i.id === activeSection
  );

  function handleSelectSection(id: SectionId) {
    setActiveSection(id);
    setMobileMenuOpen(false);
  }

  /* Sidebar content (shared between desktop and mobile) */
  function renderSidebarItems() {
    return (
      <nav className="flex flex-col gap-0.5 px-3 py-3">
        {SIDEBAR_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="my-2 h-px bg-[var(--sb-line)]" />
            )}
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              const isLocked =
                item.requiredTier &&
                TIER_RANK[currentTier] < TIER_RANK[item.requiredTier];
              const isDanger = item.id === "danger";

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(item.id)}
                  className={[
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ease-out",
                    isActive
                      ? isDanger
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-[var(--sb-active-bg)] text-[var(--sb-active-ink)]"
                      : isDanger
                        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                        : "text-[var(--sb-ink)] hover:bg-[var(--sb-soft)]",
                    "active:scale-[0.98]",
                  ].join(" ")}
                >
                  <span
                    className={
                      isActive
                        ? isDanger
                          ? "text-red-600 dark:text-red-400"
                          : "text-[var(--sb-active-ink)]"
                        : isDanger
                          ? "text-red-500 dark:text-red-400"
                          : "text-[var(--sb-ink-2)] group-hover:text-[var(--sb-ink)]"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isLocked && item.requiredTier && (
                    <TierBadge tier={item.requiredTier} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <WorkspaceProvider>
      <div className="flex min-h-dvh flex-col bg-[var(--surface-main)]">
        {/* ── Welcome header ── */}
        <header className="border-b border-[var(--sb-line)] bg-[var(--surface-panel)] px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {displayName}님, {workspaceName}에 오신 것을 환영합니다
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              워크스페이스 설정을 관리합니다
            </p>
          </div>
        </header>

        {/* ── Mobile menu toggle ── */}
        <div className="flex items-center border-b border-[var(--sb-line)] bg-[var(--surface-panel)] px-4 py-2 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sb-ink)] hover:bg-[var(--sb-soft)] transition-all duration-150 active:scale-[0.97]"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span>Menu</span>
          </button>

          {/* Current section label on mobile */}
          {!mobileMenuOpen && currentItem && (
            <span className="ml-2 text-sm text-[var(--text-muted)]">
              / {currentItem.label}
            </span>
          )}
        </div>

        {/* ── Mobile sidebar (dropdown) ── */}
        {mobileMenuOpen && (
          <div className="border-b border-[var(--sb-line)] bg-[var(--sb-bg)] lg:hidden">
            {renderSidebarItems()}
          </div>
        )}

        {/* ── Body: sidebar + content ── */}
        <div className="mx-auto flex w-full max-w-6xl flex-1">
          {/* Desktop sidebar */}
          <aside className="hidden w-[240px] shrink-0 border-r border-[var(--sb-line)] bg-[var(--sb-bg)] lg:block">
            <div className="sticky top-0 pt-2">
              {renderSidebarItems()}
            </div>
          </aside>

          {/* Content area */}
          <main className="flex-1 min-w-0 p-6">
            {currentItem?.requiredTier &&
            TIER_RANK[currentTier] < TIER_RANK[currentItem.requiredTier] ? (
              <TierGate
                requiredTier={currentItem.requiredTier}
                currentTier={currentTier}
                featureName={currentItem.label}
              >
                {SECTION_COMPONENT[activeSection]}
              </TierGate>
            ) : (
              SECTION_COMPONENT[activeSection]
            )}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
