import { ArrowLeft, ArrowUpCircle, Building2, LogOut, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useSettingsUI } from "@/stores/useSettingsUI";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useChatStore } from "@/stores/useChatStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { disableAutoGuest } from "@/lib/sessionFlags";

type SidebarProfilePanelProps = {
  onBack: () => void;
};

export default function SidebarProfilePanel({
  onBack,
}: SidebarProfilePanelProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { openSettings } = useSettingsUI();
  const resetSidebar = useSidebarStore((s) => s.reset);
  const resetChat = useChatStore((s) => s.reset);
  const setActiveWorkspaceId = useWorkspaceStore(
    (s) => s.setActiveWorkspaceId
  );

  const name = profile?.user?.name ?? "My Account";
  const email = profile?.user?.email ?? "";

  const plan = profile?.workspace?.plan ?? "free";
  const wsRole = profile?.role ?? "member";
  const isBizPlus = plan === "business" || plan === "enterprise";
  const showWorkspaceAdmin =
    isBizPlus &&
    (wsRole === "owner" || wsRole === "admin" || wsRole === "member");

  const userInitial =
    name && name.length > 0 ? name.trim().charAt(0).toUpperCase() : "U";

  const handleLogout = async () => {
    disableAutoGuest();
    resetChat();
    resetSidebar();
    setActiveWorkspaceId(null);
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--sb-line)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[15px] font-semibold text-[var(--sb-ink)]"
        >
          <ArrowLeft size={16} />
          Account
        </button>

        <button
          onClick={onBack}
          className="text-[var(--sb-ink-2)] hover:text-[var(--sb-ink)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Account Info */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-800 text-white text-sm font-semibold flex items-center justify-center">
            {userInitial}
          </div>

          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--sb-ink)]">
              {name}
            </div>
            <div className="text-[13px] text-[var(--sb-ink-2)] truncate">
              {email}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--sb-line)]" />

      {/* Workspace + Upgrade */}
      <div className="px-2 py-2 space-y-1">
        {showWorkspaceAdmin && (
          <button
            onClick={() => {
              navigate("/workspace");
              onBack();
            }}
            className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
          >
            <Building2 size={16} className="text-[var(--sb-ink-2)]" />
            Workspace Settings
          </button>
        )}

        <button
          onClick={() => {
            navigate("/upgrade");
            onBack();
          }}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <ArrowUpCircle size={16} className="text-[var(--sb-ink-2)]" />
          Upgrade
        </button>
      </div>

      <div className="h-px bg-[var(--sb-line)]" />

      {/* Settings */}
      <div className="px-2 py-2">
        <button
          onClick={() => {
            openSettings();
            onBack();
          }}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <Settings size={16} className="text-[var(--sb-ink-2)]" />
          Settings
        </button>
      </div>

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-[var(--sb-line)] px-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] text-red-600 hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
